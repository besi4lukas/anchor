/**
 * Button Component
 * 
 * A reusable button component with consistent styling.
 * Supports different variants and states for various use cases.
 */

import React from "react";
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { BUTTON } from "../../constants/ui";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps {
  /** Button text */
  label: string;
  /** Callback when button is pressed */
  onPress: () => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Visual variant of the button */
  variant?: ButtonVariant;
  /** Optional icon name from Ionicons */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Icon position relative to text */
  iconPosition?: "left" | "right";
  /** Custom styles for the button container */
  style?: ViewStyle;
  /** Custom styles for the text */
  textStyle?: TextStyle;
  /** Whether to show full width */
  fullWidth?: boolean;
}

/**
 * Reusable button component with consistent styling
 */
export function Button({
  label,
  onPress,
  disabled = false,
  variant = "primary",
  icon,
  iconPosition = "left",
  style,
  textStyle,
  fullWidth = false,
}: ButtonProps): React.ReactElement {
  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return {
          container: styles.primaryContainer,
          text: styles.primaryText,
        };
      case "secondary":
        return {
          container: styles.secondaryContainer,
          text: styles.secondaryText,
        };
      case "ghost":
        return {
          container: styles.ghostContainer,
          text: styles.ghostText,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const iconSize = 18;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={BUTTON.ACTIVE_OPACITY}
      style={[
        styles.base,
        variantStyles.container,
        disabled && styles.disabled,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {icon && iconPosition === "left" && (
        <Ionicons
          name={icon}
          size={iconSize}
          color={variant === "primary" ? colors.textSecondary : colors.textPrimary}
          style={styles.iconLeft}
        />
      )}
      <Text style={[variantStyles.text, textStyle]}>{label}</Text>
      {icon && iconPosition === "right" && (
        <Ionicons
          name={icon}
          size={iconSize}
          color={variant === "primary" ? colors.textSecondary : colors.textPrimary}
          style={styles.iconRight}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: BUTTON.PADDING_VERTICAL,
    paddingHorizontal: BUTTON.PADDING_HORIZONTAL,
    borderRadius: BUTTON.BORDER_RADIUS,
  },
  primaryContainer: {
    backgroundColor: colors.textPrimary,
  },
  primaryText: {
    color: colors.background,
    fontWeight: "600",
  },
  secondaryContainer: {
    backgroundColor: colors.background,
  },
  secondaryText: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  ghostContainer: {
    backgroundColor: "transparent",
  },
  ghostText: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.5,
  },
  fullWidth: {
    flex: 1,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

