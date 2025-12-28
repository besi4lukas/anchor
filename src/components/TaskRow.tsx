import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Task } from '../types/models';
import { colors } from '../theme/colors';

interface TaskRowProps {
  task: Task;
  onToggle: () => void;
  onPress: () => void;
}

export function TaskRow({ task, onToggle, onPress }: TaskRowProps): React.ReactElement {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={onToggle}
        style={styles.checkboxContainer}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <View
          style={[
            styles.checkbox,
            {
              borderColor: task.completed ? colors.primary : colors.textMuted,
              backgroundColor: task.completed ? colors.primary : 'transparent',
            },
          ]}
        >
          {task.completed && (
            <Text style={styles.checkmark}>✓</Text>
          )}
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onPress}
        style={styles.textContainer}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.title,
            {
              color: task.completed ? colors.textMuted : colors.textPrimary,
              textDecorationLine: task.completed ? 'line-through' : 'none',
            },
          ]}
        >
          {task.title}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '400',
  },
});
