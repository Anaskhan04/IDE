import type { CreateTaskInput, Task, TaskStatus, TaskSummary } from '../types/task';
import { computeTaskPriorityScore, isOverdueTask, validateTaskTitle } from '../utils/taskValidators';
import { loadTasksFromStorage, saveTasksToStorage } from './taskStorage';

export function listSortedTasks(): Task[] {
  const tasks = loadTasksFromStorage();
  return [...tasks].sort(
    (a, b) => computeTaskPriorityScore(b.priority) - computeTaskPriorityScore(a.priority)
  );
}

export function createTask(tasks: Task[], input: CreateTaskInput): Task[] {
  const validationError = validateTaskTitle(input.title);
  if (validationError) {
    throw new Error(validationError);
  }

  const nextTask: Task = {
    id: `task-${Date.now()}`,
    title: input.title.trim(),
    status: 'todo',
    priority: input.priority,
    dueDate: input.dueDate,
    assignee: input.assignee,
    createdAt: new Date().toISOString(),
  };

  const updated = [nextTask, ...tasks];
  saveTasksToStorage(updated);
  return updated;
}

export function toggleTaskStatus(tasks: Task[], taskId: string, nextStatus: TaskStatus): Task[] {
  const updated = tasks.map((task) =>
    task.id === taskId ? { ...task, status: nextStatus } : task
  );
  saveTasksToStorage(updated);
  return updated;
}

export function filterTasksByStatus(tasks: Task[], status: TaskStatus | 'all'): Task[] {
  if (status === 'all') return tasks;
  return tasks.filter((task) => task.status === status);
}

export function getTaskSummary(tasks: Task[]): TaskSummary {
  return tasks.reduce<TaskSummary>(
    (acc, task) => {
      acc.total += 1;
      if (task.status === 'todo') acc.todo += 1;
      if (task.status === 'in_progress') acc.inProgress += 1;
      if (task.status === 'done') acc.done += 1;
      if (isOverdueTask(task)) acc.overdue += 1;
      return acc;
    },
    { total: 0, todo: 0, inProgress: 0, done: 0, overdue: 0 }
  );
}
