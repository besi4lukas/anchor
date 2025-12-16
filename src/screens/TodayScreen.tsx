import React, { useMemo } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { EntryCard } from "../components/EntryCard";
import { DatePicker } from "../components/DatePicker";
import { RootStackParamList } from "../navigation/RootNavigator";
import { colors } from "../theme/colors";
import type { Entry } from "../types/models";
import { useEntries } from "../state/EntriesContext";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function TodayScreen(): React.ReactElement {
  const navigation = useNavigation<NavigationProp>();
  const { selectedDate, setSelectedDate, entries } = useEntries();

  const handleEntryPress = (entry: Entry): void => {
    navigation.navigate("EntryDetail", { entry });
  };

  const filteredEntries = useMemo(() => {
    const selectedDateStr = selectedDate.toDateString();
    return entries.filter((entry) => entry.createdAt.toDateString() === selectedDateStr);
  }, [entries, selectedDate]);

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
            paddingBottom: 120, // leave room for tab bar + beam
          }}
        >
          {filteredEntries.length === 0 ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
              <Text style={{ fontSize: 16, color: colors.textMuted, textAlign: "center" }}>
                No entries for this date. Tap the beam to capture a thought.
              </Text>
            </View>
          ) : (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 6,
              }}
            >
              {filteredEntries.map((entry) => (
                <EntryCard key={entry.id} entry={entry} onPress={() => handleEntryPress(entry)} />
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
