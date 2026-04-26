import React from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import GlassCard from './GlassCard';
import GlassButton from './GlassButton';

const FEATURE_COPY = {
  theme: {
    emoji: '🎨',
    title: 'Unlock Liquid Themes',
    subtitle: 'Get all 17 beautifully-crafted glass themes and change them anytime.',
  },
  analytics: {
    emoji: '📊',
    title: 'Advanced Analytics',
    subtitle: 'Unlock productivity charts, mood trends, and deeper insights tailored to you.',
  },
  export: {
    emoji: '📄',
    title: 'Export Your Data',
    subtitle: 'Download your diary and tasks as PDF, Markdown, CSV, or JSON.',
  },
  todos: {
    emoji: '✅',
    title: 'Unlimited Tasks',
    subtitle: 'Free plan caps tasks at 50. Upgrade for unlimited todos.',
  },
  diary: {
    emoji: '📖',
    title: 'Unlimited Journal',
    subtitle: 'Free plan allows 30 diary entries. Upgrade to write forever.',
  },
  default: {
    emoji: '⭐',
    title: 'Premium Feature',
    subtitle: 'Unlock this and every premium perk with a Pro subscription.',
  },
};

export default function PaywallModal({ navigationRef }) {
  const { theme } = useTheme();
  const { paywall, hidePaywall, startTrial, trialUsed } = useSubscription();

  const copy = FEATURE_COPY[paywall.feature] || FEATURE_COPY.default;

  const goUpgrade = () => {
    hidePaywall();
    const nav = navigationRef?.current;
    if (nav && typeof nav.navigate === 'function') {
      nav.navigate('Upgrade');
    }
  };

  const onStartTrial = async () => {
    try {
      await startTrial();
      hidePaywall();
    } catch {
      goUpgrade();
    }
  };

  return (
    <Modal
      transparent
      visible={paywall.visible}
      animationType="fade"
      onRequestClose={hidePaywall}
    >
      <BlurView intensity={40} tint="dark" style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} onPress={hidePaywall} activeOpacity={1}>
          <TouchableOpacity activeOpacity={1} style={styles.sheetWrap}>
            <GlassCard variant="solid" glow style={styles.sheet}>
              {/* Close */}
              <TouchableOpacity onPress={hidePaywall} style={styles.close}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>

              {/* Header */}
              <View style={styles.header}>
                <LinearGradient
                  colors={[`${theme.primary}50`, `${theme.secondary}30`, 'transparent']}
                  style={styles.headerGlow}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <View style={[styles.emojiRing, { borderColor: `${theme.primary}40`, backgroundColor: `${theme.primary}15` }]}>
                  <Text style={styles.emoji}>{copy.emoji}</Text>
                </View>
                <Text style={[styles.title, { color: theme.text }]}>
                  {copy.title}
                </Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  {paywall.message || copy.subtitle}
                </Text>
              </View>

              {/* Feature list */}
              <ScrollView style={styles.featureList} showsVerticalScrollIndicator={false}>
                {[
                  { icon: 'sparkles', text: 'All 17 liquid glass themes' },
                  { icon: 'stats-chart', text: 'Advanced productivity analytics' },
                  { icon: 'cloud-download-outline', text: 'Export to PDF, MD, CSV, JSON' },
                  { icon: 'image', text: 'Image background themes' },
                  { icon: 'infinite', text: 'Unlimited todos & diary entries' },
                  { icon: 'heart', text: 'Support indie development' },
                ].map((f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <View style={[styles.featureIcon, { backgroundColor: `${theme.primary}18` }]}>
                      <Ionicons name={f.icon} size={16} color={theme.primary} />
                    </View>
                    <Text style={[styles.featureText, { color: theme.text }]}>{f.text}</Text>
                  </View>
                ))}
              </ScrollView>

              {/* Actions */}
              <View style={styles.actions}>
                {!trialUsed ? (
                  <>
                    <GlassButton
                      title="Start 7-Day Free Trial"
                      onPress={onStartTrial}
                      icon="rocket"
                      fullWidth
                      size="large"
                    />
                    <TouchableOpacity onPress={goUpgrade} style={{ marginTop: 10 }}>
                      <Text style={[styles.linkText, { color: theme.textSecondary }]}>
                        See all plans →
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <GlassButton
                      title="See Pro Plans"
                      onPress={goUpgrade}
                      icon="sparkles"
                      fullWidth
                      size="large"
                    />
                    <TouchableOpacity onPress={hidePaywall} style={{ marginTop: 10 }}>
                      <Text style={[styles.linkText, { color: theme.textMuted }]}>
                        Maybe later
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </GlassCard>
          </TouchableOpacity>
        </TouchableOpacity>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backdropTouch: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  sheetWrap: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  sheet: { padding: 22 },
  close: {
    position: 'absolute',
    top: 10, right: 10,
    zIndex: 10,
    padding: 8,
  },
  header: { alignItems: 'center', marginBottom: 18 },
  headerGlow: {
    position: 'absolute',
    top: -80,
    width: 400,
    height: 180,
    opacity: 0.6,
  },
  emojiRing: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, marginBottom: 16,
  },
  emoji: { fontSize: 40 },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 8 },
  featureList: { maxHeight: 240, marginBottom: 18 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  featureIcon: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  featureText: { fontSize: 14, fontWeight: '500', flex: 1 },
  actions: { alignItems: 'center' },
  linkText: { fontSize: 14, fontWeight: '600' },
});
