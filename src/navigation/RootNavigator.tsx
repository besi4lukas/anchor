import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabs } from './BottomTabs';
import { CaptureInputScreen } from '../screens/CaptureInputScreen';
import { NoteEditScreen } from '../screens/NoteEditScreen';
import { EntriesProvider } from '../state/EntriesContext';
import { TasksProvider } from '../state/TasksContext';
import { colors } from '../theme/colors';
import type { Entry } from '../types/models';

export type RootStackParamList = {
  Main: undefined;
  CaptureInput: undefined;
  NoteEdit: { entry: Entry };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator(): React.ReactElement {
  return (
    <EntriesProvider>
      <TasksProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }}}>
            <Stack.Screen name="Main" component={BottomTabs} />
            <Stack.Screen name="CaptureInput" component={CaptureInputScreen} />
            <Stack.Screen name="NoteEdit" component={NoteEditScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </TasksProvider>
    </EntriesProvider>
  );
}

