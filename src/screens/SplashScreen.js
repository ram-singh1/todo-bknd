import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const slideUp = useRef(new Animated.Value(50)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(slideUp, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 4000, useNativeDriver: true })
    ).start();

    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient colors={theme.colors} style={styles.container}>
      {/* Floating orbs */}
      <View style={[styles.orb, styles.orb1, { backgroundColor: `${theme.primary}30` }]} />
      <View style={[styles.orb, styles.orb2, { backgroundColor: `${theme.secondary}20` }]} />
      <View style={[styles.orb, styles.orb3, { backgroundColor: `${theme.accent}15` }]} />

      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.glowCircle,
            {
              backgroundColor: `${theme.primary}15`,
              borderColor: `${theme.primary}30`,
              opacity: glowAnim,
            },
          ]}
        />
        <View style={[styles.iconContainer, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
          <Animated.Text style={[styles.mainIcon, { transform: [{ rotate: rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>✨</Animated.Text>
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideUp }],
          },
        ]}
      >
        <Text style={[styles.title, { color: theme.text }]}>AI Todo & Diary</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Your intelligent companion for{'\n'}productivity & self-reflection
        </Text>
      </Animated.View>

      <Animated.View style={[styles.bottomSection, { opacity: glowAnim }]}>
        <View style={styles.featureRow}>
          <View style={[styles.featurePill, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
            <Text style={styles.featureEmoji}>🤖</Text>
            <Text style={[styles.featureText, { color: theme.textSecondary }]}>AI Powered</Text>
          </View>
          <View style={[styles.featurePill, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
            <Text style={styles.featureEmoji}>🔒</Text>
            <Text style={[styles.featureText, { color: theme.textSecondary }]}>Encrypted</Text>
          </View>
          <View style={[styles.featurePill, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
            <Text style={styles.featureEmoji}>🎨</Text>
            <Text style={[styles.featureText, { color: theme.textSecondary }]}>Beautiful</Text>
          </View>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orb1: {
    width: 300,
    height: 300,
    top: -50,
    right: -80,
  },
  orb2: {
    width: 200,
    height: 200,
    bottom: 100,
    left: -60,
  },
  orb3: {
    width: 150,
    height: 150,
    top: height * 0.3,
    right: -30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  glowCircle: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  mainIcon: {
    fontSize: 56,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    letterSpacing: 0.3,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 60,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 10,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  featureEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  featureText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
