/**
 * ModalFooter Component
 * 
 * A reusable footer component for modal sheets.
 * Provides consistent footer styling and layout for action buttons.
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { SPACING } from "../../constants/ui";

interface ModalFooterProps {
  /** Content to render in the footer (typically buttons) */
  children: React.ReactNode;
}

/**
 * Standardized footer for modal sheets
 */
export function ModalFooter({ children }: ModalFooterProps): React.ReactElement {
  return (
    <View style={styles.container}>
      {children}
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
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
});

