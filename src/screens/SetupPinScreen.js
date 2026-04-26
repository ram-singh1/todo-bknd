import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, Animated, Easing, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAppLock } from '../contexts/AppLockContext';
import LiquidBackground from '../components/LiquidBackground';
import PressScale from '../components/PressScale';

const PIN_LENGTH = 4;

// Two-step PIN setup: enter, then re-enter to confirm. If they don't match
// we shake and reset back to step 1.
export default function SetupPinScreen({ navigation }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { setPin: persistPin } = useAppLock();
  const [step, setStep] = useState(1); // 1 = enter, 2 = confirm
  const [first, setFirst] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;

  const value = step === 1 ? first : confirm;
  const setValue = step === 1 ? setFirst : setConfirm;

  useEffect(() => {
    if (step === 1 && first.length === PIN_LENGTH) {
      // Move to confirmation step.
      setTimeout(() => setStep(2), 180);
    }
    if (step === 2 && confirm.length === PIN_LENGTH) {
      if (confirm === first) {
        (async () => {
          try {
            await persistPin(first);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('PIN set', 'Your app is now protected. You\'ll be asked for the PIN when you reopen the app.');
            navigation.goBack();
          } catch (e) {
            Alert.alert('Error', e.message || 'Could not save PIN.');
          }
        })();
      } else {
        setError(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Animated.sequence([
          Animated.timing(shake, { toValue: 10, duration: 60, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(shake, { toValue: -10, duration: 60, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(shake, { toValue: 6, duration: 60, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(shake, { toValue: 0, duration: 60, easing: Easing.linear, useNativeDriver: true }),
        ]).start(() => {
          setFirst('');
          setConfirm('');
          setStep(1);
          setError(false);
        });
      }
    }
  }, [first, confirm, step, persistPin, navigation, shake]);

  const press = (digit) => {
    if (value.length >= PIN_LENGTH) return;
    Haptics.selectionAsync();
    setValue((v) => v + digit);
  };
  const backspace = () => {
    Haptics.selectionAsync();
    setValue((v) => v.slice(0, -1));
  };

  const KEYPAD = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'back'],
  ];

  return (
    <LiquidBackground>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="close" size={26} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Set up PIN</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.container}>
        <View style={[styles.lockBubble, { backgroundColor: `${theme.primary}25`, borderColor: `${theme.primary}55` }]}>
          <Ionicons name="shield-checkmark" size={40} color={theme.primary} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>
          {step === 1 ? 'Choose a 4-digit PIN' : 'Re-enter to confirm'}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          {step === 1
            ? 'You\'ll need this every time you open the app.'
            : 'Type the same PIN once more.'}
        </Text>

        <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shake }] }]}>
          {[0, 1, 2, 3].map((i) => {
            const filled = value.length > i;
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
                    <PressScale key={ki} style={styles.key} onPress={backspace}>
                      <View style={styles.keyInner}>
                        <Ionicons name="backspace-outline" size={26} color={theme.text} />
                      </View>
                    </PressScale>
                  );
                }
                return (
                  <PressScale key={ki} style={styles.key} onPress={() => press(k)} minScale={0.92}>
                    <View style={[styles.keyInner, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
                      <Text style={[styles.keyText, { color: theme.text }]}>{k}</Text>
                    </View>
                  </PressScale>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingBottom: 10,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  container: { flex: 1, alignItems: 'center', paddingHorizontal: 32, paddingTop: 16 },
  lockBubble: {
    width: 80, height: 80, borderRadius: 26, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 16 },
  dotsRow: { flexDirection: 'row', gap: 16, marginTop: 28, marginBottom: 28 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5 },
  keypad: { width: '100%', maxWidth: 320 },
  keypadRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  key: { width: 78, height: 78, alignItems: 'center', justifyContent: 'center' },
  keyInner: {
    width: 72, height: 72, borderRadius: 24, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  keyText: { fontSize: 26, fontWeight: '700' },
});
