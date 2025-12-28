/**
 * ModalHeader Component
 * 
 * A reusable header component for modal sheets.
 * Provides consistent header styling and layout across all modals.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { SPACING } from "../../constants/ui";

interface ModalHeaderProps {
  /** Text to display on the left (typically "Close") */
  leftText?: string;
  /** Callback when left button is pressed */
  onLeftPress?: () => void;
  /** Whether to show the chevron down icon in the center */
  showChevron?: boolean;
  /** Optional right side content */
  rightContent?: React.ReactNode;
}

/**
 * Standardized header for modal sheets
 */
export function ModalHeader({
  leftText = "Close",
  onLeftPress,
  showChevron = true,
  rightContent,
}: ModalHeaderProps): React.ReactElement {
  return (
    <View style={styles.container}>
      {/* Left side - typically close button */}
      <TouchableOpacity onPress={onLeftPress} style={styles.leftButton}>
        <Text style={styles.leftText}>{leftText}</Text>
      </TouchableOpacity>

      {/* Center - decorative chevron */}
      {showChevron && (
        <View style={styles.center}>
          <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
        </View>
      )}

      {/* Right side - optional content (e.g., menu icon) */}
      {rightContent && <View style={styles.right}>{rightContent}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.MODAL_HORIZONTAL,
    paddingTop: SPACING.HORIZONTAL,
    paddingBottom: SPACING.HORIZONTAL,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  leftButton: {
    minWidth: 60,
  },
  leftText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "500",
  },
  center: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  right: {
    minWidth: 60,
    alignItems: "flex-end",
  },
});

