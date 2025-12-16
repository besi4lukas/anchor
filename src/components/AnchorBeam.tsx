import React, { useEffect, useMemo, useState } from "react";
import { View, TouchableOpacity, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { CaptureSheet } from "./CaptureSheet";

interface AnchorBeamProps {
  onEntryCreated?: (content: string) => void;
  tabBarHeight?: number; 
}

export function AnchorBeam({
  onEntryCreated,
  tabBarHeight = 78,
}: AnchorBeamProps): React.ReactElement {
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const insets = useSafeAreaInsets();

  // sizing
  const CORE = 28;
  const ICON = 16;
  const RING = 54;
  const MASK = 50;
  const HALO = 78;
  const RADIUS = CORE / 2;

  // Position tuned to sit right above the tab bar
  const RIGHT = 35; // keep fully on-screen
  const GAP_ABOVE_TAB = 8;
  const BOTTOM = insets.bottom + tabBarHeight - 18 + GAP_ABOVE_TAB;
  // tabBarHeight - 18 pulls it down closer into the tabbar area (Tiimo feel)

  const ringScale = useMemo(() => new Animated.Value(1), []);
  const ringOpacity = useMemo(() => new Animated.Value(0.85), []);
  const haloScale = useMemo(() => new Animated.Value(1), []);
  const haloOpacity = useMemo(() => new Animated.Value(0.14), []);

  useEffect(() => {
    const ringAnim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale, { toValue: 1.06, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.98, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale, { toValue: 1.0, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.82, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      ])
    );

    const haloAnim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(haloScale, { toValue: 1.08, duration: 2800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(haloOpacity, { toValue: 0.22, duration: 2800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(haloScale, { toValue: 1.0, duration: 2800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(haloOpacity, { toValue: 0.12, duration: 2800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      ])
    );

    ringAnim.start();
    haloAnim.start();
    return () => {
      ringAnim.stop();
      haloAnim.stop();
    };
  }, [ringScale, ringOpacity, haloScale, haloOpacity]);

  return (
    <>
      <TouchableOpacity
        onPress={() => setIsSheetVisible(true)}
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
      >
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: HALO,
            height: HALO,
            borderRadius: HALO / 2,
            backgroundColor: "rgba(157, 78, 221, 1)",
            transform: [{ scale: haloScale }],
            opacity: haloOpacity,
          }}
        />

        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: RING,
            height: RING,
            borderRadius: RING / 2,
            transform: [{ scale: ringScale }],
            opacity: ringOpacity,
          }}
        >
          <LinearGradient
            colors={[
              "rgba(255, 70, 120, 0.90)",
              "rgba(120, 90, 255, 0.90)",
              "rgba(60, 210, 255, 0.88)",
              "rgba(70, 255, 170, 0.75)",
              "rgba(255, 70, 120, 0.90)",
            ]}
            start={{ x: 0.1, y: 0.0 }}
            end={{ x: 0.9, y: 1.0 }}
            style={{ width: RING, height: RING, borderRadius: RING / 2 }}
          />
        </Animated.View>

        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: MASK,
            height: MASK,
            borderRadius: MASK / 2,
            backgroundColor: "rgba(12, 12, 16, 0.68)",
          }}
        />

        <LinearGradient
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
        >
          <Ionicons
            name="add"
            size={18}
            color={colors.textPrimary}
            style={{ marginTop: -1 }} // optical centering
          />
        </LinearGradient>
      </TouchableOpacity>

      <CaptureSheet
        visible={isSheetVisible}
        onClose={() => setIsSheetVisible(false)}
        onProcess={(content) => {
          onEntryCreated?.(content);
          setIsSheetVisible(false);
        }}
      />
    </>
  );
}
