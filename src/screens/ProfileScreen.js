import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, Animated, Share, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import LiquidBackground from '../components/LiquidBackground';
import GlassCard from '../components/GlassCard';
import GlassInput from '../components/GlassInput';
import GlassButton from '../components/GlassButton';
import PremiumBadge from '../components/PremiumBadge';
import ThemeSelector from '../components/ThemeSelector';
import api from '../api/client';
import { format } from 'date-fns';

const AVATAR_EMOJIS = [
  '😀', '😎', '🤓', '🧑‍💻', '🦸', '🧙', '👨‍🚀', '🦊',
  '🐉', '⭐', '🌸', '🎭', '🦋', '🌈', '🔥', '💎',
  '🎯', '🌙', '🎪', '🦄', '🐱', '🐶', '🦁', '🐯',
];

// Icon-style avatars (Ionicons based)
const ICON_AVATARS = [
  { id: 'person', icon: 'person', color: '#6366F1' },
  { id: 'rocket', icon: 'rocket', color: '#EC4899' },
  { id: 'planet', icon: 'planet', color: '#8B5CF6' },
  { id: 'leaf', icon: 'leaf', color: '#10B981' },
  { id: 'flame', icon: 'flame', color: '#F97316' },
  { id: 'star', icon: 'star', color: '#FBBF24' },
  { id: 'diamond', icon: 'diamond', color: '#38BDF8' },
  { id: 'rose', icon: 'rose', color: '#F43F5E' },
];

