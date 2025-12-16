import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/RootNavigator';
import { colors } from '../theme/colors';

type EntryDetailScreenRouteProp = RouteProp<RootStackParamList, 'EntryDetail'>;

interface EntryDetailScreenProps {
  route: EntryDetailScreenRouteProp;
}

export function EntryDetailScreen({ route }: EntryDetailScreenProps): React.ReactElement {
  const { entry } = route.params;

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView className="flex-1 px-4 pt-4">
        <Text
          className="text-sm mb-4"
          style={{ color: colors.textMuted }}
        >
          {formatDate(entry.createdAt)}
        </Text>
        <Text
          className="text-lg leading-7"
          style={{ color: colors.textPrimary }}
        >
          {entry.content}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

