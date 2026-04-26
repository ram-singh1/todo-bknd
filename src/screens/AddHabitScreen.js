import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, Switch, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import LiquidBackground from '../components/LiquidBackground';
import GlassCard from '../components/GlassCard';
import GlassInput from '../components/GlassInput';
import GlassButton from '../components/GlassButton';
import PressScale from '../components/PressScale';
import IconSelector from '../components/IconSelector';
import api from '../api/client';
import { diaryColors } from '../themes';

// Skip loading expo-notifications inside Expo Go — SDK 53 removed Android push
// support there and the import logs a noisy error on every reload.
const IS_EXPO_GO =
  Constants.appOwnership === 'expo' &&
  Constants.executionEnvironment === 'storeClient';

let Notifications;
let notificationHandlerSet = false;

async function getNotifications() {
  if (IS_EXPO_GO) return null;
  if (!Notifications) {
    Notifications = await import('expo-notifications');
  }
  if (!notificationHandlerSet) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    notificationHandlerSet = true;
  }
  return Notifications;
}

const SUGGESTED_HABITS = [
  { emoji: '💧', name: 'Drink water', color: '#0EA5E9' },
  { emoji: '🏃', name: 'Daily walk', color: '#10B981' },
  { emoji: '📖', name: 'Read 10 pages', color: '#8B5CF6' },
  { emoji: '🧘', name: 'Meditate', color: '#A78BFA' },
  { emoji: '💪', name: 'Workout', color: '#F97316' },
  { emoji: '🛏️', name: 'Sleep early', color: '#3B82F6' },
  { emoji: '☀️', name: 'No phone in bed', color: '#FBBF24' },
  { emoji: '🥗', name: 'Eat veggies', color: '#22C55E' },
];

const INTERVAL_OPTIONS = [
  { label: 'Every 30 min', minutes: 30 },
  { label: 'Every 1 hr', minutes: 60 },
  { label: 'Every 2 hrs', minutes: 120 },
  { label: 'Every 3 hrs', minutes: 180 },
  { label: 'Every 4 hrs', minutes: 240 },
  { label: 'Every 6 hrs', minutes: 360 },
];

const DAILY_TIMES = [
  { label: '6:00 AM', hour: 6 },
  { label: '8:00 AM', hour: 8 },
  { label: '10:00 AM', hour: 10 },
  { label: '12:00 PM', hour: 12 },
  { label: '3:00 PM', hour: 15 },
  { label: '6:00 PM', hour: 18 },
  { label: '9:00 PM', hour: 21 },
];

// Sweet, warm reminder copy. Tries to feel like a caring friend nudging you,
// not a robot. The mix of Hindi-ish endearments + English is intentional —
// it's harder to swipe away something that sounds personal. Notifications
// pull from this same list so the system banner and the voice line stay
// emotionally consistent.
const VOICE_MESSAGES = [
  'Hey jaan, time to {habit}. Just a tiny step — you got this. 💛',
  'Mere pyaare, please {habit} right now. Future you will say thank you.',
  'A little love note from me to you — please {habit}. You\'re doing amazing. ✨',
  'Sunno, {habit} ka time ho gaya. Just five minutes — you can do this!',
  'Don\'t skip me yaar — quick {habit} and we\'re done. 🌸',
  'Soft reminder with a big hug — please {habit}. I believe in you. 💪',
  'Aaj bhi proud of you. Just {habit} once and your streak stays alive.',
  'Tiny habit, huge wins. Please {habit} now — I\'ll be cheering for you. 🥰',
];

// Per-habit reminder banner copy — short, affectionate, hard to ignore.
const REMINDER_TITLES = [
  '🌸 Time for {habit}',
  '💛 Don\'t skip me, please',
  '✨ Tiny step, big you',
  '🌟 Quick {habit}?',
  '🥰 A gentle nudge',
];

async function requestNotificationPermission() {
  const N = await getNotifications();
  if (!N) return false;
  const { status } = await N.requestPermissionsAsync();
  return status === 'granted';
}

