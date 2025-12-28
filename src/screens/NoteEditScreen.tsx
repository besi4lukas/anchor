/**
 * NoteEditScreen Component
 * 
 * A full-screen editable notepad for editing existing notes.
 * Similar to CaptureInputScreen but pre-populated with existing note content.
 * Auto-saves when navigating back if there's text, otherwise no changes are saved.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useEntries } from "../state/EntriesContext";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type NoteEditRouteProp = RouteProp<RootStackParamList, "NoteEdit">;
import { LinearGradient } from "expo-linear-gradient";
import { Animated, Easing } from "react-native";
import { colors } from "../theme/colors";
import { ANIMATION } from "../constants/ui";
import type { Entry } from "../types/models";

export function NoteEditScreen(): React.ReactElement {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<NoteEditRouteProp>();
  const { entry } = route.params;
  const { updateEntry } = useEntries();
  const [text, setText] = useState(entry.content);
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const canSave = text.trim().length > 0;

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
            duration: ANIMATION.LISTENING_ANIMATION_DURATION,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 1,
            duration: ANIMATION.LISTENING_ANIMATION_DURATION,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 1.0,
            duration: ANIMATION.LISTENING_ANIMATION_DURATION,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0.75,
            duration: ANIMATION.LISTENING_ANIMATION_DURATION,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    anim.start();
    return () => anim.stop();
  }, [isListening, ringScale, ringOpacity]);

  /**
   * Handle back navigation
   * 
   * Auto-saves the note if there's text and it's different from original.
   */
  const handleBack = (): void => {
    if (canSave && text.trim() !== entry.content.trim()) {
      updateEntry(entry.id, text.trim());
    }
    navigation.goBack();
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

  // Focus input when screen mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Note</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content Area */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {!isListening ? (
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={handleChangeText}
              placeholder="Edit your note..."
              placeholderTextColor={colors.textMuted}
              multiline
              style={styles.textInput}
              selectionColor={colors.primary}
              autoFocus
            />
          ) : (
            <View style={styles.listeningContainer}>
              <View
                pointerEvents="none"
                style={styles.listeningBackground}
              />
              <Animated.View
                style={[
                  styles.listeningRing,
                  {
                    transform: [{ scale: ringScale }],
                    opacity: ringOpacity,
                  },
                ]}
              >
                <LinearGradient
                  colors={[
                    "rgba(100, 181, 246, 0.95)", // Soft blue
                    "rgba(66, 165, 245, 0.90)", // Light blue
                    "rgba(33, 150, 243, 0.95)", // Medium blue
                    "rgba(66, 165, 245, 0.90)", // Light blue
                    "rgba(100, 181, 246, 0.95)", // Soft blue
                  ]}
                  start={{ x: 0.1, y: 0.0 }}
                  end={{ x: 0.9, y: 1.0 }}
                  style={styles.listeningGradient}
                >
                  <View style={styles.listeningInner}>
                    <Ionicons name="mic" size={28} color={colors.textPrimary} />
                    <Text style={styles.listeningText}>Listening...</Text>
                  </View>
                </LinearGradient>
              </Animated.View>
            </View>
          )}
        </ScrollView>

        {/* Footer with Speak Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={toggleListening}
            activeOpacity={0.92}
            style={styles.speakButton}
          >
            <Ionicons
              name={isListening ? "stop-circle" : "mic"}
              size={20}
              color={colors.textSecondary}
            />
            <Text style={styles.speakButtonText}>
              {isListening ? "Stop" : "Speak"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  textInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "400",
    lineHeight: 28,
    textAlignVertical: "top",
    minHeight: 400,
  },
  listeningContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 400,
  },
  listeningBackground: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(157, 78, 221, 0.20)",
  },
  listeningRing: {
    width: 170,
    height: 170,
    borderRadius: 85,
  },
  listeningGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 85,
    padding: 10,
  },
  listeningInner: {
    flex: 1,
    borderRadius: 75,
    backgroundColor: "rgba(12, 12, 16, 0.82)",
    alignItems: "center",
    justifyContent: "center",
  },
  listeningText: {
    marginTop: 10,
    color: colors.textMuted,
    fontWeight: "700",
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: colors.background,
  },
  speakButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: "flex-end",
  },
  speakButtonText: {
    color: colors.textPrimary,
    fontWeight: "600",
    marginLeft: 8,
  },
});

