import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

const IS_EXPO_GO = Constants.appOwnership === 'expo' && Constants.executionEnvironment === 'storeClient';
let Notifications;
let notificationHandlerSet = false;

const getNotifications = async () => {
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
};

// Stored notification IDs so we can cancel before re-scheduling.
const KEY_DAILY_SUMMARY = 'notif_daily_summary_id';
const KEY_EVENING_REFLECTION = 'notif_evening_reflection_id';
const KEY_STREAK_WARNING = 'notif_streak_warning_id';
const KEY_WEEKLY_REPORT = 'notif_weekly_report_id';
// Per-task smart-repeat IDs are stored under: notif_smart_<todoId> = JSON array.
const KEY_SMART_PREFIX = 'notif_smart_';
// Times the user has chosen for the recurring notifications. Stored as
// "HH:MM" so a re-schedule (after the user changes them) reuses the value.
const KEY_DAILY_TIME = 'notif_daily_time';
const KEY_EVENING_TIME = 'notif_evening_time';
const DEFAULT_DAILY_TIME = '08:00';
const DEFAULT_EVENING_TIME = '21:00';
const DEFAULT_STREAK_TIME = '20:00';
// Sunday at 09:00. JS Date weekday is 0=Sun.
const WEEKLY_REPORT_WEEKDAY = 0;
const WEEKLY_REPORT_HOUR = 9;
const WEEKLY_REPORT_MIN = 0;
// How many follow-ups smart-repeat schedules for a single task. Higher
// numbers create notification fatigue and risk hitting platform caps.
const SMART_REPEAT_MAX = 6;

export const requestPermissions = async () => {
  const Notifications = await getNotifications();
  if (!Notifications) return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C63FF',
    });
    await Notifications.setNotificationChannelAsync('summary', {
      name: 'Daily summary & reflection',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#6C63FF',
    });
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

export const scheduleReminder = async (title, body, scheduledTime) => {
  const granted = await requestPermissions();
  if (!granted) return null;

  const trigger = new Date(scheduledTime);
  if (trigger <= new Date()) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger,
  });

  return id;
};

export const cancelNotification = async (id) => {
  if (!id) return;
  const Notifications = await getNotifications();
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(id);
};

function parseHM(hm) {
  const [h, m] = (hm || '').split(':').map((n) => parseInt(n, 10));
  return {
    hour: Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : 8,
    minute: Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 0,
  };
}

// ── Daily summary (morning) ─────────────────────────────────────────────
// Fetches today's pending tasks from the server when the user enables it,
// then schedules a repeating daily notification. Body is a snapshot at
// schedule time — if you want it always-fresh, the right answer is a
// background task, but those need extra Expo configuration.

export const scheduleDailySummary = async (time = DEFAULT_DAILY_TIME) => {
  const granted = await requestPermissions();
  if (!granted) return false;

  // Cancel any existing one before re-creating to avoid duplicates.
  const oldId = await AsyncStorage.getItem(KEY_DAILY_SUMMARY);
  if (oldId) {
    try { await Notifications.cancelScheduledNotificationAsync(oldId); } catch {}
  }

  // Best-effort: fetch a count for the body. If offline, fall back to a
  // generic message — better than skipping the notification entirely.
  let body = 'Open the app to see what\'s on today.';
  try {
    const res = await api.get('/todos/stats');
    const pending = res.data.stats?.pending ?? 0;
    body = pending === 0
      ? 'No tasks pending. A clean slate for today ✨'
      : `You have ${pending} task${pending === 1 ? '' : 's'} for today.`;
  } catch {}

  const { hour, minute } = parseHM(time);
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌅 Good morning',
      body,
      sound: false,
      ...(Platform.OS === 'android' ? { channelId: 'summary' } : {}),
    },
    trigger: { hour, minute, repeats: true },
  });
  await AsyncStorage.setItem(KEY_DAILY_SUMMARY, id);
  await AsyncStorage.setItem(KEY_DAILY_TIME, time);
  return true;
};

export const cancelDailySummary = async () => {
  const id = await AsyncStorage.getItem(KEY_DAILY_SUMMARY);
  if (id) {
    try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
    await AsyncStorage.removeItem(KEY_DAILY_SUMMARY);
  }
};

// ── Evening reflection nudge ────────────────────────────────────────────

export const scheduleEveningReflection = async (time = DEFAULT_EVENING_TIME) => {
  const granted = await requestPermissions();
  if (!granted) return false;

  const oldId = await AsyncStorage.getItem(KEY_EVENING_REFLECTION);
  if (oldId) {
    try { await Notifications.cancelScheduledNotificationAsync(oldId); } catch {}
  }

  const { hour, minute } = parseHM(time);
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌙 A minute for yourself',
      body: 'How was today? Tap to write a quick diary entry.',
      sound: false,
      ...(Platform.OS === 'android' ? { channelId: 'summary' } : {}),
    },
    trigger: { hour, minute, repeats: true },
  });
  await AsyncStorage.setItem(KEY_EVENING_REFLECTION, id);
  await AsyncStorage.setItem(KEY_EVENING_TIME, time);
  return true;
};

export const cancelEveningReflection = async () => {
  const id = await AsyncStorage.getItem(KEY_EVENING_REFLECTION);
  if (id) {
    try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
    await AsyncStorage.removeItem(KEY_EVENING_REFLECTION);
  }
};

// ── Streak warning (evening, daily) ─────────────────────────────────────
// Fires every evening with a generic streak-protection nudge. The message
// is intentionally not gated on actual activity because that would need a
// background fetch (which requires extra Expo config). Users who already
// checked in still get a positive "keep it up" framing.

