import React from 'react';
import type { Task, TaskStatus } from '../types/task';
import { isOverdueTask } from '../utils/taskValidators';

interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: string, nextStatus: TaskStatus) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onStatusChange }) => {
  const overdue = isOverdueTask(task);

  return (
    <article className="task-card" data-status={task.status} data-overdue={overdue}>
      <header>
        <h3>{task.title}</h3>
        <span>{task.priority}</span>
      </header>
      <div>
        {task.assignee && <span>Assignee: {task.assignee}</span>}
        {overdue && <span>Overdue</span>}
      </div>
      <footer>
        <button type="button" onClick={() => onStatusChange(task.id, 'in_progress')}>
          Start
        </button>
        <button type="button" onClick={() => onStatusChange(task.id, 'done')}>
          Complete
        </button>
      </footer>
    </article>
  );
};
