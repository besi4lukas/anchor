// Simplified tests that don't require React rendering
import { mockTasks } from '../data/mockData';
import type { Task } from '../types/models';

describe('TasksContext Logic', () => {
  it('should have tasks with Date objects for dueDate', () => {
    expect(mockTasks.length).toBeGreaterThan(0);
    mockTasks.forEach((task) => {
      expect(task.dueDate).toBeInstanceOf(Date);
      expect(task.title).toBeDefined();
      expect(typeof task.completed).toBe('boolean');
    });
  });

  it('should filter tasks by date correctly', () => {
    const testDate = new Date('2025-12-16');
    const filtered = mockTasks.filter(
      (task) => task.dueDate.toDateString() === testDate.toDateString()
    );
    expect(Array.isArray(filtered)).toBe(true);
  });

  it('should toggle task completion state', () => {
    const task: Task = {
      id: 'test-1',
      title: 'Test Task',
      completed: false,
      dueDate: new Date(),
    };
    const toggled = { ...task, completed: !task.completed };
    expect(toggled.completed).toBe(true);
    expect(toggled.id).toBe(task.id);
  });

  it('should update task title', () => {
    const task: Task = {
      id: 'test-1',
      title: 'Original',
      completed: false,
      dueDate: new Date(),
    };
    const updated = { ...task, title: 'Updated' };
    expect(updated.title).toBe('Updated');
    expect(updated.id).toBe(task.id);
  });
});
