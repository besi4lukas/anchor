import "./global.css";
import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";

import { RootNavigator } from "./src/navigation/RootNavigator";
import { LaunchScreen } from "./src/components/LaunchScreen";
import { colors } from "./src/theme/colors";

import { Inter_400Regular, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { DMSerifDisplay_400Regular } from "@expo-google-fonts/dm-serif-display";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App(): React.ReactElement {
  const SHOW_LAUNCH_MS = 2000;

  const [minTimeDone, setMinTimeDone] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    DMSerifDisplay_400Regular,
  });

  // Force launch screen to stay visible for at least SHOW_LAUNCH_MS
  useEffect(() => {
    const t = setTimeout(() => setMinTimeDone(true), SHOW_LAUNCH_MS);
    return () => clearTimeout(t);
  }, []);

  const appReady = useMemo(() => fontsLoaded && minTimeDone, [fontsLoaded, minTimeDone]);

  // Hide native splash only when we’re ready
  useEffect(() => {
    if (!appReady) return;
    SplashScreen.hideAsync().catch(() => {});
  }, [appReady]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <RootNavigator />
      <LaunchScreen visible={!appReady} />
    </View>
  );
}
