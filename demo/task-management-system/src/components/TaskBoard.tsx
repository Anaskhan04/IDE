import React, { useMemo, useState } from 'react';
import type { Task, TaskPriority, TaskStatus } from '../types/task';
import {
  createTask,
  filterTasksByStatus,
  getTaskSummary,
  listSortedTasks,
  toggleTaskStatus,
} from '../services/taskService';
import { TaskCard } from './TaskCard';

export const TaskBoard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(() => listSortedTasks());
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');

  const visibleTasks = useMemo(
    () => filterTasksByStatus(tasks, statusFilter),
    [tasks, statusFilter]
  );
  const summary = useMemo(() => getTaskSummary(tasks), [tasks]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setTasks((prev) => createTask(prev, { title, priority }));
    setTitle('');
  };

  const handleStatusChange = (taskId: string, nextStatus: TaskStatus) => {
    setTasks((prev) => toggleTaskStatus(prev, taskId, nextStatus));
  };

  return (
    <section>
      <header>
        <h1>Task Board</h1>
        <p>
          Total: {summary.total} | Done: {summary.done} | Overdue: {summary.overdue}
        </p>
      </header>
      <form onSubmit={handleCreate}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New task title" />
        <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button type="submit">Add Task</button>
      </form>
      <div>
        <button type="button" onClick={() => setStatusFilter('all')}>All</button>
        <button type="button" onClick={() => setStatusFilter('todo')}>To Do</button>
        <button type="button" onClick={() => setStatusFilter('done')}>Done</button>
      </div>
      <div>
        {visibleTasks.map((task) => (
          <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} />
        ))}
      </div>
    </section>
  );
};
