import { Task } from '../types/models';

describe('Task Filtering', () => {
  const mockTasks: Task[] = [
    {
      id: '1',
      title: 'Task 1',
      completed: false,
      dueDate: new Date('2025-12-16'),
    },
    {
      id: '2',
      title: 'Task 2',
      completed: true,
      dueDate: new Date('2025-12-16'),
    },
    {
      id: '3',
      title: 'Task 3',
      completed: false,
      dueDate: new Date('2025-12-17'),
    },
  ];

  it('should filter tasks by selected date', () => {
    const selectedDate = new Date('2025-12-16');
    const filtered = mockTasks.filter(
      (task) => task.dueDate.toDateString() === selectedDate.toDateString()
    );
    expect(filtered.length).toBe(2);
    expect(filtered.every((t) => t.dueDate.toDateString() === selectedDate.toDateString())).toBe(true);
  });

  it('should return empty array when no tasks match date', () => {
    const selectedDate = new Date('2025-12-20');
    const filtered = mockTasks.filter(
      (task) => task.dueDate.toDateString() === selectedDate.toDateString()
    );
    expect(filtered.length).toBe(0);
  });

  it('should filter completed and incomplete tasks', () => {
    const completed = mockTasks.filter((t) => t.completed);
    const incomplete = mockTasks.filter((t) => !t.completed);
    expect(completed.length).toBe(1);
    expect(incomplete.length).toBe(2);
  });
});

