import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Animated, Easing } from "react-native";
import { colors } from "../theme/colors";
import type { Entry } from "../types/models";

interface EntryEditSheetProps {
  visible: boolean;
  entry: Entry | null;
  onClose: () => void;
  onSave: (entryId: string, content: string) => void;
}

export function EntryEditSheet({
  visible,
  entry,
  onClose,
  onSave,
}: EntryEditSheetProps): React.ReactElement {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (entry && visible) {
      setText(entry.content);
    } else {
      setText("");
    }
  }, [entry, visible]);

  const canSend = text.trim().length > 0;
  const showWriteActions = canSend;

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
    if (!canSend || !entry) return;
    onSave(entry.id, text.trim());
    setText("");
    onClose();
  };

  const toggleListening = (): void => {
    setIsListening((v) => !v);
    // Hide keyboard when speaking
    inputRef.current?.blur();
  };

  const handleChangeText = (v: string): void => {
    // If they start typing, stop listening automatically
    if (isListening && v.length > 0) setIsListening(false);
    setText(v);
  };

  if (!entry) return <></>;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={focusInputFast}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: "80%",
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              <TouchableOpacity onPress={onClose}>
                <Text style={{ color: colors.primary, fontSize: 16, fontWeight: "500" }}>
                  Close
                </Text>
              </TouchableOpacity>
              <View style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </View>
              <TouchableOpacity>
                <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Text Input Area */}
              {!isListening ? (
                <View style={{ marginBottom: 24 }}>
                  <TextInput
                    ref={inputRef}
                    value={text}
                    onChangeText={handleChangeText}
                    placeholder="Edit your note..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    style={{
                      minHeight: 120,
                      color: colors.textPrimary,
                      fontSize: 18,
                      fontWeight: "600",
                      paddingVertical: 12,
                      textAlignVertical: "top",
                    }}
                    selectionColor={colors.primary}
                    autoFocus
                  />
                </View>
              ) : (
                <View style={{ alignItems: "center", justifyContent: "center", marginBottom: 24, minHeight: 200 }}>
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
                        <Text style={{ marginTop: 10, color: colors.textMuted, fontWeight: "700", fontSize: 14 }}>
                          Listening...
                        </Text>
                      </View>
                    </LinearGradient>
                  </Animated.View>
                </View>
              )}

              {/* Note placeholder */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{ color: colors.textMuted, fontSize: 16 }}>Note</Text>
              </View>
            </ScrollView>

            {/* Footer */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 32,
                borderTopWidth: 1,
                borderTopColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              <TouchableOpacity
                onPress={toggleListening}
                activeOpacity={0.92}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.background,
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  borderRadius: 12,
                }}
              >
                <Ionicons name={isListening ? "stop-circle" : "mic"} size={18} color={colors.textSecondary} />
                <Text style={{ color: colors.textPrimary, fontWeight: "600", marginLeft: 8 }}>
                  {isListening ? "Stop" : "Speak"}
                </Text>
              </TouchableOpacity>

              {showWriteActions && (
                <TouchableOpacity
                  onPress={handleSend}
                  disabled={!canSend}
                  activeOpacity={0.92}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: colors.textPrimary,
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    borderRadius: 12,
                  }}
                >
                  <Ionicons name="arrow-up" size={18} color={colors.textSecondary} />
                  <Text style={{ color: colors.background, fontWeight: "600", marginLeft: 8 }}>Save</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