async function scheduleHabitNotifications(habit, reminderConfig) {
  const N = await getNotifications();
  if (!N) {
    if (reminderConfig.enabled) {
      Alert.alert(
        'Reminders unavailable',
        'Habit reminders need a development build — they don\'t work in Expo Go on Android.'
      );
    }
    return;
  }

  // ── Android Channel Setup ──
  // Required for Android 8.0+ to show notifications
  if (Platform.OS === 'android') {
    await N.setNotificationChannelAsync('habit-reminders', {
      name: 'Habit Reminders',
      importance: N.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C63FF',
    });
  }

  // Cancel existing notifications for this habit
  const scheduled = await N.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.content.data?.habitId === habit._id) {
      await N.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  if (!reminderConfig.enabled) return;

  const granted = await requestNotificationPermission();
  if (!granted) {
    Alert.alert('Permission needed', 'Enable notifications in Settings to receive habit reminders.');
    return;
  }

  const titleTemplate = REMINDER_TITLES[Math.floor(Math.random() * REMINDER_TITLES.length)];
  const msgTemplate = VOICE_MESSAGES[Math.floor(Math.random() * VOICE_MESSAGES.length)];
  const title = `${habit.emoji} ${titleTemplate.replace('{habit}', habit.name)}`;
  const body = msgTemplate.replace('{habit}', habit.name);
  const data = { habitId: habit._id, habitName: habit.name, habitEmoji: habit.emoji };

  if (reminderConfig.type === 'daily') {
    await N.scheduleNotificationAsync({
      content: { title, body, sound: true, data, android: { channelId: 'habit-reminders' } },
      trigger: { hour: reminderConfig.dailyHour, minute: 0, repeats: true },
    });
  } else if (reminderConfig.type === 'interval') {
    await N.scheduleNotificationAsync({
      content: { title, body, sound: true, data, android: { channelId: 'habit-reminders' } },
      trigger: { seconds: reminderConfig.intervalMinutes * 60, repeats: true },
    });
  }

  // Immediate "you're set" confirmation so the user actually sees what
  // their reminder will look like, hears the voice once, and trusts it
  // is wired up. Fires within ~2 seconds of saving.
  await N.scheduleNotificationAsync({
    content: {
      title: `✅ Reminder set for ${habit.name}`,
      body: reminderConfig.type === 'daily'
        ? `I'll nudge you daily at ${reminderConfig.dailyHour}:00. See you then 💛`
        : `I'll check in every ${reminderConfig.intervalMinutes} min. You got this!`,
      sound: true,
      data: { ...data, isConfirmation: true },
      android: { channelId: 'habit-reminders' },
    },
    trigger: { seconds: 2 },
  });
}

