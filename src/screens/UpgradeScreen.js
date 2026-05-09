import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, Animated,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import LiquidBackground from '../components/LiquidBackground';
import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import GlassInput from '../components/GlassInput';
import PremiumBadge from '../components/PremiumBadge';

export default function UpgradeScreen({ navigation }) {
  const { theme } = useTheme();
  const {
    plans, isPremium, plan, trialUsed, daysUntilExpiry,
    startTrial, subscribe, redeem, cancel, restore, status,
  } = useSubscription();

  const [billing, setBilling] = useState('yearly');
  const [promoCode, setPromoCode] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [promoBusy, setPromoBusy] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const handleTrial = async () => {
    setBusyId('trial');
    try {
      await startTrial();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('🎉 Welcome to Pro', 'Your 7-day free trial has started!');
    } catch (e) {
      Alert.alert('Could not start trial', e?.response?.data?.message || 'Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSubscribe = async (planId) => {
    setBusyId(planId);
    try {
      await subscribe(planId, billing);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('🎉 Success', `You are now on the ${planId.toUpperCase()} plan!`);
    } catch (e) {
      Alert.alert('Subscription failed', e?.response?.data?.message || 'Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const handleRedeem = async () => {
    if (!promoCode.trim()) return;
    setPromoBusy(true);
    try {
      const res = await redeem(promoCode.trim());
      Alert.alert('Code applied!', res.message || 'Promo code redeemed.');
      setPromoCode('');
    } catch (e) {
      Alert.alert('Invalid code', e?.response?.data?.message || 'This code is not valid.');
    } finally {
      setPromoBusy(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel subscription?',
      'You will keep Pro features until the current period ends.',
      [
        { text: 'Keep Plan', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancel();
              Alert.alert('Canceled', 'Your plan will end at the period close.');
            } catch {}
          },
        },
      ]
    );
  };

  return (
    <LiquidBackground>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Upgrade</Text>
        <View style={{ width: 40 }} />
      </View>

      <Animated.ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        style={{ opacity: fade }}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <LinearGradient
            colors={[theme.primary, theme.secondary, theme.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroRing}
          >
            <View style={[styles.heroInner, { backgroundColor: theme.background }]}>
              <Text style={styles.heroEmoji}>✨</Text>
            </View>
          </LinearGradient>
          <Text style={[styles.heroTitle, { color: theme.text }]}>
            Unlock your potential
          </Text>
          <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
            Premium turns your diary & tasks into a productivity superpower.
          </Text>

          {isPremium && (
            <View style={styles.currentPlan}>
              <PremiumBadge size="large" />
              {daysUntilExpiry !== null && (
                <Text style={[styles.expiry, { color: theme.textMuted }]}>
                  {daysUntilExpiry} days remaining
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Billing toggle */}
        <View style={[styles.billingToggle, { backgroundColor: theme.inputBg, borderColor: theme.glassBorder }]}>
          {['monthly', 'yearly'].map(b => (
            <TouchableOpacity
              key={b}
              onPress={() => setBilling(b)}
              style={[
                styles.billingPill,
                billing === b && { backgroundColor: theme.primary },
              ]}
            >
              <Text style={[
                styles.billingText,
                { color: billing === b ? '#fff' : theme.textSecondary },
              ]}>
                {b.charAt(0).toUpperCase() + b.slice(1)}
                {b === 'yearly' && <Text style={styles.saveTag}>  SAVE 33%</Text>}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Free trial card */}
        {!isPremium && !trialUsed && (
          <GlassCard variant="accent" glow style={styles.trialCard}>
            <View style={styles.trialRow}>
              <Text style={styles.trialEmoji}>🎁</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.trialTitle, { color: theme.text }]}>
                  7-Day Free Trial
                </Text>
                <Text style={[styles.trialDesc, { color: theme.textSecondary }]}>
                  Full Pro access. No payment required.
                </Text>
              </View>
            </View>
            <GlassButton
              title={busyId === 'trial' ? 'Starting...' : 'Start Free Trial'}
              onPress={handleTrial}
              loading={busyId === 'trial'}
              icon="rocket"
              fullWidth
              style={{ marginTop: 12 }}
            />
          </GlassCard>
        )}

        {/* Plan cards */}
        {(plans || []).filter(p => p.id !== 'free').map(p => {
          const price = billing === 'yearly' ? p.priceYearly : p.priceMonthly;
          const per = billing === 'yearly' ? '/yr' : '/mo';
          const isCurrent = plan === p.id;
          return (
            <GlassCard
              key={p.id}
              variant={p.featured ? 'accent' : 'solid'}
              glow={p.featured}
              style={styles.planCard}
            >
              {p.badge && (
                <LinearGradient
                  colors={[theme.primary, theme.secondary]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.planBadge}
                >
                  <Text style={styles.planBadgeText}>{p.badge}</Text>
                </LinearGradient>
              )}
              <View style={styles.planHead}>
                <View>
                  <Text style={[styles.planName, { color: theme.text }]}>{p.name}</Text>
                  <Text style={[styles.planTagline, { color: theme.textMuted }]}>{p.tagline}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.planPrice, { color: theme.text }]}>
                    ${price}
                    <Text style={[styles.planPer, { color: theme.textMuted }]}>{per}</Text>
                  </Text>
                  {billing === 'yearly' && (
                    <Text style={[styles.planSaving, { color: theme.success }]}>
                      ${(p.priceMonthly * 12 - p.priceYearly).toFixed(2)} saved
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.featureList}>
                {p.features.map((f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.success} />
                    <Text style={[styles.featureText, { color: theme.textSecondary }]}>{f}</Text>
                  </View>
                ))}
              </View>

              {isCurrent ? (
                <View style={styles.currentBadge}>
                  <Ionicons name="checkmark-circle" size={18} color={theme.success} />
                  <Text style={[styles.currentText, { color: theme.success }]}>Current plan</Text>
                </View>
              ) : (
                <GlassButton
                  title={`Choose ${p.name}`}
                  onPress={() => handleSubscribe(p.id)}
                  loading={busyId === p.id}
                  variant={p.featured ? 'primary' : 'glass'}
                  fullWidth
                  icon={p.featured ? 'sparkles' : 'chevron-forward'}
                />
              )}
            </GlassCard>
          );
        })}

        {/* Cancel / restore */}
        {isPremium && (
          <GlassCard variant="light" style={{ marginTop: 16 }}>
            <Text style={[styles.manageTitle, { color: theme.text }]}>Manage subscription</Text>
            <Text style={[styles.manageHint, { color: theme.textMuted }]}>
              {status?.subscription?.cancelAtPeriodEnd
                ? 'Your plan is set to end at the period close. You can restore anytime.'
                : 'Cancel anytime — Pro stays active until your current period ends.'}
            </Text>
            {status?.subscription?.cancelAtPeriodEnd ? (
              <GlassButton
                title="Restore Subscription"
                onPress={restore}
                variant="primary"
                icon="refresh"
                fullWidth
                style={{ marginTop: 12 }}
              />
            ) : (
              <GlassButton
                title="Cancel at Period End"
                onPress={handleCancel}
                variant="outline"
                icon="close-circle-outline"
                fullWidth
                style={{ marginTop: 12 }}
              />
            )}
          </GlassCard>
        )}

        {/* Promo code */}
        <GlassCard variant="light" style={{ marginTop: 16 }}>
          <Text style={[styles.manageTitle, { color: theme.text }]}>Have a code?</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <GlassInput
                value={promoCode}
                onChangeText={setPromoCode}
                placeholder="Enter promo code"
                icon="gift-outline"
                autoCapitalize="characters"
              />
            </View>
            <GlassButton
              title="Redeem"
              onPress={handleRedeem}
              loading={promoBusy}
              variant="glass"
              size="medium"
              style={{ marginBottom: 16 }}
            />
          </View>
          <Text style={[styles.hintText, { color: theme.textMuted }]}>
            Try WELCOME30 for a 30-day Pro trial.
          </Text>
        </GlassCard>

        {/* Trust row */}
        <View style={styles.trustRow}>
          <View style={styles.trustItem}>
            <Ionicons name="lock-closed" size={16} color={theme.success} />
            <Text style={[styles.trustText, { color: theme.textMuted }]}>Secure</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="refresh" size={16} color={theme.success} />
            <Text style={[styles.trustText, { color: theme.textMuted }]}>Cancel anytime</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="shield-checkmark" size={16} color={theme.success} />
            <Text style={[styles.trustText, { color: theme.textMuted }]}>Your data is yours</Text>
          </View>
        </View>

        <View style={{ height: 60 }} />
      </Animated.ScrollView>
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  hero: { alignItems: 'center', marginBottom: 22 },
  heroRing: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
    padding: 3, marginBottom: 14,
  },
  heroInner: {
    width: '100%', height: '100%', borderRadius: 45,
    alignItems: 'center', justifyContent: 'center',
  },
  heroEmoji: { fontSize: 44 },
  heroTitle: { fontSize: 26, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  heroSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 12 },
  currentPlan: { alignItems: 'center', marginTop: 14, gap: 6 },
  expiry: { fontSize: 12, marginTop: 4 },
  billingToggle: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 20,
    alignSelf: 'center',
  },
  billingPill: {
    paddingVertical: 8, paddingHorizontal: 22,
    borderRadius: 999,
  },
  billingText: { fontSize: 13, fontWeight: '700' },
  saveTag: { fontSize: 10, fontWeight: '800' },
  trialCard: { marginBottom: 14 },
  trialRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  trialEmoji: { fontSize: 36 },
  trialTitle: { fontSize: 17, fontWeight: '800' },
  trialDesc: { fontSize: 13, marginTop: 2 },
  planCard: { marginBottom: 14, paddingTop: 34 },
  planBadge: {
    position: 'absolute', top: 0, right: 16,
    paddingHorizontal: 12, paddingVertical: 5,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  planBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  planHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  planName: { fontSize: 22, fontWeight: '800' },
  planTagline: { fontSize: 13, marginTop: 2 },
  planPrice: { fontSize: 28, fontWeight: '800' },
  planPer: { fontSize: 14, fontWeight: '500' },
  planSaving: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  featureList: { marginBottom: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, gap: 8 },
  featureText: { fontSize: 13, flex: 1 },
  currentBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  currentText: { fontSize: 14, fontWeight: '700' },
  manageTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  manageHint: { fontSize: 12, lineHeight: 17 },
  hintText: { fontSize: 11, marginTop: 4 },
  trustRow: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 20 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trustText: { fontSize: 12, fontWeight: '600' },
});
