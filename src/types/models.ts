export interface Entry {
  id: string;
  content: string;
  createdAt: Date;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate: Date;
}

