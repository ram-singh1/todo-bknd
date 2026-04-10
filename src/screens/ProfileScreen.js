import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import GlassCard from '../components/GlassCard';
import GlassInput from '../components/GlassInput';
import GlassButton from '../components/GlassButton';
import api from '../api/client';

export default function ProfileScreen({ navigation }) {
  const { theme } = useTheme();
  const { user, updateUser, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    setLoading(true);
    try {
      await updateUser({ name: name.trim() });
      Alert.alert('Success', 'Profile updated!');
    } catch (error) {
      Alert.alert('Error', error.message || 'Could not update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Error', 'Please fill in both password fields');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }
    setPwLoading(true);
    try {
      await api.put('/auth/password', { currentPassword, newPassword });
      Alert.alert('Success', 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      Alert.alert('Error', error.message || 'Could not change password');
    } finally {
      setPwLoading(false);
    }
  };

  const avatarEmojis = ['😀', '😎', '🤓', '🧑‍💻', '🦸', '🧙', '👨‍🚀', '🦊', '🐉', '⭐', '🌸', '🎭', '🦋', '🌈', '🔥', '💎', '🎯', '🌙', '🎪', '🦄'];

  return (
    <LinearGradient colors={theme.colors} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>My Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <Animated.View style={[styles.avatarSection, { opacity: fadeAnim }]}>
          <Animated.View style={[styles.avatarCircle, { backgroundColor: theme.glass, borderColor: theme.glassBorder, transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.avatarEmoji}>
              {user?.avatar?.length === 1 || user?.avatar?.length === 2 ? user.avatar : '😀'}
            </Text>
          </Animated.View>
          <Text style={[styles.userName, { color: theme.text }]}>{user?.name}</Text>
          <Text style={[styles.userEmail, { color: theme.textMuted }]}>{user?.email}</Text>
        </Animated.View>

        {/* Avatar Picker */}
        <GlassCard variant="solid" style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>CHOOSE AVATAR</Text>
          <View style={styles.emojiRow}>
            {avatarEmojis.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={[
                  styles.emojiBtn,
                  { backgroundColor: theme.inputBg },
                  user?.avatar === emoji && { borderColor: theme.primary, borderWidth: 2 },
                ]}
                onPress={() => updateUser({ avatar: emoji })}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>

        {/* Edit Name */}
        <GlassCard variant="solid" style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>PROFILE INFO</Text>
          <GlassInput
            label="Full Name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            icon="person-outline"
            autoCapitalize="words"
          />
          <GlassButton
            title="Update Profile"
            onPress={handleUpdateProfile}
            loading={loading}
            icon="checkmark-outline"
            fullWidth
          />
        </GlassCard>

        {/* Change Password */}
        <GlassCard variant="solid" style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>CHANGE PASSWORD</Text>
          <GlassInput
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Enter current password"
            icon="lock-closed-outline"
            secureTextEntry
          />
          <GlassInput
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Min 6 characters"
            icon="lock-open-outline"
            secureTextEntry
          />
          <GlassButton
            title="Change Password"
            onPress={handleChangePassword}
            loading={pwLoading}
            icon="key-outline"
            fullWidth
            variant="outline"
          />
        </GlassCard>

        {/* Account Info */}
        <GlassCard variant="accent" style={styles.section}>
          <View style={styles.infoRow}>
            <Text style={styles.infoEmoji}>📅</Text>
            <View>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Member Since</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric'
                }) : 'Recently'}
              </Text>
            </View>
          </View>
        </GlassCard>

        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  scroll: { paddingHorizontal: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 12,
  },
  avatarEmoji: { fontSize: 52 },
  userName: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  userEmail: { fontSize: 14 },
  section: { marginBottom: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 14, textTransform: 'uppercase' },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  emojiBtn: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'transparent',
  },
  emojiText: { fontSize: 26 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  infoEmoji: { fontSize: 28 },
  infoLabel: { fontSize: 12, fontWeight: '600' },
  infoValue: { fontSize: 15, fontWeight: '700', marginTop: 2 },
});
