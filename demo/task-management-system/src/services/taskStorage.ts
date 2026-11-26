import type { Task } from '../types/task';

const STORAGE_KEY = 'intellicode_demo_tasks_v1';

export function loadTasksFromStorage(): Task[] {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Task[]) : [];
  } catch {
    return [];
  }
}

export function saveTasksToStorage(tasks: Task[]): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // Ignore storage quota errors in demo fixture
  }
}
