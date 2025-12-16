import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Animated, Easing } from "react-native";
import { colors } from "../theme/colors";

interface CaptureSheetProps {
  visible: boolean;
  onClose: () => void;
  onProcess: (content: string) => void;
  mode?: "auto" | "entry" | "task";
}

export function CaptureSheet({
  visible,
  onClose,
  onProcess,
}: CaptureSheetProps): React.ReactElement {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);

  const inputRef = useRef<TextInput>(null);

  const canSend = text.trim().length > 0;
  const showWriteActions = canSend; // only when they typed

  // ---- pulsing ring animation (listening UI) ----
  const ringScale = useMemo(() => new Animated.Value(1), []);
  const ringOpacity = useMemo(() => new Animated.Value(0.9), []);

  useEffect(() => {
    if (!isListening) return;

    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 1.08,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 1.0,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0.75,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    anim.start();
    return () => anim.stop();
  }, [isListening, ringScale, ringOpacity]);

  const focusInputFast = (): void => {
    if (isListening) return;
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const handleSend = (): void => {
    if (!canSend) return;
    onProcess(text.trim());
    setText("");
  };

  const handleReset = (): void => setText("");

  const toggleListening = (): void => {
    setIsListening((v) => !v);
    // if they choose Speak, dismiss keyboard immediately
    inputRef.current?.blur();
  };

  const handleChangeText = (v: string): void => {
    // seamless: if they start typing, stop listening automatically
    if (isListening && v.length > 0) setIsListening(false);
    setText(v);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onShow={focusInputFast}
      hardwareAccelerated
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              marginTop: "auto",
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              overflow: "hidden",
              backgroundColor: colors.background,
              height: "86%",
            }}
          >
            <LinearGradient
              colors={[
                "rgba(157, 78, 221, 0.55)",
                "rgba(30, 30, 40, 0.10)",
                "rgba(0,0,0,0)",
              ]}
              start={{ x: 0.0, y: 0.0 }}
              end={{ x: 0.0, y: 1.0 }}
              style={{ paddingTop: 14, paddingBottom: 10, paddingHorizontal: 16 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>

                <View style={{ alignItems: "center" }}>
                  <View
                    style={{
                      height: 5,
                      width: 44,
                      borderRadius: 999,
                      backgroundColor: "rgba(255,255,255,0.18)",
                      marginBottom: 8,
                    }}
                  />
                  <Text style={{ color: colors.textSecondary, fontSize: 12, letterSpacing: 2 }}>
                    ANCHOR
                  </Text>
                </View>

                <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
                  <Ionicons name="chevron-down" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <View style={{ paddingHorizontal: 18, paddingTop: 6, paddingBottom: 10 }}>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 20,
                  fontWeight: "700",
                  textAlign: "center",
                  opacity: 0.92,
                }}
              >
                Share your thoughts
              </Text>
            </View>

            <View style={{ flex: 1, paddingHorizontal: 18, paddingBottom: 16 }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.08)",
                  overflow: "hidden",
                }}
              >
                {!isListening ? (
                  <View style={{ flex: 1, paddingHorizontal: 14, paddingTop: 14 }}>
                    <TextInput
                      ref={inputRef}
                      value={text}
                      onChangeText={handleChangeText}
                      placeholder="start writing…"
                      placeholderTextColor={colors.textMuted}
                      multiline
                      autoFocus={false}
                      style={{
                        flex: 1,
                        color: colors.textPrimary,
                        fontSize: 16,
                        textAlignVertical: "top",
                      }}
                    />
                  </View>
                ) : (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <View
                      pointerEvents="none"
                      style={{
                        position: "absolute",
                        width: 220,
                        height: 220,
                        borderRadius: 999,
                        backgroundColor: "rgba(157, 78, 221, 0.20)",
                      }}
                    />
                    <Animated.View
                      style={{
                        width: 170,
                        height: 170,
                        borderRadius: 999,
                        transform: [{ scale: ringScale }],
                        opacity: ringOpacity,
                      }}
                    >
                      <LinearGradient
                        colors={[
                          "rgba(255, 70, 120, 0.95)",
                          "rgba(120, 90, 255, 0.95)",
                          "rgba(60, 210, 255, 0.92)",
                          "rgba(70, 255, 170, 0.75)",
                          "rgba(255, 70, 120, 0.95)",
                        ]}
                        start={{ x: 0.1, y: 0.0 }}
                        end={{ x: 0.9, y: 1.0 }}
                        style={{ width: "100%", height: "100%", borderRadius: 999, padding: 10 }}
                      >
                        <View
                          style={{
                            flex: 1,
                            borderRadius: 999,
                            backgroundColor: "rgba(12, 12, 16, 0.82)",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Ionicons name="mic" size={28} color={colors.textPrimary} />
                          <Text style={{ marginTop: 10, color: colors.textMuted, fontWeight: "700" }}>
                            Listening...
                          </Text>
                        </View>
                      </LinearGradient>
                    </Animated.View>
                  </View>
                )}

                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingTop: 10,
                    paddingBottom: Platform.OS === "ios" ? 14 : 12,
                    borderTopWidth: 1,
                    borderTopColor: "rgba(255,255,255,0.08)",
                    backgroundColor: "rgba(0,0,0,0.18)",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      backgroundColor: "rgba(255,255,255,0.06)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.08)",
                    }}
                  >
                    <Ionicons name="globe-outline" size={16} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, fontWeight: "700" }}>ENGLISH</Text>
                  </View>

                  {showWriteActions ? (
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <TouchableOpacity
                        onPress={handleReset}
                        activeOpacity={0.9}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          paddingVertical: 10,
                          paddingHorizontal: 14,
                          borderRadius: 999,
                          backgroundColor: "rgba(255,255,255,0.10)",
                        }}
                      >
                        <Ionicons name="refresh" size={18} color={colors.textPrimary} />
                        <Text style={{ color: colors.textPrimary, fontWeight: "800" }}>Reset</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleSend}
                        disabled={!canSend}
                        activeOpacity={0.92}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          paddingVertical: 10,
                          paddingHorizontal: 16,
                          borderRadius: 999,
                          backgroundColor: "rgba(255,255,255,0.92)",
                        }}
                      >
                        <Ionicons name="arrow-up" size={18} color={"#111"} />
                        <Text style={{ color: "#111", fontWeight: "900" }}>Send</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={toggleListening}
                      activeOpacity={0.92}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 999,
                        backgroundColor: "rgba(255,255,255,0.10)",
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.10)",
                      }}
                    >
                      <Ionicons name={isListening ? "stop-circle" : "mic"} size={18} color={colors.textPrimary} />
                      <Text style={{ color: colors.textPrimary, fontWeight: "900" }}>
                        {isListening ? "Stop" : "Speak"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}
