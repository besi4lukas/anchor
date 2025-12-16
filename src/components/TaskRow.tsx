import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Task } from '../types/models';
import { colors } from '../theme/colors';

interface TaskRowProps {
  task: Task;
  onToggle: () => void;
}

export function TaskRow({ task, onToggle }: TaskRowProps): React.ReactElement {
  return (
    <TouchableOpacity
      onPress={onToggle}
      className="flex-row items-center mb-3 rounded-lg p-4"
      style={{ backgroundColor: colors.surface }}
    >
      <View
        className="w-6 h-6 rounded border-2 mr-3 items-center justify-center"
        style={{
          borderColor: task.completed ? colors.primary : colors.textMuted,
          backgroundColor: task.completed ? colors.primary : 'transparent',
        }}
      >
        {task.completed && (
          <Text className="text-white text-xs">✓</Text>
        )}
      </View>
      <Text
        className="flex-1 text-base"
        style={{
          color: task.completed ? colors.textMuted : colors.textPrimary,
          textDecorationLine: task.completed ? 'line-through' : 'none',
        }}
      >
        {task.title}
      </Text>
    </TouchableOpacity>
  );
}

