/**
 * Tasks Context
 * 
 * Global state management for tasks/goals using React Context API.
 * 
 * Design Pattern: Context API with Custom Hook
 * - Provides centralized state management for tasks
 * - Encapsulates task-related operations (create, update, toggle)
 * - Uses memoization to prevent unnecessary re-renders
 * - Type-safe with TypeScript
 * 
 * Usage:
 * ```tsx
 * <TasksProvider>
 *   <App />
 * </TasksProvider>
 * 
 * // In a component:
 * const { tasks, createTask, toggleTask, updateTask } = useTasks();
 * ```
 */

import React, { createContext, useContext, useMemo, useState } from "react";
import { mockTasks } from "../data/mockData";
import type { Task } from "../types/models";

/**
 * Context value type definition
 * 
 * Contains:
 * - tasks: Array of all tasks/goals
 * - toggleTask: Function to toggle task completion status
 * - createTask: Function to create a new task
 * - updateTask: Function to update task properties
 */
type TasksContextValue = {
  tasks: Task[];
  toggleTask: (taskId: string) => void;
  createTask: (title: string, dueDate?: Date) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
};

/**
 * Context instance
 * 
 * Created with null as default to enforce provider usage.
 * The null check in useTasks ensures proper error messaging.
 */
const TasksContext = createContext<TasksContextValue | null>(null);

/**
 * TasksProvider Component
 * 
 * Provides tasks state and operations to all child components.
 * 
 * State Management:
 * - tasks: Array of all tasks/goals (initialized with mock data)
 * 
 * Operations:
 * - toggleTask: Toggles the completed status of a task
 * - createTask: Creates a new task with title and optional due date
 * - updateTask: Updates any task properties (title, dueDate, completed, etc.)
 * 
 * Performance:
 * - Uses useMemo to memoize context value, preventing unnecessary re-renders
 * - Only re-creates value when tasks array changes
 */
export function TasksProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  // State: All tasks/goals (initialized with mock data)
  const [tasks, setTasks] = useState<Task[]>(mockTasks);

  /**
   * Toggle Task Completion
   * 
   * Toggles the completed status of a task by ID.
   * Used when user taps the checkbox on a task.
   * 
   * @param taskId - ID of the task to toggle
   */
  const toggleTask = (taskId: string): void => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
  };

  /**
   * Create Task
   * 
   * Creates a new task with:
   * - Unique ID based on timestamp
   * - Title from user input
   * - Completed status set to false
   * - Due date (defaults to today if not provided)
   * 
   * Adds new task to the beginning of the array (most recent first).
   * 
   * @param title - Task title/description
   * @param dueDate - Optional due date (defaults to today)
   */
  const createTask = (title: string, dueDate: Date = new Date()): void => {
    const newTask: Task = {
      id: Date.now().toString(),
      title,
      completed: false,
      dueDate,
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  /**
   * Update Task
   * 
   * Updates any properties of an existing task by ID.
   * Uses Partial<Task> to allow updating individual properties.
   * 
   * @param taskId - ID of the task to update
   * @param updates - Partial task object with properties to update
   */
  const updateTask = (taskId: string, updates: Partial<Task>): void => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
    );
  };

  /**
   * Memoized Context Value
   * 
   * Prevents unnecessary re-renders of consuming components.
   * Only re-creates when tasks array changes.
   */
  const value = useMemo(() => ({ tasks, toggleTask, createTask, updateTask }), [tasks]);

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

/**
 * useTasks Hook
 * 
 * Custom hook to access tasks context.
 * 
 * Benefits:
 * - Type-safe access to context
 * - Clear error message if used outside provider
 * - Consistent API across the app
 * 
 * @throws Error if used outside TasksProvider
 * @returns TasksContextValue with tasks state and operations
 */
export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext);
  if (!ctx) {
    throw new Error("useTasks must be used inside TasksProvider");
  }
  return ctx;
}
