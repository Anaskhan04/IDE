import assert from 'node:assert/strict';
import { createTask, getTaskSummary, toggleTaskStatus } from '../services/taskService';
import { validateTaskTitle } from '../utils/taskValidators';

export function runTaskServiceSmokeChecks() {
  assert.equal(validateTaskTitle('ab'), 'Task title must be at least 3 characters.');
  assert.equal(validateTaskTitle('Ship Semester 7 Demo'), null);

  const created = createTask([], { title: 'Prepare Knowledge Graph Demo', priority: 'high' });
  assert.equal(created.length, 1);

  const completed = toggleTaskStatus(created, created[0].id, 'done');
  const summary = getTaskSummary(completed);
  assert.equal(summary.total, 1);
  assert.equal(summary.done, 1);
}
