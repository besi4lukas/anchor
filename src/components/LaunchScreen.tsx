import React from "react";
import { View, Image, StyleSheet } from "react-native";

type Props = { visible: boolean };


const logo = require("../../assets/splash.png");

export function LaunchScreen({ visible }: Props): React.ReactElement | null {
  if (!visible) return null;

  return (
    <View style={styles.root} pointerEvents="none">
      {/* Logo */}
      <Image source={logo} style={styles.logo} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999999,      // forces it above navigation
    elevation: 999999,   // Android
  },
  glow1: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 999,
    backgroundColor: "rgba(157,78,221,0.18)",
  },
  glow2: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(80,180,255,0.14)",
  },
  logo: {
    width: 220,
    height: 220,
  },
});
