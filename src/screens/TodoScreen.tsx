import React, { useMemo, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TaskRow } from "../components/TaskRow";
import { DatePicker } from "../components/DatePicker";
import { colors } from "../theme/colors";
import { useTasks } from "../state/TasksContext";
import type { Task } from "../types/models";

export function TodoScreen(): React.ReactElement {
  const { tasks, toggleTask } = useTasks();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Filter tasks by selected date
  const filteredTasks = useMemo(() => {
    const selectedDateStr = selectedDate.toDateString();
    return tasks.filter((task) => {
      const taskDateStr = task.dueDate.toDateString();
      return taskDateStr === selectedDateStr;
    });
  }, [tasks, selectedDate]);

  // Group tasks by date (for future use if needed to show multiple dates)
  // For now, we just show tasks for the selected date
  const hasTasks = filteredTasks.length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <DatePicker selectedDate={selectedDate} onDateChange={setSelectedDate} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1, backgroundColor: colors.background }}
          contentContainerStyle={{
            flexGrow: 1,
            backgroundColor: colors.background,
            paddingHorizontal: 16,
            paddingBottom: 120, // room for tab bar + global beam
          }}
        >
          {hasTasks ? (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 6,
              }}
            >
              {filteredTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={() => toggleTask(task.id)}
                />
              ))}
            </View>
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
              <Text style={{ color: colors.textMuted, fontSize: 16, textAlign: "center" }}>
                No tasks for this date. Tap the beam to create one.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
