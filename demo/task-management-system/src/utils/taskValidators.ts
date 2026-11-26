import type { Task, TaskPriority } from '../types/task';

export function validateTaskTitle(title: string): string | null {
  const trimmed = title.trim();
  if (trimmed.length < 3) {
    return 'Task title must be at least 3 characters.';
  }
  if (trimmed.length > 120) {
    return 'Task title must not exceed 120 characters.';
  }
  return null;
}

export function isOverdueTask(task: Task, referenceDate = new Date()): boolean {
  if (!task.dueDate || task.status === 'done') {
    return false;
  }
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) {
    return false;
  }
  return due.getTime() < referenceDate.getTime();
}

export function computeTaskPriorityScore(priority: TaskPriority): number {
  switch (priority) {
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
    default:
      return 1;
  }
}