export default function ProfileScreen({ navigation }) {
  const { theme, themeName, changeTheme } = useTheme();
  const { user, updateUser, logout } = useAuth();
  const { isPremium, plan, daysUntilExpiry } = useSubscription();

  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Avatar can be: emoji ("😎"), icon code ("__icon_rose"), or photo pointer
  // ("__photo_https://…/uploads/abc.jpg"). The renderer decides which path.
  const photoAvatarUri = user?.avatar?.startsWith('__photo_')
    ? user.avatar.replace('__photo_', '')
    : null;

  const pickAvatarPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Enable photo access in Settings to use a profile picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
        exif: false,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;
      await Haptics.selectionAsync();
      setPhotoUploading(true);
      const form = new FormData();
      form.append('files', {
        uri: asset.uri,
        name: asset.fileName || `avatar-${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      });
      const res = await api.post('/uploads', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.attachments?.[0]?.url;
      if (!url) throw new Error('Upload returned no URL');
      await updateUser({ avatar: `__photo_${url}` });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert('Upload failed', e?.response?.data?.message || e?.message || 'Could not save photo.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await api.get('/analytics/summary');
      setStats(res.data.summary);
    } catch {}
  };

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    setLoading(true);
    try {
      await updateUser({ name: name.trim() });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved', 'Your profile was updated.');
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || 'Could not update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Error', 'Fill in both password fields');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }
    setPwLoading(true);
    try {
      await api.put('/auth/password', { currentPassword, newPassword });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Updated', 'Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setShowPasswordSection(false);
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || 'Could not change password');
    } finally {
      setPwLoading(false);
    }
  };

  const shareReferral = async () => {
    if (!user?.referralCode) return;
    try {
      await Share.share({
        message: `Join me on the Todo & Diary app! Use code ${user.referralCode} when you sign up.`,
      });
    } catch {}
  };

  const handleLogout = () => {
    Alert.alert('Log out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  };

  const deleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/auth/account');
              await logout();
            } catch {
              Alert.alert('Error', 'Could not delete account');
            }
          },
        },
      ],
    );
  };

  const planLabel = isPremium
    ? (plan || 'pro').toUpperCase()
    : 'FREE';

  const memberSince = user?.createdAt
    ? format(new Date(user.createdAt), 'MMM yyyy')
    : '—';

  return (
    <LiquidBackground>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>My Profile</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.backBtn}>
          <Ionicons name="log-out-outline" size={22} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim }}
      >
        {/* ── Hero ─────────────────────────────────────── */}
        <GlassCard variant="solid" glow style={styles.heroCard}>
          <LinearGradient
            colors={[`${theme.primary}30`, `${theme.secondary}20`, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.heroTop}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={pickAvatarPhoto}
              style={[styles.avatarRing, { borderColor: theme.primary }]}
            >
              <View style={[styles.avatarInner, { backgroundColor: theme.surface, overflow: 'hidden' }]}>
                {photoAvatarUri ? (
                  <Image source={{ uri: photoAvatarUri }} style={styles.avatarPhoto} />
                ) : user?.avatar?.startsWith('__icon_') ? (() => {
                  const iconId = user.avatar.replace('__icon_', '');
                  const iconDef = ICON_AVATARS.find(a => a.id === iconId);
                  return (
                    <Ionicons
                      name={iconDef?.icon || 'person'}
                      size={32}
                      color={iconDef?.color || theme.primary}
                    />
                  );
                })() : (
                  <Text style={styles.avatarEmoji}>
                    {user?.avatar && (user.avatar.length === 1 || user.avatar.length === 2)
                      ? user.avatar : '😀'}
                  </Text>
                )}
              </View>
              <View style={[styles.avatarEditBadge, { backgroundColor: theme.primary }]}>
                <Ionicons name="camera" size={11} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
                  {user?.name || 'Friend'}
                </Text>
                <PremiumBadge size="small" />
              </View>
              <Text style={[styles.userEmail, { color: theme.textMuted }]} numberOfLines={1}>
                {user?.email}
              </Text>
              <View style={[styles.planChip, { borderColor: isPremium ? theme.primary : theme.glassBorder }]}>
                <Ionicons
                  name={isPremium ? 'sparkles' : 'person-outline'}
                  size={11}
                  color={isPremium ? theme.primary : theme.textSecondary}
                />
                <Text style={[styles.planChipText, { color: isPremium ? theme.primary : theme.textSecondary }]}>
                  {planLabel}{isPremium && daysUntilExpiry != null ? ` · ${daysUntilExpiry}d left` : ''}
                </Text>
              </View>
            </View>
          </View>

          {/* Stat row */}
          <View style={styles.statRow}>
            <StatBlock
              value={stats?.todos?.completed || 0}
              label="Done"
              color={theme.success}
              textColor={theme.text}
              mutedColor={theme.textMuted}
            />
            <View style={[styles.statDivider, { backgroundColor: theme.glassBorder }]} />
            <StatBlock
              value={stats?.diary?.total || 0}
              label="Entries"
              color={theme.primary}
              textColor={theme.text}
              mutedColor={theme.textMuted}
            />
            <View style={[styles.statDivider, { backgroundColor: theme.glassBorder }]} />
            <StatBlock
              value={stats?.streak?.current || 0}
              label="Streak"
              color={theme.warning}
              textColor={theme.text}
              mutedColor={theme.textMuted}
              suffix="🔥"
            />
          </View>
        </GlassCard>

        {/* ── Quick actions ────────────────────────────── */}
        <View style={styles.quickRow}>
          <QuickAction
            emoji="🎨"
            label="Theme"
            sub={theme.name}
            onPress={() => setThemeModalOpen(true)}
            theme={theme}
          />
          <QuickAction
            emoji={isPremium ? '👑' : '✨'}
            label={isPremium ? 'Plans' : 'Upgrade'}
            sub={isPremium ? 'Manage' : 'Go Pro'}
            onPress={() => navigation.navigate('Upgrade')}
            theme={theme}
            highlight={!isPremium}
          />
          <QuickAction
            emoji="⚙️"
            label="Settings"
            sub="App prefs"
            onPress={() => navigation.navigate('MainTabs', { screen: 'Settings' })}
            theme={theme}
          />
        </View>

        {/* ── Subscription card (only if free, nudges upgrade) ── */}
        {!isPremium && (
          <GlassCard variant="accent" style={styles.section}>
            <View style={styles.subHeadRow}>
              <Text style={[styles.subTitle, { color: theme.text }]}>Unlock Pro features</Text>
              <Text style={styles.subEmoji}>✨</Text>
            </View>
            <Text style={[styles.subDesc, { color: theme.textSecondary }]}>
              Unlimited tasks, exports, advanced insights, and all themes.
            </Text>
            <GlassButton
              title="Upgrade to Pro"
              onPress={() => navigation.navigate('Upgrade')}
              icon="sparkles"
              fullWidth
              style={{ marginTop: 12 }}
            />
          </GlassCard>
        )}

        {/* ── Avatar picker ─────────────────────────────── */}
        <GlassCard variant="solid" style={styles.section}>
          <View style={styles.sectionHead}>
            <Ionicons name="happy-outline" size={16} color={theme.textSecondary} />
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>AVATAR</Text>
          </View>

          {/* Photo avatar — upload your own picture */}
          <Text style={[styles.avatarSubLabel, { color: theme.textMuted }]}>Your Photo</Text>
          <View style={styles.photoAvatarRow}>
            <TouchableOpacity
              onPress={pickAvatarPhoto}
              activeOpacity={0.85}
              disabled={photoUploading}
              style={[
                styles.photoAvatarTile,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: photoAvatarUri ? theme.primary : theme.glassBorder,
                  borderWidth: photoAvatarUri ? 2 : 1,
                },
              ]}
            >
              {photoAvatarUri ? (
                <Image source={{ uri: photoAvatarUri }} style={styles.photoAvatarImg} />
              ) : (
                <View style={styles.photoAvatarPlaceholder}>
                  <Ionicons name="image-outline" size={24} color={theme.textSecondary} />
                </View>
              )}
              <View style={[styles.photoAvatarOverlay, { backgroundColor: `${theme.primary}DD` }]}>
                <Ionicons
                  name={photoUploading ? 'cloud-upload' : 'camera'}
                  size={14}
                  color="#FFFFFF"
                />
                <Text style={styles.photoAvatarOverlayText}>
                  {photoUploading ? 'Uploading…' : photoAvatarUri ? 'Change' : 'Upload photo'}
                </Text>
              </View>
            </TouchableOpacity>
            {photoAvatarUri && (
              <TouchableOpacity
                onPress={async () => {
                  await Haptics.selectionAsync();
                  updateUser({ avatar: '😀' });
                }}
                style={[styles.photoAvatarRemove, { borderColor: theme.glassBorder }]}
              >
                <Ionicons name="close-circle" size={18} color={theme.danger} />
                <Text style={[styles.photoAvatarRemoveText, { color: theme.danger }]}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Icon-style avatars */}
          <Text style={[styles.avatarSubLabel, { color: theme.textMuted, marginTop: 14 }]}>Icon Style</Text>
          <View style={styles.iconAvatarRow}>
            {ICON_AVATARS.map((av) => {
              const active = user?.avatar === `__icon_${av.id}`;
              return (
                <TouchableOpacity
                  key={av.id}
                  style={[
                    styles.iconAvatarBtn,
                    { backgroundColor: `${av.color}20`, borderColor: active ? av.color : 'transparent' },
                    active && { borderWidth: 2 },
                  ]}
                  onPress={async () => {
                    await Haptics.selectionAsync();
                    updateUser({ avatar: `__icon_${av.id}` });
                  }}
                >
                  <Ionicons name={av.icon} size={22} color={av.color} />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Emoji avatars */}
          <Text style={[styles.avatarSubLabel, { color: theme.textMuted, marginTop: 12 }]}>Emoji Style</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {AVATAR_EMOJIS.map((emoji) => {
              const active = user?.avatar === emoji;
              return (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.emojiBtn,
                    { backgroundColor: theme.inputBg },
                    active && { borderColor: theme.primary, borderWidth: 2, backgroundColor: `${theme.primary}20` },
                  ]}
                  onPress={async () => {
                    await Haptics.selectionAsync();
                    updateUser({ avatar: emoji });
                  }}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </GlassCard>

        {/* ── Edit name ─────────────────────────────────── */}
        <GlassCard variant="solid" style={styles.section}>
          <View style={styles.sectionHead}>
            <Ionicons name="person-outline" size={16} color={theme.textSecondary} />
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>PROFILE INFO</Text>
          </View>
          <GlassInput
            label="Full Name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            icon="person-outline"
            autoCapitalize="words"
          />
          <GlassButton
            title="Save changes"
            onPress={handleUpdateProfile}
            loading={loading}
            icon="checkmark-outline"
            fullWidth
          />
        </GlassCard>

        {/* ── Password (collapsed) ──────────────────────── */}
        <GlassCard variant="solid" style={styles.section}>
          <TouchableOpacity
            onPress={() => setShowPasswordSection((s) => !s)}
            style={styles.collapseHead}
          >
            <View style={styles.sectionHead}>
              <Ionicons name="lock-closed-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginBottom: 0 }]}>
                CHANGE PASSWORD
              </Text>
            </View>
            <Ionicons
              name={showPasswordSection ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={theme.textMuted}
            />
          </TouchableOpacity>
          {showPasswordSection && (
            <View style={{ marginTop: 12 }}>
              <GlassInput
                label="Current password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                icon="lock-closed-outline"
                secureTextEntry
              />
              <GlassInput
                label="New password"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Min 6 characters"
                icon="lock-open-outline"
                secureTextEntry
              />
              <GlassButton
                title="Update password"
                onPress={handleChangePassword}
                loading={pwLoading}
                icon="key-outline"
                fullWidth
                variant="outline"
              />
            </View>
          )}
        </GlassCard>

        {/* ── Referral ──────────────────────────────────── */}
        {user?.referralCode && (
          <GlassCard variant="accent" style={styles.section}>
            <View style={styles.refHead}>
              <Text style={styles.refEmoji}>🎁</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.refTitle, { color: theme.text }]}>Invite friends, earn Pro</Text>
                <Text style={[styles.refDesc, { color: theme.textSecondary }]}>
                  Share your code — earn free days when they sign up.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={shareReferral}
              activeOpacity={0.8}
              style={[styles.codeBox, { backgroundColor: theme.inputBg, borderColor: theme.glassBorder }]}
            >
              <Text style={[styles.codeText, { color: theme.primary }]}>{user.referralCode}</Text>
              <View style={styles.codeActions}>
                <Ionicons name="share-outline" size={18} color={theme.primary} />
                <Text style={[styles.codeShareLabel, { color: theme.primary }]}>Share</Text>
              </View>
            </TouchableOpacity>
          </GlassCard>
        )}

        {/* ── Account info ──────────────────────────────── */}
        <GlassCard variant="light" style={styles.section}>
          <InfoRow
            emoji="📅"
            label="Member since"
            value={memberSince}
            theme={theme}
          />
          <View style={[styles.infoDivider, { backgroundColor: theme.glassBorder }]} />
          <InfoRow
            emoji="🏆"
            label="Best streak"
            value={`${user?.streak?.longest || 0} day${(user?.streak?.longest || 0) === 1 ? '' : 's'}`}
            theme={theme}
          />
          <View style={[styles.infoDivider, { backgroundColor: theme.glassBorder }]} />
          <InfoRow
            emoji="📝"
            label="Words written"
            value={(stats?.diary?.totalWords || 0).toLocaleString()}
            theme={theme}
          />
        </GlassCard>

        {/* ── Danger zone ──────────────────────────────── */}
        <GlassCard variant="light" style={[styles.section, { borderColor: `${theme.danger}30`, borderWidth: 1 }]}>
          <View style={styles.sectionHead}>
            <Ionicons name="warning-outline" size={16} color={theme.danger} />
            <Text style={[styles.sectionLabel, { color: theme.danger }]}>DANGER ZONE</Text>
          </View>
          <Text style={[styles.dangerDesc, { color: theme.textMuted }]}>
            Deleting your account removes all tasks, diary entries, and data permanently.
          </Text>
          <GlassButton
            title="Delete account"
            onPress={deleteAccount}
            icon="trash-outline"
            variant="danger"
            fullWidth
            style={{ marginTop: 12 }}
          />
        </GlassCard>

        <View style={{ height: 60 }} />
      </Animated.ScrollView>

      <ThemeSelector
        visible={themeModalOpen}
        currentTheme={themeName}
        onClose={() => setThemeModalOpen(false)}
        onSelect={changeTheme}
      />
    </LiquidBackground>
  );
}

function StatBlock({ value, label, color, textColor, mutedColor, suffix }) {
  return (
    <View style={styles.statBlock}>
      <Text style={[styles.statValue, { color: textColor }]}>
        {value}{suffix ? ' ' + suffix : ''}
      </Text>
      <Text style={[styles.statLabel, { color: mutedColor }]}>{label}</Text>
      <View style={[styles.statBar, { backgroundColor: color }]} />
    </View>
  );
}

function QuickAction({ emoji, label, sub, onPress, theme, highlight }) {
  return (
    <TouchableOpacity style={{ flex: 1 }} onPress={onPress} activeOpacity={0.75}>
      <GlassCard
        variant={highlight ? 'accent' : 'light'}
        style={styles.qaCard}
      >
        <Text style={styles.qaEmoji}>{emoji}</Text>
        <Text style={[styles.qaLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.qaSub, { color: theme.textMuted }]} numberOfLines={1}>{sub}</Text>
      </GlassCard>
    </TouchableOpacity>
  );
}

function InfoRow({ emoji, label, value, theme }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoEmoji}>{emoji}</Text>
      <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.text }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  scroll: { paddingHorizontal: 20 },

  heroCard: { marginBottom: 14, paddingVertical: 20 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarRing: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    padding: 3, borderWidth: 2,
  },
  avatarInner: {
    flex: 1, width: '100%', borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 34 },
  avatarPhoto: { width: '100%', height: '100%' },
  avatarEditBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  photoAvatarRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  photoAvatarTile: {
    width: 96, height: 96, borderRadius: 18, overflow: 'hidden',
    borderWidth: 1,
  },
  photoAvatarImg: { width: '100%', height: '100%' },
  photoAvatarPlaceholder: {
    width: '100%', height: '100%',
    alignItems: 'center', justifyContent: 'center',
  },
  photoAvatarOverlay: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 6,
  },
  photoAvatarOverlayText: {
    color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.4,
  },
  photoAvatarRemove: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1,
  },
  photoAvatarRemoveText: { fontSize: 12, fontWeight: '700' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  userName: { fontSize: 20, fontWeight: '800', flexShrink: 1 },
  userEmail: { fontSize: 12 },
  planChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999, borderWidth: 1,
    alignSelf: 'flex-start', marginTop: 6,
  },
  planChipText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  statRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18, paddingTop: 16, borderTopWidth: 0 },
  statBlock: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2, letterSpacing: 0.3 },
  statBar: { width: 18, height: 3, borderRadius: 2, marginTop: 6, opacity: 0.8 },
  statDivider: { width: 1, height: 36, opacity: 0.6 },

  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  qaCard: { alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6 },
  qaEmoji: { fontSize: 24, marginBottom: 6 },
  qaLabel: { fontSize: 13, fontWeight: '800' },
  qaSub: { fontSize: 10, fontWeight: '600', marginTop: 2 },

  section: { marginBottom: 14 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  collapseHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  subHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  subTitle: { fontSize: 16, fontWeight: '800' },
  subEmoji: { fontSize: 22 },
  subDesc: { fontSize: 13, lineHeight: 18 },

  emojiBtn: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'transparent',
  },
  emojiText: { fontSize: 26 },
  avatarSubLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },
  iconAvatarRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  iconAvatarBtn: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'transparent',
  },

  refHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  refEmoji: { fontSize: 28 },
  refTitle: { fontSize: 15, fontWeight: '800' },
  refDesc: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  codeBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1,
  },
  codeText: { fontSize: 18, fontWeight: '800', letterSpacing: 2 },
  codeActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  codeShareLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  infoEmoji: { fontSize: 20 },
  infoLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
  infoValue: { fontSize: 14, fontWeight: '800' },
  infoDivider: { height: 1, opacity: 0.5 },

  dangerDesc: { fontSize: 12, lineHeight: 17 },
});
