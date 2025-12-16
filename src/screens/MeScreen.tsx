import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme/colors";

export function MeScreen(): React.ReactElement {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* position relative so Beam can be absolutely positioned */}
      <View style={{ flex: 1, position: "relative", backgroundColor: colors.background }}>
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 14 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 26, fontWeight: "800" }}>
            Me
          </Text>

          <View
            style={{
              marginTop: 14,
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 14,
            }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 20 }}>
              Profile screen coming soon.
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 6 }}>
              Trial status, subscription, restore purchases, and settings will live here.
            </Text>
          </View>

          {/* Spacer fills rest of screen so background stays consistent */}
          <View style={{ flex: 1 }} />
        </View>
      </View>
    </SafeAreaView>
  );
}
