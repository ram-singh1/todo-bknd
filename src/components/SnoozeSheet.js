import React, { useState } from 'react';
import {
  StyleSheet, View, Text, Modal, TouchableOpacity, TextInput, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import PressScale from './PressScale';

const PRESETS = [
  { label: '5 min', mins: 5, icon: 'time-outline' },
  { label: '10 min', mins: 10, icon: 'time-outline' },
  { label: '30 min', mins: 30, icon: 'time-outline' },
  { label: '1 hour', mins: 60, icon: 'hourglass-outline' },
  { label: 'Tomorrow', mins: 60 * 24, icon: 'sunny-outline' },
  { label: 'Next week', mins: 60 * 24 * 7, icon: 'calendar-outline' },
];

/**
 * Bottom-sheet picker for snoozing a task. Calls onSnooze(mins) with the
 * chosen offset in minutes. Caller decides what to do (typically: bump
 * dueDate by `mins` and clear reminder.sent so the notification re-fires).
 */
export default function SnoozeSheet({ visible, onClose, onSnooze, taskTitle }) {
  const { theme } = useTheme();
  const [custom, setCustom] = useState('');

  const pick = (mins) => {
    Haptics.selectionAsync();
    onSnooze(mins);
    onClose();
  };

  const submitCustom = () => {
    const n = parseInt(custom, 10);
    if (!Number.isFinite(n) || n <= 0) return;
    pick(n);
    setCustom('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <BlurView
          intensity={20}
          tint={theme.mode === 'light' ? 'light' : 'dark'}
          style={StyleSheet.absoluteFill}
        />
      </TouchableOpacity>
      <View style={[styles.sheet, { backgroundColor: theme.surface, borderTopColor: theme.glassBorder }]}>
        <View style={[styles.handle, { backgroundColor: theme.mode === 'light' ? 'rgba(15,23,42,0.2)' : 'rgba(255,255,255,0.2)' }]} />
        <View style={styles.headerRow}>
          <Ionicons name="alarm-outline" size={22} color={theme.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]}>Snooze</Text>
            {taskTitle ? (
              <Text style={[styles.subtitle, { color: theme.textMuted }]} numberOfLines={1}>
                {taskTitle}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.grid}>
          {PRESETS.map((p) => (
            <PressScale
              key={p.label}
              style={[
                styles.tile,
                { backgroundColor: theme.inputBg, borderColor: theme.glassBorder },
              ]}
              onPress={() => pick(p.mins)}
            >
              <Ionicons name={p.icon} size={22} color={theme.primary} />
              <Text style={[styles.tileText, { color: theme.text }]}>{p.label}</Text>
            </PressScale>
          ))}
        </View>

        <Text style={[styles.miniLabel, { color: theme.textMuted }]}>CUSTOM (MINUTES)</Text>
        <View style={[styles.customRow, { backgroundColor: theme.inputBg, borderColor: theme.glassBorder }]}>
          <TextInput
            value={custom}
            onChangeText={setCustom}
            placeholder="e.g. 45"
            placeholderTextColor={theme.textMuted}
            keyboardType="numeric"
            style={[styles.customInput, { color: theme.text }]}
            underlineColorAndroid="transparent"
            selectionColor={theme.primary}
          />
          <PressScale
            style={[
              styles.customCta,
              { backgroundColor: custom ? theme.primary : `${theme.primary}55` },
            ]}
            onPress={submitCustom}
          >
            <Text style={styles.customCtaText}>Snooze</Text>
          </PressScale>
        </View>

        <View style={{ height: Platform.OS === 'ios' ? 24 : 12 }} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 24,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 16,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  title: { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  tile: {
    width: '31%', alignItems: 'center', paddingVertical: 14,
    borderRadius: 16, borderWidth: 1, gap: 6,
  },
  tileText: { fontSize: 12, fontWeight: '800' },
  miniLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8 },
  customRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 18, borderWidth: 1, paddingLeft: 16, paddingRight: 6, paddingVertical: 6,
    gap: 8,
  },
  customInput: { flex: 1, fontSize: 16, paddingVertical: 12 },
  customCta: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14 },
  customCtaText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
});
