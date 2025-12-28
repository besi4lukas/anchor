/**
 * Entries Context
 * 
 * Global state management for journal entries using React Context API.
 * 
 * Design Pattern: Context API with Custom Hook
 * - Provides centralized state management for entries
 * - Encapsulates entry-related operations (create, update)
 * - Uses memoization to prevent unnecessary re-renders
 * - Type-safe with TypeScript
 * 
 * Usage:
 * ```tsx
 * <EntriesProvider>
 *   <App />
 * </EntriesProvider>
 * 
 * // In a component:
 * const { entries, createEntry, updateEntry } = useEntries();
 * ```
 */

import React, { createContext, useContext, useMemo, useState } from "react";
import { mockEntries } from "../data/mockData";
import type { Entry } from "../types/models";

/**
 * Context value type definition
 * 
 * Contains:
 * - selectedDate: Currently selected date for filtering/creating entries
 * - setSelectedDate: Function to update selected date
 * - entries: Array of all journal entries
 * - createEntry: Function to create a new entry
 * - updateEntry: Function to update an existing entry's content
 */
type EntriesContextValue = {
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  entries: Entry[];
  createEntry: (content: string) => void;
  updateEntry: (entryId: string, content: string) => void;
};

/**
 * Context instance
 * 
 * Created with null as default to enforce provider usage.
 * The null check in useEntries ensures proper error messaging.
 */
const EntriesContext = createContext<EntriesContextValue | null>(null);

/**
 * EntriesProvider Component
 * 
 * Provides entries state and operations to all child components.
 * 
 * State Management:
 * - selectedDate: Tracks the currently selected date (defaults to today)
 * - entries: Array of all journal entries (initialized with mock data)
 * 
 * Operations:
 * - createEntry: Creates a new entry with the selected date
 * - updateEntry: Updates an existing entry's content by ID
 * 
 * Performance:
 * - Uses useMemo to memoize context value, preventing unnecessary re-renders
 * - Only re-creates value when selectedDate or entries change
 */
export function EntriesProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  // State: Selected date for filtering and creating entries
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  
  // State: All journal entries (initialized with mock data)
  const [entries, setEntries] = useState<Entry[]>(mockEntries);

  /**
   * Create Entry
   * 
   * Creates a new journal entry with:
   * - Unique ID based on timestamp
   * - Content from user input
   * - Creation date set to current date/time
   * 
   * Adds new entry to the beginning of the array (most recent first).
   */
  const createEntry = (content: string): void => {
    const newEntry: Entry = {
      id: Date.now().toString(),
      content,
      createdAt: new Date(), // Use current date/time for new entries
    };
    setEntries((prev) => [newEntry, ...prev]);
  };

  /**
   * Update Entry
   * 
   * Updates an existing entry's content by ID.
   * Preserves all other entry properties (id, createdAt).
   * Adds updatedAt timestamp to track when entry was last modified.
   * 
   * @param entryId - ID of the entry to update
   * @param content - New content for the entry
   */
  const updateEntry = (entryId: string, content: string): void => {
    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.id === entryId) {
          return { ...entry, content, updatedAt: new Date() } as Entry & { updatedAt: Date };
        }
        return entry;
      })
    );
  };

  /**
   * Memoized Context Value
   * 
   * Prevents unnecessary re-renders of consuming components.
   * Only re-creates when selectedDate or entries change.
   */
  const value = useMemo(
    () => ({ selectedDate, setSelectedDate, entries, createEntry, updateEntry }),
    [selectedDate, entries]
  );

  return <EntriesContext.Provider value={value}>{children}</EntriesContext.Provider>;
}

/**
 * useEntries Hook
 * 
 * Custom hook to access entries context.
 * 
 * Benefits:
 * - Type-safe access to context
 * - Clear error message if used outside provider
 * - Consistent API across the app
 * 
 * @throws Error if used outside EntriesProvider
 * @returns EntriesContextValue with entries state and operations
 */
export function useEntries(): EntriesContextValue {
  const ctx = useContext(EntriesContext);
  if (!ctx) {
    throw new Error("useEntries must be used inside EntriesProvider");
  }
  return ctx;
}
