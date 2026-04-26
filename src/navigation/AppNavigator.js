import React, { useRef } from 'react';
import { View, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import PaywallModal from '../components/PaywallModal';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomeScreen from '../screens/HomeScreen';
import TodoScreen from '../screens/TodoScreen';
import AddTodoScreen from '../screens/AddTodoScreen';
import DiaryScreen from '../screens/DiaryScreen';
import AddDiaryScreen from '../screens/AddDiaryScreen';
import DiaryDetailScreen from '../screens/DiaryDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import UpgradeScreen from '../screens/UpgradeScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import FocusScreen from '../screens/FocusScreen';
import SearchScreen from '../screens/SearchScreen';
import HabitsScreen from '../screens/HabitsScreen';
import AddHabitScreen from '../screens/AddHabitScreen';
import HabitDetailScreen from '../screens/HabitDetailScreen';
import BrainDumpScreen from '../screens/BrainDumpScreen';
import SetupPinScreen from '../screens/SetupPinScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isLight = theme.mode === 'light';
  const dockIconActive = isLight ? theme.primary : '#FFFFFF';
  const dockIconInactive = isLight ? theme.textSecondary : 'rgba(255,255,255,0.72)';
  const dockBorder = isLight ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.28)';
  const dockBg = isLight ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.16)';
  // On light themes, a white pill on a white dock is invisible — tint the
  // active icon shell with the theme's primary color instead.
  const activeShellBg = isLight ? `${theme.primary}1F` : 'rgba(255,255,255,0.28)';
  const inactiveShellBg = isLight ? 'rgba(15,23,42,0.05)' : 'rgba(255,255,255,0.12)';
  const activeShellBorder = isLight ? `${theme.primary}66` : 'rgba(255,255,255,0.5)';
  const inactiveShellBorder = isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.12)';

  // Honour bottom safe-area inset (gesture nav, home indicator) plus a
  // platform-specific minimum so the dock floats above the system area.
  // Android with a software nav bar reports inset=0, so bump the floor.
  const bottomMin = Platform.OS === 'ios' ? 18 : 18;
  const bottomOffset = Math.max(insets.bottom + 8, bottomMin);
  const dockHeight = 70;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: dockIconActive,
        tabBarInactiveTintColor: dockIconInactive,
        tabBarStyle: {
          position: 'absolute',
          left: 18,
          right: 18,
          bottom: bottomOffset,
          height: dockHeight,
          paddingTop: 0,
          paddingBottom: 0,
          borderRadius: 28,
          borderWidth: 1,
          borderColor: dockBorder,
          backgroundColor: dockBg,
          elevation: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: isLight ? 0.08 : 0.22,
          shadowRadius: 24,
        },
        tabBarBackground: () => (
          <BlurView
            tint={isLight ? 'light' : 'dark'}
            intensity={48}
            style={[StyleSheet.absoluteFill, { borderRadius: 28, overflow: 'hidden' }]}
          />
        ),
        tabBarItemStyle: {
          height: dockHeight,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 0,
          paddingBottom: 0,
        },
        tabBarIconStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 0,
        },
        tabBarIcon: ({ focused, color }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Tasks') iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
          else if (route.name === 'Habits') iconName = focused ? 'flame' : 'flame-outline';
          else if (route.name === 'Diary') iconName = focused ? 'book' : 'book-outline';
          else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
          return (
            <View
              style={[
                styles.tabIconShell,
                {
                  backgroundColor: focused ? activeShellBg : inactiveShellBg,
                  borderColor: focused ? activeShellBorder : inactiveShellBorder,
                  transform: [{ scale: focused ? 1.04 : 0.96 }],
                },
              ]}
            >
              <Ionicons name={iconName} size={focused ? 24 : 22} color={color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Tasks" component={TodoScreen} />
      <Tab.Screen name="Habits" component={HabitsScreen} />
      <Tab.Screen name="Diary" component={DiaryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const navigationRef = useRef(null);

  const navTheme = {
    ...DefaultTheme,
    dark: theme.mode !== 'light',
    colors: {
      ...DefaultTheme.colors,
      background: theme.background,
      card: theme.surface,
      text: theme.text,
      border: theme.glassBorder,
      primary: theme.primary,
    },
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        {!user ? (
          <>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen name="AddTodo" component={AddTodoScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="AddDiary" component={AddDiaryScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="DiaryDetail" component={DiaryDetailScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Upgrade" component={UpgradeScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="Analytics" component={AnalyticsScreen} />
            <Stack.Screen name="Calendar" component={CalendarScreen} />
            <Stack.Screen name="Focus" component={FocusScreen} options={{ animation: 'fade' }} />
            <Stack.Screen name="Search" component={SearchScreen} options={{ animation: 'fade' }} />
            <Stack.Screen name="AddHabit" component={AddHabitScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="HabitDetail" component={HabitDetailScreen} />
            <Stack.Screen name="BrainDump" component={BrainDumpScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="SetupPin" component={SetupPinScreen} options={{ animation: 'slide_from_bottom' }} />
          </>
        )}
      </Stack.Navigator>
      <PaywallModal navigationRef={navigationRef} />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBarItem: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconShell: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
