import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, ScrollView, KeyboardAvoidingView,
  Platform, Alert, Dimensions, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import GlassCard from '../components/GlassCard';
import GlassInput from '../components/GlassInput';
import GlassButton from '../components/GlassButton';

export default function SignupScreen({ navigation }) {
  const { theme } = useTheme();
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      await signup(name.trim(), email.trim().toLowerCase(), password);
    } catch (error) {
      Alert.alert('Signup Failed', error.message || 'Could not create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={theme.colors} style={styles.container}>
      <View style={[styles.orb, { backgroundColor: `${theme.accent}20`, top: -30, left: -50, width: 200, height: 200 }]} />
      <View style={[styles.orb, { backgroundColor: `${theme.primary}15`, bottom: 80, right: -40, width: 180, height: 180 }]} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={[styles.iconWrap, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
              <Text style={styles.headerEmoji}>🚀</Text>
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Start your journey to better productivity
            </Text>
          </Animated.View>

          {/* Form */}
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

            <GlassButton
              title="Create Account"
              onPress={handleSignup}
              loading={loading}
              icon="person-add-outline"
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

          {/* Login link */}
          <GlassCard variant="light" onPress={() => navigation.navigate('Login')}>
            <View style={styles.linkRow}>
              <Text style={[styles.linkText, { color: theme.textSecondary }]}>
                Already have an account?
              </Text>
              <Text style={[styles.linkAction, { color: theme.primary }]}> Sign in</Text>
              <Ionicons name="arrow-forward" size={16} color={theme.primary} style={{ marginLeft: 4 }} />
            </View>
          </GlassCard>

          {/* Benefits */}
          <View style={styles.benefitsSection}>
            <Text style={[styles.benefitsTitle, { color: theme.textMuted }]}>WHAT YOU GET</Text>
            {[
              { emoji: '🤖', title: 'AI-Powered Tasks', desc: 'Let AI plan your day' },
              { emoji: '📔', title: 'Encrypted Diary', desc: 'Your thoughts, fully private' },
              { emoji: '⏰', title: 'Smart Reminders', desc: 'Never miss anything important' },
              { emoji: '🎨', title: '16 Beautiful Themes', desc: 'Personalize your experience' },
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  orb: { position: 'absolute', borderRadius: 999 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingVertical: 50,
  },
  header: { alignItems: 'center', marginBottom: 28 },
  iconWrap: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginBottom: 20,
  },
  headerEmoji: { fontSize: 40 },
  title: { fontSize: 30, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 16, letterSpacing: 0.3, textAlign: 'center' },
  formCard: { marginBottom: 20 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 16, fontSize: 13, fontWeight: '600' },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  linkText: { fontSize: 15 },
  linkAction: { fontSize: 15, fontWeight: '700' },
  benefitsSection: { marginTop: 28 },
  benefitsTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 16 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  benefitEmoji: { fontSize: 24, marginRight: 14 },
  benefitText: { flex: 1 },
  benefitTitle: { fontSize: 15, fontWeight: '600' },
  benefitDesc: { fontSize: 13, marginTop: 2 },
});
