import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, ScrollView, KeyboardAvoidingView,
  Platform, TouchableOpacity, Alert, Dimensions, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import GlassCard from '../components/GlassCard';
import GlassInput from '../components/GlassInput';
import GlassButton from '../components/GlassButton';

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const { theme } = useTheme();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const orb1Anim = useRef(new Animated.Value(0)).current;
  const orb2Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb1Anim, { toValue: 1, duration: 6000, useNativeDriver: true }),
        Animated.timing(orb1Anim, { toValue: 0, duration: 6000, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb2Anim, { toValue: 1, duration: 8000, useNativeDriver: true }),
        Animated.timing(orb2Anim, { toValue: 0, duration: 8000, useNativeDriver: true }),
      ])
    ).start();
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
      Alert.alert('Login Failed', error.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={theme.colors} style={styles.container}>
      {/* Animated decorative orbs */}
      <Animated.View style={[styles.orb, { backgroundColor: `${theme.primary}20`, top: -40, right: -60, width: 200, height: 200, transform: [{ translateY: orb1Anim.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }] }]} />
      <Animated.View style={[styles.orb, { backgroundColor: `${theme.secondary}15`, bottom: 50, left: -40, width: 160, height: 160, transform: [{ translateX: orb2Anim.interpolate({ inputRange: [0, 1], outputRange: [0, 15] }) }] }]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Animated.View style={[styles.iconWrap, { backgroundColor: theme.glass, borderColor: theme.glassBorder, transform: [{ scale: pulseAnim }] }]}>
              <Text style={styles.headerEmoji}>👋</Text>
            </Animated.View>
            <Text style={[styles.title, { color: theme.text }]}>Welcome Back!</Text>
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
              title="Sign In"
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
          <GlassCard variant="light" onPress={() => navigation.navigate('Signup')} style={styles.signupCard}>
            <View style={styles.signupRow}>
              <Text style={[styles.signupText, { color: theme.textSecondary }]}>
                Don't have an account?
              </Text>
              <Text style={[styles.signupLink, { color: theme.primary }]}> Create one</Text>
              <Ionicons name="arrow-forward" size={16} color={theme.primary} style={{ marginLeft: 4 }} />
            </View>
          </GlassCard>

          {/* Features */}
          <View style={styles.features}>
            {[
              { icon: '🤖', text: 'AI Task Generation' },
              { icon: '🔒', text: 'Encrypted Diary' },
              { icon: '🔔', text: 'Smart Reminders' },
            ].map((f, i) => (
              <View
                key={i}
                style={[styles.featureItem, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}
              >
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <Text style={[styles.featureText, { color: theme.textSecondary }]}>{f.text}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  orb: { position: 'absolute', borderRadius: 999 },
  keyboardView: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingVertical: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 12,
  },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 24,
  },
  headerEmoji: { fontSize: 40 },
  title: {
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    letterSpacing: 0.3,
  },
  formCard: {
    marginBottom: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 16, fontSize: 13, fontWeight: '600' },
  signupCard: {
    marginBottom: 24,
  },
  signupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupText: { fontSize: 15 },
  signupLink: { fontSize: 15, fontWeight: '700' },
  features: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    margin: 4,
  },
  featureIcon: { fontSize: 14, marginRight: 6 },
  featureText: { fontSize: 12, fontWeight: '500' },
});
