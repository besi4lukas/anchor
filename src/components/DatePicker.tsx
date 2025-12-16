import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

interface DatePickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function DatePicker({ selectedDate, onDateChange }: DatePickerProps): React.ReactElement {
  const { weekday, dateStr } = useMemo(() => {
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    const getOrdinal = (n: number): string => {
      if (n > 3 && n < 21) return `${n}th`;
      switch (n % 10) {
        case 1: return `${n}st`;
        case 2: return `${n}nd`;
        case 3: return `${n}rd`;
        default: return `${n}th`;
      }
    };

    const weekday = weekdays[selectedDate.getDay()];
    const month = months[selectedDate.getMonth()];
    const day = selectedDate.getDate();
    const year = selectedDate.getFullYear();

    return { weekday, dateStr: `${month} ${getOrdinal(day)}, ${year}` };
  }, [selectedDate]);

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  const goToPreviousDay = (): void => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    onDateChange(d);
  };

  const goToNextDay = (): void => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    onDateChange(d);
  };

  const goToToday = (): void => onDateChange(new Date());

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

          <Text
            style={[
              styles.date,
              {
                color: colors.textSecondary,
                fontFamily: "Inter_400Regular",
              },
            ]}
            numberOfLines={1}
          >
            {dateStr}
          </Text>

          {!isToday && (
            <TouchableOpacity
              onPress={goToToday}
              activeOpacity={0.9}
              style={[
                styles.todayPill,
                {
                  backgroundColor: colors.surface,
                  borderColor: "rgba(255,255,255,0.08)",
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
  date: {
    marginTop: 8,
    fontSize: 19,
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
});
