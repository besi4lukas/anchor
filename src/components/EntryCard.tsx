import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Entry } from '../types/models';
import { colors } from '../theme/colors';

interface EntryCardProps {
  entry: Entry;
  onPress: () => void;
}

export function EntryCard({ entry, onPress }: EntryCardProps): React.ReactElement {
  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      className="mb-3 rounded-lg p-4"
      style={{ backgroundColor: colors.surface }}
    >
      <Text
        className="text-sm mb-2"
        style={{ color: colors.textMuted }}
      >
        {formatDate(entry.createdAt)}
      </Text>
      <Text
        className="text-base leading-6"
        style={{ color: colors.textPrimary }}
        numberOfLines={3}
      >
        {entry.content}
      </Text>
    </TouchableOpacity>
  );
}

