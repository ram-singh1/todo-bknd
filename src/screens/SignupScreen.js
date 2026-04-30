import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, ScrollView, KeyboardAvoidingView,
  Platform, Alert, Animated, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import LiquidBackground from '../components/LiquidBackground';
import GlassCard from '../components/GlassCard';
import GlassInput from '../components/GlassInput';
import GlassButton from '../components/GlassButton';

export default function SignupScreen({ navigation }) {
  const { theme } = useTheme();
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referral, setReferral] = useState('');
  const [showReferral, setShowReferral] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = 'Enter a valid email';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'Min 6 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signup(
        name.trim(),
        email.trim().toLowerCase(),
        password,
        referral.trim() || undefined,
      );
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'Could not create account';
      Alert.alert('Signup Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LiquidBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={[styles.logoRing, { borderColor: theme.glassBorder, backgroundColor: theme.glass }]}>
              <Text style={styles.logoEmoji}>🚀</Text>
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Join thousands tracking what matters
            </Text>
          </Animated.View>

          <GlassCard variant="solid" style={styles.formCard}>
            <GlassInput
              label="Full Name"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              icon="person-outline"
              autoCapitalize="words"
              error={errors.name}
            />
            <GlassInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              icon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />
            <GlassInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Min 6 characters"
              icon="lock-closed-outline"
              secureTextEntry
              error={errors.password}
            />

            {!showReferral ? (
              <TouchableOpacity onPress={() => setShowReferral(true)} style={styles.referralToggle}>
                <Ionicons name="gift-outline" size={16} color={theme.primary} />
                <Text style={[styles.referralToggleText, { color: theme.primary }]}>
                  Have a referral code?
                </Text>
              </TouchableOpacity>
            ) : (
              <GlassInput
                label="Referral Code (optional)"
                value={referral}
                onChangeText={setReferral}
                placeholder="ABCD1234"
                icon="gift-outline"
                autoCapitalize="characters"
              />
            )}

            <GlassButton
              title={loading ? 'Creating...' : 'Create Account'}
              onPress={handleSignup}
              loading={loading}
              icon="person-add-outline"
              fullWidth
              size="large"
              style={{ marginTop: 8 }}
            />

            <Text style={[styles.termsText, { color: theme.textMuted }]}>
              By signing up you agree to our Terms & Privacy Policy.
            </Text>
          </GlassCard>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: theme.glassBorder }]} />
            <Text style={[styles.dividerText, { color: theme.textMuted }]}>OR</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.glassBorder }]} />
          </View>

          <GlassCard variant="light" onPress={() => navigation.navigate('Login')}>
            <View style={styles.linkRow}>
              <Text style={[styles.linkText, { color: theme.textSecondary }]}>
                Already have an account?
              </Text>
              <Text style={[styles.linkAction, { color: theme.primary }]}> Sign in</Text>
              <Ionicons name="arrow-forward" size={16} color={theme.primary} style={{ marginLeft: 4 }} />
            </View>
          </GlassCard>

          <View style={styles.benefits}>
            <Text style={[styles.benefitsTitle, { color: theme.textMuted }]}>WHAT YOU GET</Text>
            {[
              { emoji: '🎁', title: '7-Day Free Pro Trial', desc: 'Full premium, no card needed' },
              { emoji: '📋', title: 'Smart Planning', desc: 'Fast task capture with helpful defaults' },
              { emoji: '🔒', title: 'End-to-End Encrypted', desc: 'Your diary, only yours' },
              { emoji: '✨', title: 'Liquid Glass Themes', desc: 'A vibe for every mood' },
            ].map((b, i) => (
              <View key={i} style={styles.benefitRow}>
                <Text style={styles.benefitEmoji}>{b.emoji}</Text>
                <View style={styles.benefitText}>
                  <Text style={[styles.benefitTitle, { color: theme.text }]}>{b.title}</Text>
                  <Text style={[styles.benefitDesc, { color: theme.textMuted }]}>{b.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: { alignItems: 'center', marginBottom: 24, marginTop: 20 },
  logoRing: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginBottom: 16,
  },
  logoEmoji: { fontSize: 38 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 6 },
  subtitle: { fontSize: 14, letterSpacing: 0.3, textAlign: 'center' },
  formCard: { marginBottom: 16 },
  referralToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingVertical: 8 },
  referralToggleText: { fontSize: 13, fontWeight: '600' },
  termsText: { fontSize: 11, textAlign: 'center', marginTop: 12 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 14 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 16, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  linkText: { fontSize: 14 },
  linkAction: { fontSize: 14, fontWeight: '700' },
  benefits: { marginTop: 24 },
  benefitsTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 14, textAlign: 'center' },
  benefitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  benefitEmoji: { fontSize: 22, marginRight: 12 },
  benefitText: { flex: 1 },
  benefitTitle: { fontSize: 14, fontWeight: '700' },
  benefitDesc: { fontSize: 12, marginTop: 1 },
});
