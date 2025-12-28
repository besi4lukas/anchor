/**
 * SuggestedTaskRow Component
 * 
 * Displays a suggested task.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface SuggestedTask {
  id: string;
  title: string;
}

interface SuggestedTaskRowProps {
  task: SuggestedTask;
  onPress: () => void;
  onApprove: () => void;
  onCancel: () => void;
}

export function SuggestedTaskRow({ task, onPress }: SuggestedTaskRowProps): React.ReactElement {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.container}
      activeOpacity={0.7}
    >
      <View style={styles.textContainer}>
        <Text style={styles.title}>
          {task.title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textMuted,
  },
});

