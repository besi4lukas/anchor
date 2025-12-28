import React, { useState, useEffect } from "react";
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
import { colors } from "../theme/colors";

interface TaskCreateSheetProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (title: string) => void;
  selectedDate: Date;
  /** Optional initial title to pre-fill the input */
  initialTitle?: string;
}

export function TaskCreateSheet({
  visible,
  onClose,
  onCreate,
  selectedDate,
  initialTitle = "",
}: TaskCreateSheetProps): React.ReactElement {
  const [title, setTitle] = useState("");

  /**
   * Update title when modal opens with initialTitle or when initialTitle changes
   */
  useEffect(() => {
    if (visible) {
      setTitle(initialTitle);
    } else {
      setTitle("");
    }
  }, [visible, initialTitle]);

  const handleCreate = (): void => {
    if (title.trim()) {
      onCreate(title.trim());
      setTitle("");
      onClose();
    }
  };

  const formatDate = (date: Date): string => {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    return `${date.getDate()} ${months[date.getMonth()]}`;
  };

  const formatTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, "0");
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
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
            </View>

            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Task Title Input */}
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: colors.textMuted,
                    backgroundColor: "transparent",
                    marginRight: 12,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                />
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="New goal..."
                  placeholderTextColor={colors.textMuted}
                  style={{
                    flex: 1,
                    color: colors.textPrimary,
                    fontSize: 18,
                    fontWeight: "600",
                    paddingVertical: 4,
                  }}
                  selectionColor={colors.primary}
                  autoFocus
                />
              </View>

              {/* Date/Time/Repeat buttons */}
              <View style={{ marginBottom: 24 }}>
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: colors.background,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                  }}
                >
                  <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                  <Text style={{ color: colors.textPrimary, marginLeft: 12, fontSize: 16 }}>
                    {formatDate(selectedDate)}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: colors.background,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                  }}
                >
                  <Ionicons name="time-outline" size={20} color={colors.primary} />
                  <Text style={{ color: colors.textPrimary, marginLeft: 12, fontSize: 16 }}>
                    {formatTime(selectedDate)} - {formatTime(new Date(selectedDate.getTime() + 30 * 60000))}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: colors.background,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                  }}
                >
                  <Ionicons name="repeat-outline" size={20} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, marginLeft: 12, fontSize: 16 }}>
                    Every D
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Footer */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "flex-end",
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 15,
                borderTopWidth: 1,
                borderTopColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              <TouchableOpacity
                onPress={handleCreate}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.textPrimary,
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: colors.background, fontSize: 16, fontWeight: "600" }}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

