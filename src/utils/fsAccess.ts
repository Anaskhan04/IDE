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
 * Create a new file on disk within a directory handle, resolving any nested directories.
 */
export async function createFileInDirectory(
  rootDir: FileSystemDirectoryHandle,
  filePath: string,
  initialContent = ''
): Promise<FileSystemFileHandle | null> {
  try {
    const parts = filePath.split('/').filter(Boolean);
    if (parts.length === 0) return null;
    let currentDir = rootDir;
    for (let i = 0; i < parts.length - 1; i++) {
      currentDir = await currentDir.getDirectoryHandle(parts[i], { create: true });
    }
    const fileHandle = await currentDir.getFileHandle(parts[parts.length - 1], { create: true });
    await writeFileHandle(fileHandle, initialContent);
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
