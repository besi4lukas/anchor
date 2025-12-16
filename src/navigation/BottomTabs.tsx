import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { TodayScreen } from "../screens/TodayScreen";
import { TodoScreen } from "../screens/TodoScreen";
import { MeScreen } from "../screens/MeScreen";
import { colors } from "../theme/colors";

import { AnchorBeam } from "../components/AnchorBeam";
import { EntriesProvider, useEntries } from "../state/EntriesContext";
import { TasksProvider } from "../state/TasksContext";

const Tab = createBottomTabNavigator();

function TabsWithBeam(): React.ReactElement {
  const { createEntry } = useEntries();
  const TAB_BAR_HEIGHT = 80;

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopColor: colors.background,
            borderTopWidth: 1,
            height: TAB_BAR_HEIGHT,
            paddingTop: 8,
            paddingBottom: 8,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "500",
          },
        }}
      >
        <Tab.Screen
          name="Today"
          component={TodayScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="To-do"
          component={TodoScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="checkmark-circle" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Me"
          component={MeScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>

      {/* Global Beam (still creates entries for now) */}
      <AnchorBeam onEntryCreated={createEntry} tabBarHeight={TAB_BAR_HEIGHT} />
    </View>
  );
}

export function BottomTabs(): React.ReactElement {
  return (
    <EntriesProvider>
      <TasksProvider>
        <TabsWithBeam />
      </TasksProvider>
    </EntriesProvider>
  );
}
