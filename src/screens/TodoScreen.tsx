import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { TaskRow } from "../components/TaskRow";
import { SuggestedTaskRow } from "../components/SuggestedTaskRow";
// import { DatePicker } from "../components/DatePicker"; // Commented out per requirements
import { TaskEditSheet } from "../components/TaskEditSheet";
import { TaskCreateSheet } from "../components/TaskCreateSheet";
import { colors } from "../theme/colors";
import { useTasks } from "../state/TasksContext";
import { useEntries } from "../state/EntriesContext";
import { mockSuggestedTasks, type SuggestedTask } from "../data/mockData";
import type { Task } from "../types/models";

export function TodoScreen(): React.ReactElement {
  const { tasks, toggleTask, createTask, updateTask } = useTasks();
  const { entries } = useEntries();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditSheetVisible, setIsEditSheetVisible] = useState(false);
  const [isCreateSheetVisible, setIsCreateSheetVisible] = useState(false);
  const [initialTaskTitle, setInitialTaskTitle] = useState<string>("");
  const [suggestedTasks, setSuggestedTasks] = useState<SuggestedTask[]>(mockSuggestedTasks);

  // Filter tasks by selected date
  const filteredTasks = useMemo(() => {
    const selectedDateStr = selectedDate.toDateString();
    return tasks.filter((task) => {
      const taskDateStr = task.dueDate.toDateString();
      return taskDateStr === selectedDateStr;
    });
  }, [tasks, selectedDate]);

  const handleTaskPress = (task: Task): void => {
    setEditingTask(task);
    setIsEditSheetVisible(true);
  };

  const handleSaveTask = (taskId: string, title: string): void => {
    updateTask(taskId, { title });
  };

  const handleCreateTask = (title: string): void => {
    createTask(title, selectedDate);
    // Remove suggested task if it was used
    if (initialTaskTitle && title === initialTaskTitle) {
      setSuggestedTasks((prev) => prev.filter((t) => t.title !== title));
    }
    setInitialTaskTitle("");
  };

  const handleSuggestedTaskPress = (task: SuggestedTask): void => {
    setInitialTaskTitle(task.title);
    setIsCreateSheetVisible(true);
  };

  const handleApproveSuggestedTask = (task: SuggestedTask): void => {
    createTask(task.title, selectedDate);
    setSuggestedTasks((prev) => prev.filter((t) => t.id !== task.id));
  };

  const handleCancelSuggestedTask = (task: SuggestedTask): void => {
    setSuggestedTasks((prev) => prev.filter((t) => t.id !== task.id));
  };

  const hasTasks = filteredTasks.length > 0;
  const hasSuggestedTasks = suggestedTasks.length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* DatePicker commented out per requirements */}
        {/* <DatePicker selectedDate={selectedDate} onDateChange={setSelectedDate} entries={entries} tasks={tasks} /> */}

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
          {/* Add Task Button - positioned at top of task list */}
          <View style={styles.addButtonContainer}>
            <TouchableOpacity
              onPress={() => setIsCreateSheetVisible(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.background,
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderRadius: 12,
                flex: 0.5,
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="add" size={28} color={colors.textSecondary} />
              <Text style={{ color: colors.textPrimary, fontWeight: "600", marginLeft: 8 }}>Add a task</Text>
            </TouchableOpacity>
          </View>

          {hasTasks ? (
            <View style={styles.tasksList}>
              {filteredTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={() => toggleTask(task.id)}
                  onPress={() => handleTaskPress(task)}
                />
              ))}
            </View>
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
              <Text style={{ color: colors.textMuted, fontSize: 16, textAlign: "center" }}>
                No tasks for this date.
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 16, textAlign: "center" }}>
                Tap the add a task button to create one.
              </Text>
            </View>
          )}

          {/* Suggested Tasks Section */}
          {hasSuggestedTasks && (
            <View style={styles.suggestedSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Suggested tasks</Text>
              </View>
              <View style={styles.suggestedTasksList}>
                {suggestedTasks.map((task) => (
                  <SuggestedTaskRow
                    key={task.id}
                    task={task}
                    onPress={() => handleSuggestedTaskPress(task)}
                    onApprove={() => handleApproveSuggestedTask(task)}
                    onCancel={() => handleCancelSuggestedTask(task)}
                  />
                ))}
              </View>
            </View>
          )}
        </ScrollView>
        {/* Task Edit Sheet */}
        <TaskEditSheet
          visible={isEditSheetVisible}
          task={editingTask}
          onClose={() => {
            setIsEditSheetVisible(false);
            setEditingTask(null);
          }}
          onSave={handleSaveTask}
        />

        {/* Task Create Sheet */}
        <TaskCreateSheet
          visible={isCreateSheetVisible}
          onClose={() => {
            setIsCreateSheetVisible(false);
            setInitialTaskTitle("");
          }}
          onCreate={handleCreateTask}
          selectedDate={selectedDate}
          initialTitle={initialTaskTitle}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  addButtonContainer: {
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: "flex-start",
  },
  addButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  tasksList: {
    paddingTop: 0,
  },
  suggestedSection: {
    marginTop: 32,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  suggestedTasksList: {
    paddingTop: 0,
  },
});
