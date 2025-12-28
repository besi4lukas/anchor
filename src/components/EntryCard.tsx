import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Entry } from '../types/models';
import { colors } from '../theme/colors';

interface EntryCardProps {
  entry: Entry;
  onPress: () => void;
  showDate?: boolean;
}

export function EntryCard({ entry, onPress, showDate = false }: EntryCardProps): React.ReactElement {
  const formatDate = (date: Date): string => {
    const months = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear().toString().slice(-2);
    return `${month}/${day}/${year}`;
  };

  const formatDayName = (date: Date): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  // Extract title (first line or first part) and subtitle
  const contentLines = entry.content.split('\n').filter(line => line.trim());
  const title = contentLines[0] || entry.content.substring(0, 40);
  const hasMultipleLines = contentLines.length > 1;
  const subtitle = hasMultipleLines 
    ? contentLines.slice(1).join(' ').substring(0, 60)
    : entry.content.length > 40 
      ? entry.content.substring(40, 100)
      : '';

  const dateStr = formatDate(entry.createdAt);
  const dayName = formatDayName(entry.createdAt);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.container}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {showDate ? dateStr : dayName}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 0,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textMuted,
  },
});
