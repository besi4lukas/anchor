/**
 * NoteBeam Component
 * 
 * A floating action button that appears on all tabs, allowing users to quickly
 * create new notes.
 * 
 * Design Pattern: Compound Component
 * - Separates visual presentation from business logic
 * - Uses constants for maintainable sizing
 */

import React from "react";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors } from "../theme/colors";
import { NOTE_BEAM } from "../constants/ui";
import type { RootStackParamList } from "../navigation/RootNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface NoteBeamProps {
  /** Callback when a new entry is created */
  onEntryCreated?: (content: string) => void;
  /** Height of the tab bar (used for positioning) */
  tabBarHeight?: number;
}

/**
 * Floating action button positioned above the tab bar on the right side
 */
export function NoteBeam({
  onEntryCreated,
  tabBarHeight = NOTE_BEAM.DEFAULT_TAB_BAR_HEIGHT,
}: NoteBeamProps): React.ReactElement {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  // Extract sizing constants for readability
  const { CORE, ICON, RIGHT, GAP_ABOVE_TAB } = NOTE_BEAM;
  const RADIUS = CORE / 2;

  // Calculate bottom position: account for safe area, tab bar height, and visual offset
  // The -18 offset pulls the button closer to the tab bar for better visual integration
  const BOTTOM = insets.bottom + tabBarHeight - 18 + GAP_ABOVE_TAB;

  /**
   * Handle press - navigate to CaptureInputScreen
   */
  const handlePress = (): void => {
    navigation.navigate("CaptureInput");
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.92}
      style={{
        position: "absolute",
        right: RIGHT,
        bottom: BOTTOM,
        width: CORE,
        height: CORE,
        borderRadius: RADIUS,
        alignItems: "center",
        justifyContent: "center",
      }}
      accessibilityLabel="Create new note"
      accessibilityRole="button"
      accessibilityHint="Opens a notepad screen to create a new note"
    >
      {/* Core button with gradient background */}
      {/* <LinearGradient
        colors={["rgba(25, 25, 35, 0.96)", "rgba(10, 10, 16, 0.96)"]}
        style={{
          width: CORE,
          height: CORE,
          borderRadius: RADIUS,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.10)",
        }}
      > */}
        <Ionicons
          name="create"
          size={ICON * 1.5} // Increased icon size by 50%
          color={colors.textPrimary}
          style={{ marginTop: -1 }} // Optical centering adjustment
        />
      {/* </LinearGradient> */}
    </TouchableOpacity>
  );
}
