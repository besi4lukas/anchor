import React, { createContext, useContext, useMemo, useState } from "react";
import { mockEntries } from "../data/mockData";
import type { Entry } from "../types/models";

type EntriesContextValue = {
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;

  entries: Entry[];
  createEntry: (content: string) => void;
};

const EntriesContext = createContext<EntriesContextValue | null>(null);

export function EntriesProvider({ children }: { children: React.ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [entries, setEntries] = useState<Entry[]>(mockEntries);

  const createEntry = (content: string) => {
    const newEntry: Entry = {
      id: Date.now().toString(),
      content,
      createdAt: new Date(selectedDate),
    };
    setEntries((prev) => [newEntry, ...prev]);
  };

  const value = useMemo(
    () => ({ selectedDate, setSelectedDate, entries, createEntry }),
    [selectedDate, entries]
  );

  return <EntriesContext.Provider value={value}>{children}</EntriesContext.Provider>;
}

export function useEntries() {
  const ctx = useContext(EntriesContext);
  if (!ctx) throw new Error("useEntries must be used inside EntriesProvider");
  return ctx;
}
