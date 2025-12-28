import { Entry, Task } from '../types/models';

export const mockEntries: Entry[] = [
  {
    id: '1',
    content: 'Predictor MW 10\nToday I learned about React Native navigation. It\'s fascinating how the stack navigator works.',
    createdAt: new Date(),
  },
  {
    id: '2',
    content: 'AI - Artificial Intelligence\nHad a great conversation with a friend about AI and its implications for the future.',
    createdAt: new Date(Date.now() - 10 * 86400000), // 10 days ago
  },
  {
    id: '3',
    content: 'Yel Preview\nReflecting on the importance of journaling and self-reflection in personal growth.',
    createdAt: new Date(Date.now() - 15 * 86400000), // 15 days ago
  },
  {
    id: '4',
    content: 'Hot takes - Nigerian version (Game night)\nIs sending your kids to boarding school really the best option?',
    createdAt: new Date(Date.now() - 20 * 86400000), // 20 days ago
  },
  {
    id: '5',
    content: 'Weekend thoughts\nSpent time reflecting on the week and planning for the next one.',
    createdAt: new Date(Date.now() - 25 * 86400000), // 25 days ago
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

export interface SuggestedTask {
  id: string;
  title: string;
}

export const mockSuggestedTasks: SuggestedTask[] = [
  {
    id: 'st1',
    title: 'Schedule dentist appointment',
  },
  {
    id: 'st2',
    title: 'Update resume',
  },
  {
    id: 'st3',
    title: 'Organize workspace',
  },
];

