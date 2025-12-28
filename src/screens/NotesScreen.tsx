/**
 * NotesScreen Component
 * 
 * Displays all notes sorted by most recent (newest first).
 * Newly edited notes appear at the top.
 * Includes search functionality to filter notes.
 */

import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { EntryCard } from "../components/EntryCard";
// import { DatePicker } from "../components/DatePicker"; // Commented out per requirements
import { colors } from "../theme/colors";
import type { Entry } from "../types/models";
import { useEntries } from "../state/EntriesContext";
import type { RootStackParamList } from "../navigation/RootNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function NotesScreen(): React.ReactElement {
  const navigation = useNavigation<NavigationProp>();
  const { entries, updateEntry } = useEntries(); // selectedDate no longer needed
  const [searchQuery, setSearchQuery] = useState("");

  const handleEntryPress = (entry: Entry): void => {
    navigation.navigate("NoteEdit", { entry });
  };

  const handleSaveEntry = (entryId: string, content: string): void => {
    updateEntry(entryId, content);
  };

  /**
   * Filter and sort entries
   * 
   * - Filters entries based on search query (searches in content)
   * - Sorts by most recent first (newest or most recently edited first)
   * - Uses updatedAt if available, otherwise createdAt
   */
  const filteredAndSortedEntries = useMemo(() => {
    let filtered = entries;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = entries.filter((entry) =>
        entry.content.toLowerCase().includes(query)
      );
    }

    // Sort by most recent first (updatedAt if available, otherwise createdAt)
    // Newly edited notes will have updatedAt and will appear first
    return filtered.sort((a, b) => {
      const aDate = (a as Entry & { updatedAt?: Date }).updatedAt || a.createdAt;
      const bDate = (b as Entry & { updatedAt?: Date }).updatedAt || b.createdAt;
      return bDate.getTime() - aDate.getTime();
    });
  }, [entries, searchQuery]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search notes..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={styles.clearButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* DatePicker commented out per requirements */}

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1, backgroundColor: colors.background }}
          contentContainerStyle={{
            flexGrow: 1,
            backgroundColor: colors.background,
            paddingHorizontal: 16,
            paddingBottom: 120,
          }}
        >
          {/* All Notes */}
          {filteredAndSortedEntries.length > 0 ? (
            <View style={styles.entriesContainer}>
              {filteredAndSortedEntries.map((entry, index) => (
                <View key={entry.id}>
                  <EntryCard
                    entry={entry}
                    onPress={() => handleEntryPress(entry)}
                    showDate={true}
                  />
                  {index < filteredAndSortedEntries.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {searchQuery.trim() ? "No notes found." : "No notes yet."}
              </Text>
              <Text style={styles.emptyText}>
                {searchQuery.trim() ? "Try a different search term." : "Tap the + button to add a note."}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    padding: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  entriesContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginLeft: 16,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: "center",
  },
});