export const scheduleStreakWarning = async (time = DEFAULT_STREAK_TIME) => {
  const granted = await requestPermissions();
  if (!granted) return false;

  const oldId = await AsyncStorage.getItem(KEY_STREAK_WARNING);
  if (oldId) {
    try { await Notifications.cancelScheduledNotificationAsync(oldId); } catch {}
  }

  const { hour, minute } = parseHM(time);
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔥 Don\'t break your streak',
      body: 'Quick check-in or a short diary entry keeps the chain alive.',
      sound: false,
      ...(Platform.OS === 'android' ? { channelId: 'summary' } : {}),
    },
    trigger: { hour, minute, repeats: true },
  });
  await AsyncStorage.setItem(KEY_STREAK_WARNING, id);
  return true;
};

export const cancelStreakWarning = async () => {
  const id = await AsyncStorage.getItem(KEY_STREAK_WARNING);
  if (id) {
    try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
    await AsyncStorage.removeItem(KEY_STREAK_WARNING);
  }
};

// ── Weekly report (Sunday 09:00) ────────────────────────────────────────
// Body is a snapshot at schedule time of last 7 days totals. For always-
// fresh content you'd need a background-fetch task — out of scope here.

export const scheduleWeeklyReport = async () => {
  const granted = await requestPermissions();
  if (!granted) return false;

  const oldId = await AsyncStorage.getItem(KEY_WEEKLY_REPORT);
  if (oldId) {
    try { await Notifications.cancelScheduledNotificationAsync(oldId); } catch {}
  }

  // Best-effort body snapshot.
  let body = 'See how the past 7 days went. Tap to open Insights.';
  try {
    const res = await api.get('/analytics/summary');
    const s = res.data.summary;
    const completed = s?.completedThisWeek ?? s?.tasks?.completedThisWeek;
    const streak = s?.streak?.current ?? 0;
    if (Number.isFinite(completed)) {
      body = `${completed} tasks done · ${streak}-day streak. Tap to see your week.`;
    }
  } catch {}

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '📊 Your week in review',
      body,
      sound: false,
      ...(Platform.OS === 'android' ? { channelId: 'summary' } : {}),
    },
    // Weekly trigger uses weekday 1-7 in Expo (1=Sun .. 7=Sat).
    trigger: {
      weekday: WEEKLY_REPORT_WEEKDAY + 1,
      hour: WEEKLY_REPORT_HOUR,
      minute: WEEKLY_REPORT_MIN,
      repeats: true,
    },
  });
  await AsyncStorage.setItem(KEY_WEEKLY_REPORT, id);
  return true;
};

export const cancelWeeklyReport = async () => {
  const id = await AsyncStorage.getItem(KEY_WEEKLY_REPORT);
  if (id) {
    try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
    await AsyncStorage.removeItem(KEY_WEEKLY_REPORT);
  }
};

// ── Smart repeat reminders ──────────────────────────────────────────────
// "Nag me every N minutes until I mark it done." Schedules up to
// SMART_REPEAT_MAX one-shot notifications spaced N minutes apart starting
// from the task's reminder time. IDs are stored under the todo._id so the
// app can cancel them when the task gets completed.

export const scheduleSmartRepeat = async (todoId, title, firstFireAt, intervalMinutes) => {
  const granted = await requestPermissions();
  if (!granted) return [];
  if (!todoId || !firstFireAt || !intervalMinutes) return [];

  // Cancel any prior smart-repeat for this todo before scheduling new ones.
  await cancelSmartRepeat(todoId);

  const ids = [];
  const start = new Date(firstFireAt).getTime();
  const now = Date.now();
  for (let i = 0; i < SMART_REPEAT_MAX; i++) {
    const fireAt = new Date(start + i * intervalMinutes * 60000);
    if (fireAt.getTime() <= now) continue;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: i === 0 ? `🔔 ${title}` : `🔁 Still pending: ${title}`,
        body: i === 0
          ? 'This task is due. Tap to open.'
          : `Reminder ${i + 1}/${SMART_REPEAT_MAX}. Mark it done to stop the nudges.`,
        sound: true,
      },
      trigger: fireAt,
    });
    ids.push(id);
  }
  if (ids.length > 0) {
    await AsyncStorage.setItem(KEY_SMART_PREFIX + todoId, JSON.stringify(ids));
  }
  return ids;
};

export const cancelSmartRepeat = async (todoId) => {
  if (!todoId) return;
  const raw = await AsyncStorage.getItem(KEY_SMART_PREFIX + todoId);
  if (!raw) return;
  try {
    const ids = JSON.parse(raw);
    for (const id of ids || []) {
      try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
    }
  } catch {}
  await AsyncStorage.removeItem(KEY_SMART_PREFIX + todoId);
};

// ── Settings reads these to render toggle state ─────────────────────────
export const getNotificationPrefs = async () => {
  const [dailyId, eveningId, streakId, weeklyId, dailyTime, eveningTime] = await Promise.all([
    AsyncStorage.getItem(KEY_DAILY_SUMMARY),
    AsyncStorage.getItem(KEY_EVENING_REFLECTION),
    AsyncStorage.getItem(KEY_STREAK_WARNING),
    AsyncStorage.getItem(KEY_WEEKLY_REPORT),
    AsyncStorage.getItem(KEY_DAILY_TIME),
    AsyncStorage.getItem(KEY_EVENING_TIME),
  ]);
  return {
    dailyEnabled: !!dailyId,
    eveningEnabled: !!eveningId,
    streakEnabled: !!streakId,
    weeklyEnabled: !!weeklyId,
    dailyTime: dailyTime || DEFAULT_DAILY_TIME,
    eveningTime: eveningTime || DEFAULT_EVENING_TIME,
  };
};
