import type { ProjectFile } from '../types/ide';

/**
 * fsAccess.ts — File System Access API utilities
 *
 * Centralises:
 *  • capability detection (hasFsAccess)
 *  • writing a file via a FileSystemFileHandle (writeFileHandle)
 *  • reading a directory recursively with handles retained (readDirectoryRecursive)
 *  • creating a file on disk within a directory handle (createFileInDirectory)
 *  • download-as-file fallback for browsers without write access (downloadFile)
 */

/** True when the browser exposes the writable File System Access API. */
export const hasFsAccess: boolean =
  typeof window !== 'undefined' &&
  'showDirectoryPicker' in window &&
  typeof (window as any).showDirectoryPicker === 'function';

/**
 * Query or request permission on a directory handle.
 * If promptUser is false, queries the existing state without prompting.
 * If promptUser is true, calls requestPermission (must be called within a user gesture).
 */
export async function verifyDirectoryPermission(
  dirHandle: FileSystemDirectoryHandle,
  promptUser = false
): Promise<'granted' | 'prompt' | 'denied'> {
  try {
    if (typeof (dirHandle as any).queryPermission === 'function') {
      const state = await (dirHandle as any).queryPermission({ mode: 'readwrite' });
      if (state === 'granted') {
        return 'granted';
      }
      if (promptUser && typeof (dirHandle as any).requestPermission === 'function') {
        const reqState = await (dirHandle as any).requestPermission({ mode: 'readwrite' });
        return reqState;
      }
      return state;
    }
    return 'granted';
  } catch (err) {
    console.warn('verifyDirectoryPermission error:', err);
    return 'denied';
  }
}

/**
 * Write `content` to `handle` using the File System Access API.
 * Throws if the write fails (permissions denied, disk full, etc.).
 */
export async function writeFileHandle(
  handle: FileSystemFileHandle,
  content: string,
): Promise<void> {
  // createWritable() may throw if the user revoked permission mid-session.
  const writable = await handle.createWritable();
  try {
    await writable.write(content);
    await writable.close();
  } catch (err) {
    // Ensure the stream is closed even on error to avoid resource leaks.
    try {
      await writable.abort();
    } catch {
      // abort() itself can throw if already closed — ignore.
    }
    throw err;
  }
}

/**
 * Recursively read all files from a directory handle, retaining each file's
 * FileSystemFileHandle for live write-back capability.
 */
export async function readDirectoryRecursive(
  dirHandle: FileSystemDirectoryHandle,
  currentPath = ''
): Promise<ProjectFile[]> {
  const loadedFiles: ProjectFile[] = [];

  for await (const entry of (dirHandle as any).values()) {
    if (entry.kind === 'file') {
      if (!/\.(ts|tsx|js|jsx|json|c|h|cpp|py|md|html|css|yaml|yml|txt|toml|sql|env)$/i.test(entry.name)) {
        continue;
      }
      try {
        const file = await entry.getFile();
        const ext = entry.name.split('.').pop()?.toLowerCase() || 'typescript';
        const lang =
          ext === 'c' || ext === 'h' ? 'c'
            : ext === 'py' ? 'python'
            : ext === 'json' ? 'json'
            : ext === 'md' ? 'markdown'
            : ext === 'html' ? 'html'
            : ext === 'css' ? 'css'
            : ext === 'jsx' || ext === 'tsx' ? 'tsx'
            : ext === 'js' ? 'javascript'
            : 'typescript';

        const fileContent = await file.text();
        loadedFiles.push({
          id: `file-${Math.random().toString(36).substring(2, 9)}`,
          name: entry.name,
          path: currentPath ? `${currentPath}/${entry.name}` : entry.name,
          language: lang,
          content: fileContent,
          savedContent: fileContent,
          isDirty: false,
          fileHandle: entry, // retain live file handle for direct saving
        });
      } catch (err) {
        console.warn(`Could not read file ${entry.name}:`, err);
      }
    } else if (
      entry.kind === 'directory' &&
      !['node_modules', '.git', 'dist', '.vscode', '.idea', 'build', 'out'].includes(entry.name)
    ) {
      const subPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
      const subFiles = await readDirectoryRecursive(entry, subPath);
      loadedFiles.push(...subFiles);
    }
  }

  return loadedFiles;
}

/**
 * Resolves the parent directory handle and filename for a relative path from the root directory.
 * If create is true, intermediate missing directories will be created.
 */
export async function resolveParentDirectoryHandle(
  rootDir: FileSystemDirectoryHandle,
  filePath: string,
  create = false
): Promise<{ parentDir: FileSystemDirectoryHandle; fileName: string } | null> {
  const parts = filePath.split('/').filter(Boolean);
  if (parts.length === 0) return null;
  const fileName = parts[parts.length - 1];
  let currentDir = rootDir;
  for (let i = 0; i < parts.length - 1; i++) {
    currentDir = await currentDir.getDirectoryHandle(parts[i], { create });
  }
  return { parentDir: currentDir, fileName };
}

