import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as Speech from 'expo-speech';

// Skip loading expo-notifications inside Expo Go — SDK 53 removed Android push
// support there and the import logs a noisy error on every reload.
const IS_EXPO_GO =
  Constants.appOwnership === 'expo' &&
  Constants.executionEnvironment === 'storeClient';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import { LiquidMotionProvider } from './src/contexts/LiquidMotionContext';
import { AppLockProvider, useAppLock } from './src/contexts/AppLockContext';
import AppNavigator from './src/navigation/AppNavigator';
import LockScreen from './src/screens/LockScreen';

// ─── Voice templates ─────────────────────────────────────────────────────────
const VOICE_TEMPLATES = [
  (name) => `Hey! Time to ${name}. You can do this, I believe in you!`,
  (name) => `${name} reminder! Small steps every day make big changes. Let's go!`,
  (name) => `Don't forget to ${name} right now. Your future self will thank you.`,
  (name) => `It's ${name} time! Stay consistent, stay awesome. You've got this!`,
  (name) => `Gentle reminder — please ${name}. Keep up the amazing streak!`,
];

function speakHabitReminder(habitName, habitEmoji) {
  // Stop any ongoing speech first
  Speech.stop();
  const template = VOICE_TEMPLATES[Math.floor(Math.random() * VOICE_TEMPLATES.length)];
  const message = template(habitName || 'your habit');
  // Small delay so stop() has settled
  setTimeout(() => {
    Speech.speak(message, {
      language: 'en-IN',   // Indian-English — warm, friendly accent
      pitch: 1.15,         // Slightly higher → cheerful, friendly
      rate: 0.88,          // Slightly slower → clear and easy to understand
    });
  }, 300);
}

// ─── Global notification voice listener ──────────────────────────────────────
// Fires voice in TWO scenarios:
//   1. Notification received while app is in FOREGROUND
//   2. User taps a notification from the system tray (app was background/closed)
function HabitVoiceListener() {
  const receivedSub = useRef(null);
  const responseSub = useRef(null);

  useEffect(() => {
    if (IS_EXPO_GO) return undefined;
    let cancelled = false;

    (async () => {
      const Notifications = await import('expo-notifications');
      if (cancelled) return;

      // Case 1: App is OPEN and notification arrives → speak immediately
      receivedSub.current = Notifications.addNotificationReceivedListener((notification) => {
        const data = notification.request.content.data;
        if (data?.habitName) {
          speakHabitReminder(data.habitName, data.habitEmoji);
        }
      });

      // Case 2: User TAPS notification (from tray, app was background/killed) → speak on open
      responseSub.current = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (data?.habitName) {
          speakHabitReminder(data.habitName, data.habitEmoji);
        }
      });
    })();

    return () => {
      cancelled = true;
      receivedSub.current?.remove();
      responseSub.current?.remove();
    };
  }, []);

  return null; // No UI — pure side-effect component
}

// ─── Status bar ───────────────────────────────────────────────────────────────
function ThemedStatusBar() {
  const { theme } = useTheme();
  return <StatusBar style={theme.mode === 'light' ? 'dark' : 'light'} />;
}

// ─── App shell (with lock screen overlay) ────────────────────────────────────
function LockedShell() {
  const { locked, hydrated } = useAppLock();
  if (!hydrated) return null;
  return (
    <View style={styles.shell}>
      <AppNavigator />
      {locked && (
        <View style={StyleSheet.absoluteFill}>
          <LockScreen />
        </View>
      )}
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <LiquidMotionProvider>
            <AppLockProvider>
              <AuthProvider>
                <SubscriptionProvider>
                  <ThemedStatusBar />
                  {/* Global voice listener — always mounted when app is alive */}
                  <HabitVoiceListener />
                  <LockedShell />
                </SubscriptionProvider>
              </AuthProvider>
            </AppLockProvider>
          </LiquidMotionProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
});
