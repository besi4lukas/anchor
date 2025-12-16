import { Entry, Task } from '../types/models';

export const mockEntries: Entry[] = [
  {
    id: '1',
    content: 'Today I learned about React Native navigation. It\'s fascinating how the stack navigator works.',
    createdAt: new Date(),
  },
  {
    id: '2',
    content: 'Had a great conversation with a friend about AI and its implications for the future.',
    createdAt: new Date(Date.now() - 86400000), // Yesterday
  },
  {
    id: '3',
    content: 'Reflecting on the importance of journaling and self-reflection in personal growth.',
    createdAt: new Date(Date.now() - 172800000), // 2 days ago
  },
];

export const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Review project proposal',
    completed: false,
    dueDate: new Date(),
  },
  {
    id: '2',
    title: 'Call mom',
    completed: true,
    dueDate: new Date(),
  },
  {
    id: '3',
    title: 'Prepare presentation slides',
    completed: false,
    dueDate: new Date(Date.now() + 86400000), // Tomorrow
  },
  {
    id: '4',
    title: 'Read new book chapter',
    completed: false,
    dueDate: new Date(Date.now() + 86400000), // Tomorrow
  },
  {
    id: '5',
    title: 'Plan weekend trip',
    completed: false,
    dueDate: new Date(Date.now() + 172800000), // 2 days from now
  },
];

