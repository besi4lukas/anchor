/**
 * DatePicker Component
 * 
 * A comprehensive date picker with day-by-day navigation and a weekly calendar widget.
 * Allows users to navigate between dates and see which dates have content (entries/tasks).
 * 
 * Design Patterns:
 * - Controlled component (selectedDate prop)
 * - Memoization for performance (useMemo for formatted dates)
 * - Scroll-based navigation for smooth week transitions
 * 
 * Features:
 * - Day-by-day navigation with chevron buttons
 * - Weekly calendar widget with horizontal scrolling
 * - Visual indicators for dates with content
 * - "Go to Today" button when not on today's date
 */

import React, { useMemo, useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { DATE_PICKER } from "../constants/ui";
import { formatDateLong, getWeekStart, getWeekDays, isToday, getNextDay, getPreviousDay } from "../utils/dateUtils";
import type { Entry } from "../types/models";
import type { Task } from "../types/models";

interface DatePickerProps {
  /** Currently selected date */
  selectedDate: Date;
  /** Callback when date changes */
  onDateChange: (date: Date) => void;
  /** Optional entries to show content indicators */
  entries?: Entry[];
  /** Optional tasks to show content indicators */
  tasks?: Task[];
}

/**
 * Date picker with day navigation and weekly calendar widget
 */
export function DatePicker({
  selectedDate,
  onDateChange,
  entries = [],
  tasks = [],
}: DatePickerProps): React.ReactElement {
  // Format the selected date for display
  // Memoized to avoid recalculating on every render
  const { weekday } = useMemo(
    () => formatDateLong(selectedDate),
    [selectedDate]
  );

  // Check if selected date is today
  const isSelectedToday = isToday(selectedDate);

  /**
   * Week Widget Visibility State
   * 
   * Controls whether the weekly calendar widget is shown.
   * Hidden by default, shown when user clicks on the day text.
   */
  const [showWeekWidget, setShowWeekWidget] = useState<boolean>(false);

  /**
   * Navigation Handlers
   * 
   * These functions handle day-by-day navigation and week scrolling.
   * They create new Date objects to avoid mutating the original selectedDate.
   */
  const goToPreviousDay = (): void => {
    onDateChange(getPreviousDay(selectedDate));
  };

  const goToNextDay = (): void => {
    onDateChange(getNextDay(selectedDate));
  };

  const goToToday = (): void => onDateChange(new Date());

  /**
   * Week Navigation State
   * 
   * Tracks the current week start (Sunday) for the weekly calendar widget.
   * Uses horizontal scrolling with 3 pages (previous, current, next week) for smooth navigation.
   */
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() =>
    getWeekStart(selectedDate)
  );
  const scrollViewRef = useRef<ScrollView>(null);
  const screenWidth = Dimensions.get("window").width;

  /**
   * Initialize scroll position to center (current week)
   * 
   * The ScrollView renders 3 weeks: [previous, current, next]
   * We start at index 1 (current week) for smooth scrolling in both directions.
   * Only runs when the week widget becomes visible.
   */
  useEffect(() => {
    if (!showWeekWidget) return;
    
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollTo({ x: screenWidth, animated: false });
    }, 100);
    return () => clearTimeout(timer);
  }, [showWeekWidget, screenWidth]);

  /**
   * Update week start when selected date changes
   * 
   * If the selected date moves to a different week, update the week start
   * and reset scroll position to center.
   */
  useEffect(() => {
    const weekStart = getWeekStart(selectedDate);
    if (weekStart.toDateString() !== currentWeekStart.toDateString()) {
      setCurrentWeekStart(weekStart);
      // Reset scroll position to center when week changes
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: screenWidth, animated: false });
      }, 50);
    }
  }, [selectedDate, currentWeekStart, screenWidth]);

  /**
   * Content Indicator Helper
   * 
   * Checks if a given date has any entries or tasks.
   * Used to show visual indicators (dots) on dates with content.
   */
  const hasContent = (date: Date): boolean => {
    const dateStr = date.toDateString();
    const hasEntries = entries.some((e) => e.createdAt.toDateString() === dateStr);
    const hasTasks = tasks.some((t) => t.dueDate.toDateString() === dateStr);
    return hasEntries || hasTasks;
  };

  // Handle week scroll
  const handleWeekScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const weekIndex = Math.round(offsetX / screenWidth) - 1; // -1 because we start at index 1 (current week)
    
    if (weekIndex === 0) return; // Current week, no change needed
    
    // Calculate the new week start based on scroll position
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + (weekIndex * 7));
    
    if (newWeekStart.toDateString() !== currentWeekStart.toDateString()) {
      setCurrentWeekStart(newWeekStart);
      // Select first day of the new week (Sunday)
      onDateChange(new Date(newWeekStart));
      // Reset scroll position to center (current week)
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: screenWidth, animated: false });
      }, 100);
    }
  };

  // Navigate to previous week (not used directly, but available if needed)
  const goToPreviousWeek = (): void => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newWeekStart);
    onDateChange(new Date(newWeekStart));
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ x: screenWidth, animated: false });
    }, 100);
  };

  // Navigate to next week (not used directly, but available if needed)
  const goToNextWeek = (): void => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(newWeekStart);
    onDateChange(new Date(newWeekStart));
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ x: screenWidth, animated: false });
    }, 100);
  };

  // Handle day selection
  const handleDaySelect = (date: Date): void => {
    onDateChange(date);
  };

  /**
   * Toggle Week Widget
   * 
   * Shows/hides the weekly calendar widget when user clicks on the day text.
   */
  const handleDayTextPress = (): void => {
    setShowWeekWidget((prev) => !prev);
  };

  // Get current week days
  const weekDays = getWeekDays(currentWeekStart);
  const dayAbbrs = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.row}>
        {/* Left */}
        <View style={styles.side}>
          <TouchableOpacity
            onPress={goToPreviousDay}
            style={styles.iconBtn}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={28} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Center */}
        <View style={styles.center}>
          <TouchableOpacity
            onPress={handleDayTextPress}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text
              style={[
                styles.weekday,
                {
                  color: colors.textPrimary,
                  fontFamily: "DMSerifDisplay_400Regular", // optional later
                },
              ]}
              numberOfLines={1}
            >
              {weekday}
            </Text>
          </TouchableOpacity>

          {/* Show "Go to Today" button when not on today's date */}
          {!isSelectedToday && (
            <TouchableOpacity
              onPress={goToToday}
              activeOpacity={0.9}
              style={[
                styles.todayPill,
                {
                  backgroundColor: colors.primary,
                  borderColor: colors.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.todayText,
                  {
                    color: colors.textPrimary,
                    // fontFamily: "Inter_600SemiBold",
                  },
                ]}
              >
                Go to Today
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Right */}
        <View style={styles.side}>
          <TouchableOpacity
            onPress={goToNextDay}
            style={styles.iconBtn}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={28} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Weekly Calendar Widget - Only shown when user clicks on day */}
      {showWeekWidget && (
        <View style={styles.weekContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleWeekScroll}
          contentContainerStyle={[styles.weekScrollContent, { width: screenWidth * 3 }]}
          scrollEventThrottle={16}
          decelerationRate="fast"
          snapToInterval={screenWidth}
          snapToAlignment="center"
        >
          {/* Previous Week - rendered for smooth scrolling */}
          <View style={[styles.weekView, { width: screenWidth }]}>
            {getWeekDays(
              new Date(currentWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000)
            ).map((date, idx) => {
              const isSelected = date.toDateString() === selectedDate.toDateString();
              return (
                <View key={`prev-${idx}`} style={styles.dayColumn}>
                  <Text style={[styles.dayLabel, { color: colors.textPrimary }]}>
                    {dayAbbrs[date.getDay()]}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleDaySelect(date)}
                    style={[
                      styles.dateButton,
                      isSelected && { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dateNumber,
                        { color: isSelected ? colors.textPrimary : colors.textPrimary },
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  </TouchableOpacity>
                  {hasContent(date) && (
                    <View style={[styles.dot, { backgroundColor: colors.textMuted }]} />
                  )}
                </View>
              );
            })}
          </View>

          {/* Current Week */}
          <View style={[styles.weekView, { width: screenWidth }]}>
            {weekDays.map((date, idx) => {
              const isSelected = date.toDateString() === selectedDate.toDateString();
              return (
                <View key={`curr-${idx}`} style={styles.dayColumn}>
                  <Text style={[styles.dayLabel, { color: colors.textPrimary }]}>
                    {dayAbbrs[date.getDay()]}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleDaySelect(date)}
                    style={[
                      styles.dateButton,
                      isSelected && { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dateNumber,
                        { color: isSelected ? colors.textPrimary : colors.textPrimary },
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  </TouchableOpacity>
                  {hasContent(date) && (
                    <View style={[styles.dot, { backgroundColor: colors.textMuted }]} />
                  )}
                </View>
              );
            })}
          </View>

          {/* Next Week */}
          <View style={[styles.weekView, { width: screenWidth }]}>
            {getWeekDays(new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000)).map((date, idx) => {
              const isSelected = date.toDateString() === selectedDate.toDateString();
              return (
                <View key={`next-${idx}`} style={styles.dayColumn}>
                  <Text style={[styles.dayLabel, { color: colors.textPrimary }]}>
                    {dayAbbrs[date.getDay()]}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleDaySelect(date)}
                    style={[
                      styles.dateButton,
                      isSelected && { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dateNumber,
                        { color: isSelected ? colors.textPrimary : colors.textPrimary },
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  </TouchableOpacity>
                  {hasContent(date) && (
                    <View style={[styles.dot, { backgroundColor: colors.textMuted }]} />
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingTop: 24,
    paddingBottom: 16,
  },
  row: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  side: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  weekday: {
    fontSize: 46,
    lineHeight: 50,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  todayPill: {
    marginTop: 18,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  todayText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.2,
    opacity: 0.9,
  },
  weekContainer: {
    marginTop: 20,
    paddingHorizontal: 8,
  },
  weekScrollContent: {
    alignItems: "center",
  },
  weekView: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  dayColumn: {
    width: DATE_PICKER.DAY_COLUMN_WIDTH, // 100% / 7 days = ~14.28% each
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: "500",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  dateButton: {
    width: DATE_PICKER.DATE_BUTTON_SIZE,
    height: DATE_PICKER.DATE_BUTTON_SIZE,
    borderRadius: DATE_PICKER.DATE_BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  dateNumber: {
    fontSize: 14,
    fontWeight: "600",
  },
  dot: {
    width: DATE_PICKER.DOT_SIZE,
    height: DATE_PICKER.DOT_SIZE,
    borderRadius: DATE_PICKER.DOT_SIZE / 2,
    marginTop: 2,
  },
});