/**
 * Delete a file on disk from within a root directory handle.
 * Resolves nested directories and calls removeEntry.
 */
export async function deleteFileOnDisk(
  rootDir: FileSystemDirectoryHandle,
  filePath: string
): Promise<void> {
  const resolved = await resolveParentDirectoryHandle(rootDir, filePath, false);
  if (!resolved) {
    throw new Error(`Invalid file path: "${filePath}"`);
  }
  await resolved.parentDir.removeEntry(resolved.fileName);
}

/**
 * Rename a file on disk within the root directory handle.
 * Uses native FileSystemHandle.move() if available; otherwise uses a safe copy-and-delete fallback.
 * Checks for destination existence to prevent unintentional overwriting.
 */
export async function renameFileOnDisk(
  rootDir: FileSystemDirectoryHandle,
  oldPath: string,
  newName: string,
  fileHandle?: FileSystemFileHandle,
  confirmOverwrite?: (filename: string) => Promise<boolean> | boolean
): Promise<{ newHandle: FileSystemFileHandle; newPath: string }> {
  const cleanNewName = newName.trim();
  if (!cleanNewName) {
    throw new Error('New file name cannot be empty');
  }

  const resolved = await resolveParentDirectoryHandle(rootDir, oldPath, false);
  if (!resolved) {
    throw new Error(`Invalid file path: "${oldPath}"`);
  }
  const { parentDir, fileName: oldName } = resolved;

  const pathParts = oldPath.split('/').filter(Boolean);
  pathParts[pathParts.length - 1] = cleanNewName;
  const newPath = pathParts.join('/');

  if (cleanNewName === oldName) {
    const handle = fileHandle || (await parentDir.getFileHandle(oldName));
    return { newHandle: handle, newPath: oldPath };
  }

  // Check if target file already exists in the same directory
  let targetExists = false;
  try {
    await parentDir.getFileHandle(cleanNewName, { create: false });
    targetExists = true;
  } catch {
    // Does not exist, safe to proceed
  }

  if (targetExists) {
    const confirmed = confirmOverwrite
      ? await confirmOverwrite(cleanNewName)
      : window.confirm(`File "${cleanNewName}" already exists. Do you want to overwrite it?`);
    if (!confirmed) {
      throw new Error(`Rename cancelled: "${cleanNewName}" already exists.`);
    }
  }

  const handleToMove = fileHandle || (await parentDir.getFileHandle(oldName));

  // Method 1: Try native FileSystemHandle.move() if supported
  if (typeof (handleToMove as any).move === 'function') {
    try {
      await (handleToMove as any).move(cleanNewName);
      return { newHandle: handleToMove, newPath };
    } catch (moveErr) {
      console.warn('Native move() failed or not supported by browser, falling back to copy+delete:', moveErr);
    }
  }

  // Method 2: Safe copy-and-delete fallback
  const sourceFile = await handleToMove.getFile();
  const content = await sourceFile.text();
  const newHandle = await parentDir.getFileHandle(cleanNewName, { create: true });
  await writeFileHandle(newHandle, content);
  await parentDir.removeEntry(oldName);

  return { newHandle, newPath };
}

/**
 * Create a new file on disk within a directory handle, resolving nested directories,
 * and return the created file handle and normalized path.
 */
export async function createFileOnDisk(
  rootDir: FileSystemDirectoryHandle,
  filePath: string,
  initialContent = ''
): Promise<{ fileHandle: FileSystemFileHandle; normalizedPath: string }> {
  const parts = filePath.split('/').filter(Boolean);
  if (parts.length === 0) {
    throw new Error('File path cannot be empty');
  }
  const fileName = parts[parts.length - 1];
  let currentDir = rootDir;
  for (let i = 0; i < parts.length - 1; i++) {
    currentDir = await currentDir.getDirectoryHandle(parts[i], { create: true });
  }
  const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
  await writeFileHandle(fileHandle, initialContent);
  return { fileHandle, normalizedPath: parts.join('/') };
}

/**
 * Create a new file on disk within a directory handle, resolving any nested directories.
 */
export async function createFileInDirectory(
  rootDir: FileSystemDirectoryHandle,
  filePath: string,
  initialContent = ''
): Promise<FileSystemFileHandle | null> {
  try {
    const { fileHandle } = await createFileOnDisk(rootDir, filePath, initialContent);
    return fileHandle;
  } catch (err) {
    console.warn('Could not create file on disk:', err);
    return null;
  }
}

/**
 * Trigger a browser download of `content` as a file named `filename`.
 * Used as an honest fallback when direct disk write is unavailable.
 */
export function downloadFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Revoke after a tick so the download has time to start.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
