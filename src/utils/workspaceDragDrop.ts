import type { ProjectFile } from '../types/ide';
import { isSensitiveFilePath } from './aiContextBuilder';

export const INTELLICODE_DRAG_MIME = 'application/x-intellicode-entity';

export interface WorkspaceDragPayload {
  kind: 'file' | 'symbol' | 'group';
  workspaceId: string;
  fileId?: string;
  filePath: string;
  nodeId?: string;
  symbolName?: string;
  line?: number;
  label: string;
}

export function getWorkspaceDragId(workspacePath: string | null | undefined): string {
  return (workspacePath || 'in-memory-workspace').replace(/\\/g, '/');
}

export function serializeDragPayload(
  dataTransfer: DataTransfer,
  payload: WorkspaceDragPayload,
): void {
  const json = JSON.stringify(payload);
  try {
    dataTransfer.setData(INTELLICODE_DRAG_MIME, json);
    dataTransfer.setData('text/plain', json);
    dataTransfer.effectAllowed = 'copyLink';
  } catch {
    // Ignore restricted synthetic DataTransfer in headless tests if any
  }
}

export function parseWorkspaceDragPayload(
  dataTransfer: DataTransfer,
  expectedWorkspaceId: string,
  files: ProjectFile[],
  options?: { rejectSensitive?: boolean },
): { valid: true; payload: WorkspaceDragPayload; file?: ProjectFile } | { valid: false; reason: string } {
  const raw =
    dataTransfer.getData(INTELLICODE_DRAG_MIME) ||
    dataTransfer.getData('text/plain');
  if (!raw || !raw.trim().startsWith('{')) {
    return { valid: false, reason: 'Unsupported drag item' };
  }

  let parsed: WorkspaceDragPayload;
  try {
    parsed = JSON.parse(raw) as WorkspaceDragPayload;
  } catch {
    return { valid: false, reason: 'Invalid drag payload' };
  }

  if (!parsed || !parsed.filePath || parsed.workspaceId !== expectedWorkspaceId) {
    return { valid: false, reason: 'Item belongs to a different workspace' };
  }

  if (parsed.kind === 'group') {
    return { valid: true, payload: parsed };
  }

  const norm = parsed.filePath.replace(/\\/g, '/');
  const matchedFile = files.find(
    (f) => (parsed.fileId && f.id === parsed.fileId) || f.path.replace(/\\/g, '/') === norm,
  );
  if (!matchedFile) {
    return { valid: false, reason: 'File no longer exists in workspace' };
  }

  if (options?.rejectSensitive && isSensitiveFilePath(matchedFile.path)) {
    return { valid: false, reason: 'Sensitive credential files cannot be attached to AI context' };
  }

  return { valid: true, payload: parsed, file: matchedFile };
}
