import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, Animated, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { useAppLock } from '../contexts/AppLockContext';
import LiquidBackground from '../components/LiquidBackground';
import PressScale from '../components/PressScale';

const PIN_LENGTH = 4;

export default function LockScreen() {
  const { theme } = useTheme();
  const { tryUnlock, biometricEnabled, biometricAvailable, tryBiometricUnlock } = useAppLock();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;
  const promptedBiometric = useRef(false);

  // Auto-prompt biometric once when the lock screen mounts so the user
  // doesn't have to tap a button on the common path. Only once per mount.
  useEffect(() => {
    if (biometricEnabled && biometricAvailable && !promptedBiometric.current) {
      promptedBiometric.current = true;
      tryBiometricUnlock();
    }
  }, [biometricEnabled, biometricAvailable, tryBiometricUnlock]);

  useEffect(() => {
    if (pin.length === PIN_LENGTH) {
      const ok = tryUnlock(pin);
      if (!ok) {
        setError(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Animated.sequence([
          Animated.timing(shake, { toValue: 10, duration: 60, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(shake, { toValue: -10, duration: 60, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(shake, { toValue: 6, duration: 60, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(shake, { toValue: -6, duration: 60, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(shake, { toValue: 0, duration: 60, easing: Easing.linear, useNativeDriver: true }),
        ]).start(() => {
          setPin('');
          setError(false);
        });
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  }, [pin, tryUnlock, shake]);

  const press = (digit) => {
    if (pin.length >= PIN_LENGTH) return;
    Haptics.selectionAsync();
    setPin((p) => p + digit);
  };

  const backspace = () => {
    Haptics.selectionAsync();
    setPin((p) => p.slice(0, -1));
  };

  const KEYPAD = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'back'],
  ];

  return (
    <LiquidBackground>
      <View style={styles.container}>
        <View style={[styles.lockBubble, { backgroundColor: `${theme.primary}25`, borderColor: `${theme.primary}55` }]}>
          <Ionicons name="lock-closed" size={40} color={theme.primary} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Enter PIN</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Your diary and tasks are private.
        </Text>

        <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shake }] }]}>
          {[0, 1, 2, 3].map((i) => {
            const filled = pin.length > i;
            return (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: filled ? (error ? theme.danger : theme.primary) : 'transparent',
                    borderColor: error ? theme.danger : theme.glassBorder,
                  },
                ]}
              />
            );
          })}
        </Animated.View>

        <View style={styles.keypad}>
          {KEYPAD.map((row, ri) => (
            <View key={ri} style={styles.keypadRow}>
              {row.map((k, ki) => {
                if (k === '') return <View key={ki} style={styles.key} />;
                if (k === 'back') {
                  return (
                    <PressScale
                      key={ki}
                      style={styles.key}
                      onPress={backspace}
                      accessibilityLabel="Backspace"
                    >
                      <View style={[styles.keyInner, { backgroundColor: 'transparent' }]}>
                        <Ionicons name="backspace-outline" size={26} color={theme.text} />
                      </View>
                    </PressScale>
                  );
                }
                return (
                  <PressScale
                    key={ki}
                    style={styles.key}
                    onPress={() => press(k)}
                    minScale={0.92}
                  >
                    <View
                      style={[
                        styles.keyInner,
                        {
                          backgroundColor: theme.glass,
                          borderColor: theme.glassBorder,
                        },
                      ]}
                    >
                      <Text style={[styles.keyText, { color: theme.text }]}>{k}</Text>
                    </View>
                  </PressScale>
                );
              })}
            </View>
          ))}
        </View>

        {biometricEnabled && biometricAvailable && (
          <PressScale
            style={[styles.bioBtn, { borderColor: theme.glassBorder }]}
            onPress={tryBiometricUnlock}
          >
            <Ionicons name="finger-print" size={20} color={theme.primary} />
            <Text style={[styles.bioText, { color: theme.text }]}>Use biometric</Text>
          </PressScale>
        )}
      </View>
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32,
  },
  lockBubble: {
    width: 84, height: 84, borderRadius: 28, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 22,
  },
  title: { fontSize: 26, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 6, textAlign: 'center' },
  dotsRow: { flexDirection: 'row', gap: 16, marginTop: 36, marginBottom: 36 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5 },
  keypad: { width: '100%', maxWidth: 320 },
  keypadRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  key: { width: 78, height: 78, alignItems: 'center', justifyContent: 'center' },
  keyInner: {
    width: 72, height: 72, borderRadius: 24, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  keyText: { fontSize: 26, fontWeight: '700' },
  bioBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 999, borderWidth: 1, marginTop: 18,
  },
  bioText: { fontSize: 13, fontWeight: '700' },
});