export default function AddHabitScreen({ navigation, route }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { showPaywall } = useSubscription();

  const editing = route?.params?.habit;
  const [name, setName] = useState(editing?.name || '');
  const [description, setDescription] = useState(editing?.description || '');
  const [emoji, setEmoji] = useState(editing?.emoji || '🎯');
  const [color, setColor] = useState(editing?.color || '#10B981');
  const [frequency, setFrequency] = useState(editing?.frequency || 'daily');
  const [weeklyTarget, setWeeklyTarget] = useState(editing?.weeklyTarget || 5);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reminder state
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderType, setReminderType] = useState('daily'); // 'daily' | 'interval'
  const [dailyHour, setDailyHour] = useState(8);
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  // Custom interval input — only shown when the user taps "Custom".
  const [customIntervalOpen, setCustomIntervalOpen] = useState(false);
  const [customIntervalText, setCustomIntervalText] = useState(String(intervalMinutes));

  // True when the current intervalMinutes is one of the chip presets.
  const isPresetInterval = INTERVAL_OPTIONS.some((o) => o.minutes === intervalMinutes);

  const applyCustomInterval = () => {
    const n = parseInt(customIntervalText, 10);
    if (!Number.isFinite(n) || n < 1) {
      Alert.alert('Invalid number', 'Enter a whole number of minutes (minimum 1).');
      return;
    }
    if (n > 1440) {
      Alert.alert('Too long', 'For very long intervals use "Once a day" instead.');
      return;
    }
    setIntervalMinutes(n);
    setCustomIntervalOpen(false);
    Haptics.selectionAsync();
  };

  const applySuggestion = (s) => {
    Haptics.selectionAsync();
    setName(s.name);
    setEmoji(s.emoji);
    setColor(s.color);
  };

  const playVoicePreview = () => {
    const msgTemplate = VOICE_MESSAGES[Math.floor(Math.random() * VOICE_MESSAGES.length)];
    const msg = msgTemplate.replace('{habit}', name || 'your habit');
    Speech.stop();
    setTimeout(() => {
      Speech.speak(msg, {
        language: 'en-IN',
        pitch: 1.15,
        rate: 0.88,
      });
    }, 200);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // Fires a real system notification + voice line right now so the user
  // sees exactly what their daily/interval reminder will look and sound
  // like before saving the habit.
  const testReminderNow = async () => {
    const N = await getNotifications();
    if (!N) {
      Alert.alert(
        'Test unavailable',
        'Notification preview only works in a development build (not Expo Go on Android).'
      );
      return;
    }
    const granted = await requestNotificationPermission();
    if (!granted) {
      Alert.alert('Permission needed', 'Allow notifications to preview the reminder.');
      return;
    }
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('habit-reminders', {
        name: 'Habit Reminders',
        importance: N.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6C63FF',
      });
    }
    const titleTpl = REMINDER_TITLES[Math.floor(Math.random() * REMINDER_TITLES.length)];
    const msgTpl = VOICE_MESSAGES[Math.floor(Math.random() * VOICE_MESSAGES.length)];
    const habitName = name || 'your habit';
    const title = `${emoji} ${titleTpl.replace('{habit}', habitName)}`;
    const body = msgTpl.replace('{habit}', habitName);
    await N.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: { habitName, habitEmoji: emoji, isPreview: true },
        android: { channelId: 'habit-reminders' },
      },
      trigger: { seconds: 1 },
    });
    if (voiceEnabled) playVoicePreview();
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Give your habit a short name first.');
      return;
    }
    setSaving(true);

    // Step 1: persist to the backend. Notification scheduling is intentionally
    // moved out of this try/catch — a failed local notification (denied
    // permission, Expo Go on Android) must not surface as "Save failed" when
    // the habit actually saved fine on the server.
    let savedHabit = null;
    try {
      const body = {
        name: name.trim(),
        description: description.trim(),
        emoji,
        color,
        frequency,
        weeklyTarget,
        reminder: reminderEnabled
          ? { enabled: true, type: reminderType, dailyHour, intervalMinutes, voice: voiceEnabled }
          : { enabled: false },
      };

      if (editing) {
        const res = await api.put(`/habits/${editing._id}`, body);
        savedHabit = res.data.habit || { ...editing, ...body };
      } else {
        const res = await api.post('/habits', body);
        savedHabit = res.data.habit || body;
      }
    } catch (e) {
      setSaving(false);
      if (e?.response?.data?.code === 'PREMIUM_REQUIRED') {
        navigation.goBack();
        showPaywall('habits', e.response.data.message);
        return;
      }
      // Surface the real cause. The axios interceptor already decorates
      // network/timeout errors via error.message, so prefer that over a
      // generic fallback. ECONNABORTED == axios timeout.
      const isTimeout = e?.code === 'ECONNABORTED';
      const isNetwork = !e?.response && !!e?.request;
      const serverMsg = e?.response?.data?.message;
      const validationMsg = e?.response?.data?.errors?.[0]?.msg;
      let msg;
      if (isTimeout) {
        msg = 'The server didn\'t respond in time. Check your internet connection or try again in a moment.';
      } else if (isNetwork) {
        msg = 'Couldn\'t reach the server. Check your Wi-Fi / mobile data and try again.';
      } else {
        msg = validationMsg || serverMsg || e?.message || 'Could not save habit';
      }
      Alert.alert('Save failed', msg);
      return;
    }

    // Step 2: schedule notifications (best-effort — never blocks navigation).
    if (reminderEnabled && savedHabit?._id) {
      try {
        await scheduleHabitNotifications(savedHabit, {
          enabled: true,
          type: reminderType,
          dailyHour,
          intervalMinutes,
        });
      } catch (e) {
        console.warn('Habit reminder scheduling failed:', e?.message || e);
      }
    }

    setSaving(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    navigation.goBack();
  };

  return (
    <LiquidBackground>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="close" size={26} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {editing ? 'Edit habit' : 'New habit'}
        </Text>
        <TouchableOpacity onPress={save} disabled={!name.trim() || saving}>
          <Text style={[styles.saveText, { color: theme.primary, opacity: name.trim() ? 1 : 0.4 }]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 60 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero: emoji + name */}
          <GlassCard variant="solid" style={styles.heroCard}>
            <View style={styles.heroTop}>
              <PressScale
                style={[styles.emojiBubble, { backgroundColor: `${color}25`, borderColor: `${color}55` }]}
                onPress={() => setShowIconPicker(true)}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </PressScale>
              <View style={{ flex: 1 }}>
                <GlassInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Drink 2L water"
                  maxLength={80}
                  style={{ marginBottom: 0 }}
                />
              </View>
            </View>

            <GlassInput
              value={description}
              onChangeText={setDescription}
              placeholder="Why is this important to you? (optional)"
              multiline
              numberOfLines={2}
              maxLength={240}
              style={{ marginTop: 12, marginBottom: 0 }}
            />
          </GlassCard>

          {/* Suggestions */}
          {!editing && !name && (
            <>
              <Text style={[styles.miniLabel, { color: theme.textMuted }]}>SUGGESTIONS</Text>
              <View style={styles.sugRow}>
                {SUGGESTED_HABITS.map((s) => (
                  <PressScale
                    key={s.name}
                    style={[styles.sugChip, { backgroundColor: `${s.color}1A`, borderColor: `${s.color}55` }]}
                    onPress={() => applySuggestion(s)}
                  >
                    <Text style={styles.sugEmoji}>{s.emoji}</Text>
                    <Text style={[styles.sugText, { color: theme.text }]}>{s.name}</Text>
                  </PressScale>
                ))}
              </View>
            </>
          )}

          {/* Frequency */}
          <Text style={[styles.miniLabel, { color: theme.textMuted }]}>FREQUENCY</Text>
          <View style={styles.freqRow}>
            {[
              { key: 'daily', label: 'Daily', icon: 'calendar' },
              { key: 'weekly', label: 'Weekly', icon: 'calendar-outline' },
            ].map((f) => {
              const active = frequency === f.key;
              return (
                <PressScale
                  key={f.key}
                  style={[
                    styles.freqChip,
                    {
                      backgroundColor: active ? `${theme.primary}25` : theme.inputBg,
                      borderColor: active ? theme.primary : 'transparent',
                    },
                  ]}
                  onPress={() => setFrequency(f.key)}
                >
                  <Ionicons name={f.icon} size={16} color={active ? theme.primary : theme.textMuted} />
                  <Text style={[styles.freqText, { color: active ? theme.primary : theme.textSecondary }]}>
                    {f.label}
                  </Text>
                </PressScale>
              );
            })}
          </View>

          {frequency === 'weekly' && (
            <>
              <Text style={[styles.miniLabel, { color: theme.textMuted }]}>TIMES PER WEEK</Text>
              <View style={styles.weeklyRow}>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => {
                  const active = weeklyTarget === n;
                  return (
                    <PressScale
                      key={n}
                      style={[
                        styles.weeklyChip,
                        {
                          backgroundColor: active ? theme.primary : theme.inputBg,
                          borderColor: active ? theme.primary : 'transparent',
                        },
                      ]}
                      onPress={() => setWeeklyTarget(n)}
                    >
                      <Text style={[styles.weeklyText, { color: active ? '#FFFFFF' : theme.textSecondary }]}>
                        {n}×
                      </Text>
                    </PressScale>
                  );
                })}
              </View>
            </>
          )}

          {/* ── Reminder Section ── */}
          <GlassCard variant="solid" style={styles.reminderCard}>
            <View style={styles.reminderHeader}>
              <View style={styles.reminderHeaderLeft}>
                <View style={[styles.reminderIconBg, { backgroundColor: `${theme.primary}22` }]}>
                  <Ionicons name="notifications" size={18} color={theme.primary} />
                </View>
                <View>
                  <Text style={[styles.reminderTitle, { color: theme.text }]}>Smart Reminders</Text>
                  <Text style={[styles.reminderSub, { color: theme.textMuted }]}>
                    Get notified so you never miss it
                  </Text>
                </View>
              </View>
              <Switch
                value={reminderEnabled}
                onValueChange={(v) => { setReminderEnabled(v); Haptics.selectionAsync(); }}
                trackColor={{ false: theme.inputBg, true: `${theme.primary}80` }}
                thumbColor={reminderEnabled ? theme.primary : theme.textMuted}
              />
            </View>

            {reminderEnabled && (
              <>
                {/* Reminder type toggle */}
                <Text style={[styles.miniLabel, { color: theme.textMuted, marginTop: 14 }]}>REMINDER TYPE</Text>
                <View style={styles.freqRow}>
                  {[
                    { key: 'daily', label: 'Once a day', icon: 'sunny' },
                    { key: 'interval', label: 'Repeat', icon: 'repeat' },
                  ].map((rt) => {
                    const active = reminderType === rt.key;
                    return (
                      <PressScale
                        key={rt.key}
                        style={[
                          styles.freqChip,
                          {
                            backgroundColor: active ? `${theme.primary}25` : theme.inputBg,
                            borderColor: active ? theme.primary : 'transparent',
                          },
                        ]}
                        onPress={() => { setReminderType(rt.key); Haptics.selectionAsync(); }}
                      >
                        <Ionicons name={rt.icon} size={16} color={active ? theme.primary : theme.textMuted} />
                        <Text style={[styles.freqText, { color: active ? theme.primary : theme.textSecondary }]}>
                          {rt.label}
                        </Text>
                      </PressScale>
                    );
                  })}
                </View>

                {/* Daily time picker */}
                {reminderType === 'daily' && (
                  <>
                    <Text style={[styles.miniLabel, { color: theme.textMuted }]}>REMIND ME AT</Text>
                    <View style={styles.timeGrid}>
                      {DAILY_TIMES.map((t) => {
                        const active = dailyHour === t.hour;
                        return (
                          <PressScale
                            key={t.hour}
                            style={[
                              styles.timeChip,
                              {
                                backgroundColor: active ? theme.primary : theme.inputBg,
                                borderColor: active ? theme.primary : `${theme.glassBorder}`,
                              },
                            ]}
                            onPress={() => { setDailyHour(t.hour); Haptics.selectionAsync(); }}
                          >
                            <Text style={[styles.timeChipText, { color: active ? '#FFF' : theme.textSecondary }]}>
                              {t.label}
                            </Text>
                          </PressScale>
                        );
                      })}
                    </View>
                  </>
                )}

                {/* Interval picker */}
                {reminderType === 'interval' && (
                  <>
                    <Text style={[styles.miniLabel, { color: theme.textMuted }]}>REMIND EVERY</Text>
                    <View style={styles.intervalGrid}>
                      {INTERVAL_OPTIONS.map((opt) => {
                        const active = intervalMinutes === opt.minutes && !customIntervalOpen;
                        return (
                          <PressScale
                            key={opt.minutes}
                            style={[
                              styles.intervalChip,
                              {
                                backgroundColor: active ? theme.primary : theme.inputBg,
                                borderColor: active ? theme.primary : theme.glassBorder,
                              },
                            ]}
                            onPress={() => {
                              setIntervalMinutes(opt.minutes);
                              setCustomIntervalOpen(false);
                              Haptics.selectionAsync();
                            }}
                          >
                            <Text style={[styles.intervalText, { color: active ? '#FFF' : theme.textSecondary }]}>
                              {opt.label}
                            </Text>
                          </PressScale>
                        );
                      })}
                      {/* Custom chip — opens an inline numeric input. Active
                          when the current value isn't one of the presets. */}
                      <PressScale
                        style={[
                          styles.intervalChip,
                          {
                            backgroundColor:
                              customIntervalOpen || !isPresetInterval ? theme.primary : theme.inputBg,
                            borderColor:
                              customIntervalOpen || !isPresetInterval ? theme.primary : theme.glassBorder,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                          },
                        ]}
                        onPress={() => {
                          setCustomIntervalText(String(intervalMinutes));
                          setCustomIntervalOpen((v) => !v);
                          Haptics.selectionAsync();
                        }}
                      >
                        <Ionicons
                          name="create-outline"
                          size={13}
                          color={customIntervalOpen || !isPresetInterval ? '#FFF' : theme.textSecondary}
                        />
                        <Text
                          style={[
                            styles.intervalText,
                            { color: customIntervalOpen || !isPresetInterval ? '#FFF' : theme.textSecondary },
                          ]}
                        >
                          {!isPresetInterval && !customIntervalOpen
                            ? `Every ${intervalMinutes} min`
                            : 'Custom'}
                        </Text>
                      </PressScale>
                    </View>

                    {customIntervalOpen && (
                      <View
                        style={[
                          styles.customRow,
                          { backgroundColor: theme.inputBg, borderColor: theme.glassBorder },
                        ]}
                      >
                        <Text style={[styles.customLabel, { color: theme.textSecondary }]}>
                          Every
                        </Text>
                        <TextInput
                          value={customIntervalText}
                          onChangeText={(t) => setCustomIntervalText(t.replace(/[^0-9]/g, ''))}
                          onSubmitEditing={applyCustomInterval}
                          keyboardType="number-pad"
                          maxLength={4}
                          placeholder="15"
                          placeholderTextColor={theme.textMuted}
                          style={[styles.customInput, { color: theme.text, borderColor: theme.glassBorder }]}
                        />
                        <Text style={[styles.customLabel, { color: theme.textSecondary }]}>
                          minutes
                        </Text>
                        <PressScale
                          style={[styles.customApplyBtn, { backgroundColor: theme.primary }]}
                          onPress={applyCustomInterval}
                        >
                          <Ionicons name="checkmark" size={16} color="#FFF" />
                          <Text style={styles.customApplyText}>Set</Text>
                        </PressScale>
                      </View>
                    )}

                    <View style={[styles.infoBox, { backgroundColor: `${theme.primary}12`, borderColor: `${theme.primary}30`, marginTop: 10 }]}>
                      <Ionicons name="information-circle" size={14} color={theme.primary} />
                      <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                        Example: "{name || 'Drink water'}" → notify every {intervalMinutes} min
                      </Text>
                    </View>
                  </>
                )}

                {/* Voice reminder */}
                <View style={[styles.voiceRow, { borderTopColor: theme.glassBorder }]}>
                  <View style={styles.voiceLeft}>
                    <View style={[styles.reminderIconBg, { backgroundColor: `${theme.accent}22` }]}>
                      <Ionicons name="volume-high" size={16} color={theme.accent} />
                    </View>
                    <View>
                      <Text style={[styles.voiceTitle, { color: theme.text }]}>Voice Reminder</Text>
                      <Text style={[styles.voiceSub, { color: theme.textMuted }]}>Sweet audio nudge 🎵</Text>
                    </View>
                  </View>
                  <Switch
                    value={voiceEnabled}
                    onValueChange={(v) => { setVoiceEnabled(v); Haptics.selectionAsync(); }}
                    trackColor={{ false: theme.inputBg, true: `${theme.accent}80` }}
                    thumbColor={voiceEnabled ? theme.accent : theme.textMuted}
                  />
                </View>

                {voiceEnabled && (
                  <PressScale
                    style={[styles.previewBtn, { backgroundColor: `${theme.accent}20`, borderColor: `${theme.accent}50` }]}
                    onPress={playVoicePreview}
                  >
                    <Ionicons name="play-circle" size={18} color={theme.accent} />
                    <Text style={[styles.previewBtnText, { color: theme.accent }]}>Preview voice reminder</Text>
                  </PressScale>
                )}

                {/* Live test — fires the actual banner + voice the user
                    will get later, so they can confirm it's compelling. */}
                <PressScale
                  style={[styles.previewBtn, { backgroundColor: `${theme.primary}20`, borderColor: `${theme.primary}55` }]}
                  onPress={testReminderNow}
                >
                  <Ionicons name="notifications" size={18} color={theme.primary} />
                  <Text style={[styles.previewBtnText, { color: theme.primary }]}>
                    Test reminder now
                  </Text>
                </PressScale>
                <Text style={[styles.testHint, { color: theme.textMuted }]}>
                  Sends a real notification + voice in 1 second so you can feel exactly how it'll nudge you. 💛
                </Text>
              </>
            )}
          </GlassCard>

          {/* Color picker */}
          <Text style={[styles.miniLabel, { color: theme.textMuted }]}>COLOR</Text>
          <View style={styles.colorRow}>
            {diaryColors.map((c) => (
              <PressScale
                key={c}
                style={[
                  styles.colorDot,
                  {
                    backgroundColor: c,
                    borderColor: color === c ? theme.text : 'transparent',
                    borderWidth: color === c ? 2 : 0,
                  },
                ]}
                onPress={() => { Haptics.selectionAsync(); setColor(c); }}
              />
            ))}
          </View>

          <GlassButton
            title={saving ? 'Saving...' : editing ? 'Save changes' : 'Create habit'}
            onPress={save}
            loading={saving}
            disabled={!name.trim()}
            icon="checkmark-circle"
            fullWidth
            size="large"
            style={{ marginTop: 24 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <IconSelector
        visible={showIconPicker}
        onClose={() => setShowIconPicker(false)}
        onSelect={(e) => setEmoji(e)}
      />
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 10,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  saveText: { fontSize: 16, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 6 },
  scroll: { paddingHorizontal: 18 },

  heroCard: { padding: 16, marginBottom: 18 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emojiBubble: {
    width: 64, height: 64, borderRadius: 18, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  emojiText: { fontSize: 32 },

  miniLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8, marginTop: 4 },
  sugRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  sugChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1,
  },
  sugEmoji: { fontSize: 14 },
  sugText: { fontSize: 12, fontWeight: '700' },

  freqRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  freqChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 14, borderWidth: 1,
  },
  freqText: { fontSize: 13, fontWeight: '700' },

  weeklyRow: { flexDirection: 'row', gap: 6, marginBottom: 18 },
  weeklyChip: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    borderRadius: 12, borderWidth: 1,
  },
  weeklyText: { fontSize: 13, fontWeight: '800' },

  // Reminder card
  reminderCard: { padding: 16, marginBottom: 18 },
  reminderHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reminderHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  reminderIconBg: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  reminderTitle: { fontSize: 15, fontWeight: '800' },
  reminderSub: { fontSize: 12, marginTop: 1 },

  // Time grid
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  timeChip: {
    paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 12, borderWidth: 1,
  },
  timeChipText: { fontSize: 12, fontWeight: '700' },

  // Interval grid
  intervalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  intervalChip: {
    paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 12, borderWidth: 1,
  },
  intervalText: { fontSize: 12, fontWeight: '700' },

  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  customLabel: { fontSize: 12, fontWeight: '700' },
  customInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    minWidth: 60,
    maxWidth: 80,
  },
  customApplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  customApplyText: { color: '#FFF', fontSize: 12, fontWeight: '800' },

  infoBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, marginBottom: 12,
  },
  infoText: { fontSize: 12, flex: 1, lineHeight: 16 },

  // Voice
  voiceRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, paddingTop: 14, marginTop: 8,
  },
  voiceLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  voiceTitle: { fontSize: 14, fontWeight: '700' },
  voiceSub: { fontSize: 11, marginTop: 1 },
  previewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginTop: 12,
  },
  previewBtnText: { fontSize: 13, fontWeight: '700' },
  testHint: { fontSize: 11, lineHeight: 15, textAlign: 'center', marginTop: 8 },

  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 6 },
  colorDot: { width: 36, height: 36, borderRadius: 18 },
});
