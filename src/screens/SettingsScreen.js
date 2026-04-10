import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity, Switch, Alert, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import GlassCard from '../components/GlassCard';
import ThemeSelector from '../components/ThemeSelector';

export default function SettingsScreen() {
  const { theme, themeName, changeTheme } = useTheme();
  const { user, logout, updateUser } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(user?.notificationsEnabled ?? true);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const handleToggleNotifications = async (value) => {
    setNotificationsEnabled(value);
    try {
      await updateUser({ notificationsEnabled: value });
    } catch {}
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          await logout();
        },
      },
    ]);
  };

  const settingsSections = [
    {
      title: 'Appearance',
      items: [
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
      items: [
        {
          icon: 'notifications-outline',
          label: 'Push Notifications',
          toggle: true,
          value: notificationsEnabled,
          onToggle: handleToggleNotifications,
        },
      ],
    },
    {
      title: 'About',
      items: [
        {
          icon: 'information-circle-outline',
          label: 'Version',
          value: '1.0.0',
        },
        {
          icon: 'shield-checkmark-outline',
          label: 'Privacy',
          value: 'AES-256-GCM Encryption',
        },
        {
          icon: 'sparkles-outline',
          label: 'AI Model',
          value: 'GPT-3.5 Turbo',
        },
        {
          icon: 'heart-outline',
          label: 'Theme Count',
          value: '16 Themes',
        },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          icon: 'log-out-outline',
          label: 'Log Out',
          danger: true,
          onPress: handleLogout,
        },
      ],
    },
  ];

  return (
    <LinearGradient colors={theme.colors} style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Settings ⚙️</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Customize your experience
        </Text>
      </View>

      <Animated.View style={{ opacity: fadeAnim }}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {settingsSections.map((section, si) => (
          <View key={si} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
              {section.title.toUpperCase()}
            </Text>
            <GlassCard variant="solid" noPadding>
              {section.items.map((item, ii) => (
                <TouchableOpacity
                  key={ii}
                  style={[
                    styles.item,
                    ii < section.items.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: theme.glassBorder,
                    },
                  ]}
                  onPress={item.onPress}
                  disabled={!item.onPress && !item.toggle}
                  activeOpacity={item.onPress ? 0.7 : 1}
                >
                  <View style={[
                    styles.iconWrap,
                    { backgroundColor: item.danger ? `${theme.danger}20` : `${theme.primary}15` }
                  ]}>
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={item.danger ? theme.danger : theme.primary}
                    />
                  </View>
                  <Text style={[
                    styles.itemLabel,
                    { color: item.danger ? theme.danger : theme.text }
                  ]}>
                    {item.label}
                  </Text>
                  <View style={styles.itemRight}>
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

        <View style={{ height: 100 }} />
      </ScrollView>
      </Animated.View>

      <ThemeSelector
        visible={showThemePicker}
        onClose={() => setShowThemePicker(false)}
        onSelect={changeTheme}
        currentTheme={themeName}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 4 },
  scroll: { paddingHorizontal: 20 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  itemLabel: { flex: 1, fontSize: 16, fontWeight: '500' },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemValue: { fontSize: 13 },
});
