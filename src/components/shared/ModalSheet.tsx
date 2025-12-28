/**
 * ModalSheet Component
 * 
 * A reusable base component for bottom sheet modals.
 * This component provides consistent styling and behavior for all modal sheets
 * in the app, reducing code duplication and ensuring a consistent user experience.
 * 
 * Features:
 * - Consistent styling across all modals
 * - Keyboard handling
 * - Backdrop dismiss functionality
 * - Smooth slide-up animation
 */

import React from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { colors } from "../../theme/colors";
import { MODAL } from "../../constants/ui";

interface ModalSheetProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when modal should be closed */
  onClose: () => void;
  /** Content to render inside the modal */
  children: React.ReactNode;
  /** Optional custom styles for the content container */
  contentStyle?: object;
}

/**
 * Base modal sheet component with consistent styling
 */
export function ModalSheet({
  visible,
  onClose,
  children,
  contentStyle,
}: ModalSheetProps): React.ReactElement {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        {/* Backdrop - tapping outside closes the modal */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={styles.backdrop}
        >
          {/* Modal content container */}
          <View
            style={[styles.content, contentStyle]}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            {children}
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: MODAL.OVERLAY_BG,
    justifyContent: "flex-end",
  },
  content: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: MODAL.BORDER_RADIUS,
    borderTopRightRadius: MODAL.BORDER_RADIUS,
    maxHeight: MODAL.MAX_HEIGHT_PERCENT,
  },
});

