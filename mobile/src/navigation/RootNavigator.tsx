import React from 'react';
import { NavigationContainer, DefaultTheme, Theme as NavTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { TabBar } from './TabBar';
import type { RootStackParamList, TabParamList } from './types';

import { WelcomeScreen } from '@/screens/onboarding/WelcomeScreen';
import { DedicationWriteScreen } from '@/screens/onboarding/DedicationWriteScreen';
import { DedicationScreen } from '@/screens/onboarding/DedicationScreen';
import { SignInScreen } from '@/screens/auth/SignInScreen';
import { SignUpScreen } from '@/screens/auth/SignUpScreen';
import { ForgotPasswordScreen } from '@/screens/auth/ForgotPasswordScreen';

import { HomeScreen } from '@/screens/home/HomeScreen';
import { LibraryScreen } from '@/screens/library/LibraryScreen';
import { JournalScreen } from '@/screens/journal/JournalScreen';
import { CollectionScreen } from '@/screens/quotes/CollectionScreen';
import { YouScreen } from '@/screens/settings/YouScreen';

import { BookDetailScreen } from '@/screens/book/BookDetailScreen';
import { AuthorScreen } from '@/screens/book/AuthorScreen';
import { SearchScreen } from '@/screens/search/SearchScreen';
import { ScannerScreen } from '@/screens/search/ScannerScreen';
import { AddBookManuallyScreen } from '@/screens/search/AddBookManuallyScreen';
import { JournalEntryScreen } from '@/screens/journal/JournalEntryScreen';
import { QuoteEditorScreen } from '@/screens/quotes/QuoteEditorScreen';
import { NoteEditorScreen } from '@/screens/notes/NoteEditorScreen';
import { ReadingLogScreen } from '@/screens/book/ReadingLogScreen';
import { StatsScreen } from '@/screens/stats/StatsScreen';
import { GoalsScreen } from '@/screens/goals/GoalsScreen';
import { AchievementsScreen } from '@/screens/moments/AchievementsScreen';
import { ThisDayScreen } from '@/screens/moments/ThisDayScreen';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { ThemesScreen } from '@/screens/settings/ThemesScreen';
import { DataAndBackupScreen } from '@/screens/settings/DataAndBackupScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function Tabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Library" component={LibraryScreen} options={{ title: 'Library' }} />
      <Tab.Screen name="Journal" component={JournalScreen} options={{ title: 'Journal' }} />
      <Tab.Screen name="Collection" component={CollectionScreen} options={{ title: 'Keepsakes' }} />
      <Tab.Screen name="You" component={YouScreen} options={{ title: 'You' }} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const theme = useTheme();
  const onboarded = useSettingsStore((s) => s.onboarded);
  const user = useAuthStore((s) => s.user);

  const navTheme: NavTheme = {
    ...DefaultTheme,
    dark: theme.isDark,
    colors: {
      ...DefaultTheme.colors,
      primary: theme.colors.accent,
      background: theme.colors.canvas,
      card: theme.colors.paper,
      text: theme.colors.ink,
      border: theme.colors.rule,
      notification: theme.colors.accent,
    },
    fonts: DefaultTheme.fonts,
  };

  const signedIn = Boolean(user);

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          // Pages should turn, not slam.
          animation: theme.calm ? 'fade' : 'slide_from_right',
          animationDuration: 320,
          contentStyle: { backgroundColor: theme.colors.canvas },
          gestureEnabled: true,
        }}
      >
        {!onboarded ? (
          <Stack.Group>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="DedicationWrite" component={DedicationWriteScreen} />
          </Stack.Group>
        ) : !signedIn ? (
          <Stack.Group>
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
          </Stack.Group>
        ) : (
          <Stack.Group>
            <Stack.Screen name="Tabs" component={Tabs} />

            <Stack.Screen name="BookDetail" component={BookDetailScreen} />
            <Stack.Screen name="Author" component={AuthorScreen} />
            <Stack.Screen name="ReadingLog" component={ReadingLogScreen} />

            <Stack.Screen
              name="Search"
              component={SearchScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen name="Scanner" component={ScannerScreen} options={{ animation: 'fade' }} />
            <Stack.Screen name="AddBookManually" component={AddBookManuallyScreen} />

            <Stack.Screen
              name="JournalEntry"
              component={JournalEntryScreen}
              options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
            />
            <Stack.Screen
              name="QuoteEditor"
              component={QuoteEditorScreen}
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="NoteEditor"
              component={NoteEditorScreen}
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />

            <Stack.Screen name="Stats" component={StatsScreen} />
            <Stack.Screen name="Goals" component={GoalsScreen} />
            <Stack.Screen name="Achievements" component={AchievementsScreen} />
            <Stack.Screen name="ThisDay" component={ThisDayScreen} />

            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Themes" component={ThemesScreen} />
            <Stack.Screen name="DataAndBackup" component={DataAndBackupScreen} />
            <Stack.Screen
              name="Dedication"
              component={DedicationScreen}
              options={{ animation: 'fade', animationDuration: 520 }}
            />
            <Stack.Screen name="DedicationWrite" component={DedicationWriteScreen} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
