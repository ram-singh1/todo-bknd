import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, ScrollView, KeyboardAvoidingView,
  Platform, Alert, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import LiquidBackground from '../components/LiquidBackground';
import GlassCard from '../components/GlassCard';
import GlassInput from '../components/GlassInput';
import GlassButton from '../components/GlassButton';

export default function LoginScreen({ navigation }) {
  const { theme } = useTheme();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const validate = () => {
    const errs = {};
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = 'Enter a valid email';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'Min 6 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'Invalid credentials';
      Alert.alert('Login Failed', msg);
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
          {/* Header */}
          <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={[styles.logoRing, { borderColor: theme.glassBorder, backgroundColor: theme.glass }]}>
              <Text style={styles.logoEmoji}>✨</Text>
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Welcome Back</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Sign in to continue your journey
            </Text>
          </Animated.View>

          {/* Form */}
          <GlassCard variant="solid" style={styles.formCard}>
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
              placeholder="Enter your password"
              icon="lock-closed-outline"
              secureTextEntry
              error={errors.password}
            />

            <GlassButton
              title={loading ? 'Signing in...' : 'Sign In'}
              onPress={handleLogin}
              loading={loading}
              icon="log-in-outline"
              fullWidth
              size="large"
              style={{ marginTop: 8 }}
            />
          </GlassCard>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: theme.glassBorder }]} />
            <Text style={[styles.dividerText, { color: theme.textMuted }]}>OR</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.glassBorder }]} />
          </View>

          {/* Sign up link */}
          <GlassCard variant="light" onPress={() => navigation.navigate('Signup')}>
            <View style={styles.linkRow}>
              <Text style={[styles.linkText, { color: theme.textSecondary }]}>
                New here?
              </Text>
              <Text style={[styles.linkAction, { color: theme.primary }]}> Create an account</Text>
              <Ionicons name="arrow-forward" size={16} color={theme.primary} style={{ marginLeft: 4 }} />
            </View>
          </GlassCard>

          {/* Feature chips */}
          <View style={styles.chips}>
            {[
              { icon: '📋', text: 'Smart Tasks' },
              { icon: '🔒', text: 'Encrypted' },
              { icon: '✨', text: 'Glass Themes' },
            ].map((c, i) => (
              <View
                key={i}
                style={[styles.chip, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}
              >
                <Text style={styles.chipIcon}>{c.icon}</Text>
                <Text style={[styles.chipText, { color: theme.textSecondary }]}>{c.text}</Text>
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
    justifyContent: 'center',
    paddingVertical: 50,
  },
  header: { alignItems: 'center', marginBottom: 26 },
  logoRing: {
    width: 84, height: 84, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginBottom: 18,
  },
  logoEmoji: { fontSize: 40 },
  title: { fontSize: 30, fontWeight: '800', marginBottom: 6 },
  subtitle: { fontSize: 15, letterSpacing: 0.3, textAlign: 'center' },
  formCard: { marginBottom: 18 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 14 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 16, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  linkText: { fontSize: 14 },
  linkAction: { fontSize: 14, fontWeight: '700' },
  chips: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginTop: 18, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1,
  },
  chipIcon: { fontSize: 14, marginRight: 6 },
  chipText: { fontSize: 13, fontWeight: '600' },
});
