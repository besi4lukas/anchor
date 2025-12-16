import React, { createContext, useContext, useMemo, useState } from "react";
import { mockTasks } from "../data/mockData";
import type { Task } from "../types/models";

type TasksContextValue = {
  tasks: Task[];
  toggleTask: (taskId: string) => void;
  createTask: (title: string, dueDate?: Date) => void;
};

const TasksContext = createContext<TasksContextValue | null>(null);

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(mockTasks);

  const toggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
  };

  const createTask = (title: string, dueDate: Date = new Date()) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title,
      completed: false,
      dueDate,
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  const value = useMemo(() => ({ tasks, toggleTask, createTask }), [tasks]);

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks must be used inside TasksProvider");
  return ctx;
}
