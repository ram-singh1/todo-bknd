import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity, Switch, Alert, Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAppLock } from '../contexts/AppLockContext';
import LiquidBackground from '../components/LiquidBackground';
import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import PremiumBadge from '../components/PremiumBadge';
import ThemeSelector from '../components/ThemeSelector';
import api from '../api/client';
import {
  scheduleDailySummary,
  cancelDailySummary,
  scheduleEveningReflection,
  cancelEveningReflection,
  scheduleStreakWarning,
  cancelStreakWarning,
  scheduleWeeklyReport,
  cancelWeeklyReport,
  getNotificationPrefs,
} from '../utils/notifications';

export default function SettingsScreen({ navigation }) {
  const { theme, themeName, changeTheme } = useTheme();
  const { user, logout, updateUser } = useAuth();
  const { isPremium, plan, daysUntilExpiry, showPaywall, limits, usage } = useSubscription();
  const {
    enabled: appLockEnabled,
    disableLock,
    biometricEnabled,
    biometricAvailable,
    setBiometric,
  } = useAppLock();
  const [notificationsEnabled, setNotificationsEnabled] = useState(user?.notificationsEnabled ?? true);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [exporting, setExporting] = useState(null);
  const [dailySummaryOn, setDailySummaryOn] = useState(false);
  const [eveningOn, setEveningOn] = useState(false);
  const [streakOn, setStreakOn] = useState(false);
  const [weeklyOn, setWeeklyOn] = useState(false);

  useEffect(() => {
    (async () => {
      const prefs = await getNotificationPrefs();
      setDailySummaryOn(prefs.dailyEnabled);
      setEveningOn(prefs.eveningEnabled);
      setStreakOn(prefs.streakEnabled);
      setWeeklyOn(prefs.weeklyEnabled);
    })();
  }, []);

  const handleDailySummary = async (value) => {
    if (value) {
      const ok = await scheduleDailySummary();
      if (!ok) {
        Alert.alert('Permission needed', 'Enable notifications in your device settings.');
        return;
      }
    } else {
      await cancelDailySummary();
    }
    setDailySummaryOn(value);
  };

  const handleEveningReflection = async (value) => {
    if (value) {
      const ok = await scheduleEveningReflection();
      if (!ok) {
        Alert.alert('Permission needed', 'Enable notifications in your device settings.');
        return;
      }
    } else {
      await cancelEveningReflection();
    }
    setEveningOn(value);
  };

  const handleStreakWarning = async (value) => {
    if (value) {
      const ok = await scheduleStreakWarning();
      if (!ok) {
        Alert.alert('Permission needed', 'Enable notifications in your device settings.');
        return;
      }
    } else {
      await cancelStreakWarning();
    }
    setStreakOn(value);
  };

  const handleWeeklyReport = async (value) => {
    if (value) {
      const ok = await scheduleWeeklyReport();
      if (!ok) {
        Alert.alert('Permission needed', 'Enable notifications in your device settings.');
        return;
      }
    } else {
      await cancelWeeklyReport();
    }
    setWeeklyOn(value);
  };

  const handleAppLockToggle = (value) => {
    if (value) {
      // Free plan can't enable app lock — paywall first.
      if (!isPremium) {
        showPaywall('appLock', 'App lock is a Pro feature. Start your trial to protect your diary and tasks.');
        return;
      }
      navigation.navigate('SetupPin');
    } else {
      Alert.alert('Disable PIN?', 'Anyone with your phone will be able to open the app.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disable', style: 'destructive', onPress: () => disableLock() },
      ]);
    }
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const handleToggleNotifications = async (value) => {
    setNotificationsEnabled(value);
    try { await updateUser({ notificationsEnabled: value }); } catch {}
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  const handleExport = async (kind, format) => {
    if (!isPremium) {
      showPaywall('export');
      return;
    }
    setExporting(`${kind}-${format}`);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const res = await api.get(`/export/${kind}?format=${format}`, { responseType: 'text' });
      // On web, triggering a download from blob
      if (Platform.OS === 'web') {
        const blob = new Blob([res.data], {
          type: format === 'json' ? 'application/json'
            : format === 'csv' ? 'text/csv'
            : format === 'html' ? 'text/html' : 'text/markdown',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${kind}-${Date.now()}.${format === 'markdown' ? 'md' : format}`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        Alert.alert('Exported', 'Your data was exported. Check your API response for the file.');
      }
    } catch (e) {
      const msg = e?.response?.data?.message || 'Export failed';
      Alert.alert('Export failed', msg);
    } finally {
      setExporting(null);
    }
  };

  // Build the sections dynamically so we can surface premium-vs-free items cleanly.
  const sections = [
    {
      title: 'Subscription',
      rows: [
        {
          icon: 'diamond-outline',
          label: isPremium ? `${plan.toUpperCase()} plan` : 'Free plan',
          value: isPremium && daysUntilExpiry != null ? `${daysUntilExpiry}d left` : 'Upgrade',
          onPress: () => navigation.navigate('Upgrade'),
          arrow: true,
          accent: isPremium ? theme.success : theme.primary,
        },
      ],
    },
    {
      title: 'Tools',
      rows: [
        {
          icon: 'search-outline',
          label: 'Search',
          onPress: () => navigation.navigate('Search'),
          arrow: true,
        },
        {
          icon: 'calendar-outline',
          label: 'Calendar',
          onPress: () => navigation.navigate('Calendar'),
          arrow: true,
        },
        {
          icon: 'timer-outline',
          label: 'Focus Mode',
          onPress: () => navigation.navigate('Focus'),
          arrow: true,
        },
        {
          icon: 'flash-outline',
          label: 'Brain Dump',
          onPress: () => navigation.navigate('BrainDump'),
          arrow: true,
        },
        {
          icon: 'bar-chart-outline',
          label: 'Insights',
          onPress: () => navigation.navigate('Analytics'),
          arrow: true,
        },
      ],
    },
    {
      title: 'Privacy',
      rows: [
        {
          icon: 'lock-closed-outline',
          label: 'App Lock (PIN)',
          toggle: true,
          value: appLockEnabled,
          onToggle: handleAppLockToggle,
          rightBadge: !isPremium && !appLockEnabled ? 'PRO' : null,
          accent: theme.warning,
        },
        ...(appLockEnabled && biometricAvailable
          ? [{
              icon: 'finger-print-outline',
              label: 'Biometric unlock',
              toggle: true,
              value: biometricEnabled,
              onToggle: async (v) => {
                const ok = await setBiometric(v);
                if (!ok && v) {
                  Alert.alert('Could not enable', 'Biometric authentication was not confirmed.');
                }
              },
              accent: theme.success,
            }]
          : []),
      ],
    },
    {
      title: 'Insights & Data',
      rows: [
        {
          icon: 'stats-chart-outline',
          label: 'Analytics',
          value: isPremium ? 'Open' : 'Pro',
          onPress: () => navigation.navigate('Analytics'),
          arrow: true,
        },
        {
          icon: 'document-text-outline',
          label: 'Export Diary (Markdown)',
          onPress: () => handleExport('diary', 'markdown'),
          rightBadge: isPremium ? null : 'PRO',
          loading: exporting === 'diary-markdown',
        },
        {
          icon: 'document-outline',
          label: 'Export Diary (HTML)',
          onPress: () => handleExport('diary', 'html'),
          rightBadge: isPremium ? null : 'PRO',
          loading: exporting === 'diary-html',
        },
        {
          icon: 'grid-outline',
          label: 'Export Todos (CSV)',
          onPress: () => handleExport('todos', 'csv'),
          rightBadge: isPremium ? null : 'PRO',
          loading: exporting === 'todos-csv',
        },
        {
          icon: 'shield-checkmark-outline',
          label: 'Encrypted backup',
          onPress: () => handleExport('backup', 'json'),
          rightBadge: isPremium ? null : 'PRO',
          loading: exporting === 'backup-json',
          accent: theme.success,
        },
      ],
    },
    {
      title: 'Appearance',
      rows: [
        {
          icon: 'color-palette-outline',
          label: 'Theme',
          value: themeName.charAt(0).toUpperCase() + themeName.slice(1),
          onPress: () => setShowThemePicker(true),
          arrow: true,
        },
      ],
    },
    {
      title: 'Notifications',
      rows: [
        {
          icon: 'notifications-outline',
          label: 'Push Notifications',
          toggle: true,
          value: notificationsEnabled,
          onToggle: handleToggleNotifications,
        },
        {
          icon: 'sunny-outline',
          label: 'Morning summary',
          toggle: true,
          value: dailySummaryOn,
          onToggle: handleDailySummary,
          accent: theme.warning,
        },
        {
          icon: 'moon-outline',
          label: 'Evening reflection',
          toggle: true,
          value: eveningOn,
          onToggle: handleEveningReflection,
          accent: theme.secondary,
        },
        {
          icon: 'flame-outline',
          label: 'Streak warning',
          toggle: true,
          value: streakOn,
          onToggle: handleStreakWarning,
          accent: '#F97316',
        },
        {
          icon: 'stats-chart-outline',
          label: 'Weekly report',
          toggle: true,
          value: weeklyOn,
          onToggle: handleWeeklyReport,
          accent: theme.primary,
        },
      ],
    },
    {
      title: 'Account',
      rows: [
        {
          icon: 'person-outline',
          label: 'Profile',
          onPress: () => navigation.navigate('Profile'),
          arrow: true,
        },
        {
          icon: 'shield-checkmark-outline',
          label: 'Encryption',
          value: 'AES-256-GCM',
        },
        {
          icon: 'log-out-outline',
          label: 'Log Out',
          danger: true,
          onPress: handleLogout,
        },
      ],
    },
    {
      title: 'About',
      rows: [
        { icon: 'information-circle-outline', label: 'Version', value: '2.0.0' },
        { icon: 'heart-outline', label: 'Themes', value: 'Liquid glass' },
        { icon: 'color-palette-outline', label: 'Appearance', value: 'Glass themes' },
      ],
    },
  ];

  return (
    <LiquidBackground>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Customize your experience
          </Text>
        </View>
        <PremiumBadge size="medium" />
      </View>

      <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Usage card — visible to free users so they see their limits */}
          {!isPremium && limits && (
            <GlassCard variant="accent" glow style={{ marginBottom: 14 }}>
              <View style={styles.usageHead}>
                <Text style={[styles.usageTitle, { color: theme.text }]}>This month</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Upgrade')}>
                  <Text style={[styles.upgradeLink, { color: theme.primary }]}>Upgrade →</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.usageRow}>
                <UsageBar
                  label="Exports"
                  used={usage?.exportsThisMonth || 0}
                  limit={limits.exportsPerMonth}
                  color={theme.accent}
                  theme={theme}
                />
              </View>
            </GlassCard>
          )}

          {sections.map((section, si) => (
            <View key={si} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
                {section.title.toUpperCase()}
              </Text>
              <GlassCard variant="solid" noPadding>
                {section.rows.map((item, ii) => (
                  <TouchableOpacity
                    key={ii}
                    style={[
                      styles.item,
                      ii < section.rows.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: theme.glassBorder,
                      },
                    ]}
                    onPress={item.onPress}
                    disabled={(!item.onPress && !item.toggle) || item.loading}
                    activeOpacity={item.onPress ? 0.7 : 1}
                  >
                    <View style={[
                      styles.iconWrap,
                      {
                        backgroundColor: item.danger
                          ? `${theme.danger}18`
                          : `${(item.accent || theme.primary)}18`,
                      },
                    ]}>
                      <Ionicons
                        name={item.icon}
                        size={18}
                        color={item.danger ? theme.danger : (item.accent || theme.primary)}
                      />
                    </View>
                    <Text style={[
                      styles.itemLabel,
                      { color: item.danger ? theme.danger : theme.text },
                    ]}>
                      {item.label}
                    </Text>
                    <View style={styles.itemRight}>
                      {item.rightBadge && (
                        <PremiumBadge size="small" showLabel plan="pro" />
                      )}
                      {item.value && !item.toggle && (
                        <Text style={[styles.itemValue, { color: theme.textMuted }]}>
                          {item.value}
                        </Text>
                      )}
                      {item.toggle && (
                        <Switch
                          value={item.value}
                          onValueChange={item.onToggle}
                          trackColor={{ true: theme.primary, false: theme.inputBg }}
                          thumbColor="#FFF"
                        />
                      )}
                      {item.arrow && (
                        <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </GlassCard>
            </View>
          ))}

          <View style={{ height: 110 }} />
        </ScrollView>
      </Animated.View>

      <ThemeSelector
        visible={showThemePicker}
        onClose={() => setShowThemePicker(false)}
        onSelect={changeTheme}
        currentTheme={themeName}
      />
    </LiquidBackground>
  );
}

function UsageBar({ label, used, limit, color, theme }) {
  const pct = limit && limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const unlimited = !limit;
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.usageLabelRow}>
        <Text style={[styles.usageLabel, { color: theme.textSecondary }]}>{label}</Text>
        <Text style={[styles.usageValue, { color: theme.text }]}>
          {unlimited ? '∞' : `${used}/${limit}`}
        </Text>
      </View>
      <View style={[styles.usageTrack, { backgroundColor: theme.inputBg }]}>
        <View style={[styles.usageFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 58, paddingBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  scroll: { paddingHorizontal: 20 },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  itemLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemValue: { fontSize: 12, fontWeight: '600' },
  usageHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  usageTitle: { fontSize: 14, fontWeight: '700' },
  upgradeLink: { fontSize: 13, fontWeight: '700' },
  usageRow: { flexDirection: 'row', gap: 16 },
  usageLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  usageLabel: { fontSize: 11, fontWeight: '600' },
  usageValue: { fontSize: 11, fontWeight: '800' },
  usageTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  usageFill: { height: '100%', borderRadius: 3 },
});
