import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabs } from './BottomTabs';
import { EntryDetailScreen } from '../screens/EntryDetailScreen';
import { Entry } from '../types/models';
import { colors } from '../theme/colors';

export type RootStackParamList = {
  Main: undefined;
  EntryDetail: { entry: Entry };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator(): React.ReactElement {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }}}>
        <Stack.Screen name="Main" component={BottomTabs} />
        <Stack.Screen
          name="EntryDetail"
          component={EntryDetailScreen}
          options={{
            headerShown: true,
            headerStyle: {
              backgroundColor: colors.surface,
            },
            headerTintColor: colors.textPrimary,
            headerTitleStyle: {
              color: colors.textPrimary,
            },
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

