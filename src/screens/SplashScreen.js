import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, Dimensions, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import LiquidBackground from '../components/LiquidBackground';

const { height } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const slideUp = useRef(new Animated.Value(50)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true })
    ).start();

    Animated.timing(progress, {
      toValue: 1,
      duration: 2600,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start();

    const timer = setTimeout(() => navigation.replace('Login'), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <LiquidBackground intensity={1.2}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoContainer,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Outer ring with gradient */}
          <Animated.View
            style={[
              styles.glowRing,
              {
                opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.85] }),
                transform: [{
                  rotate: rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }),
                }],
              },
            ]}
          >
            <LinearGradient
              colors={[theme.primary, 'transparent', theme.secondary, 'transparent', theme.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <View style={[styles.iconContainer, { backgroundColor: theme.background, borderColor: theme.glassBorder }]}>
            <Text style={styles.mainIcon}>✨</Text>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.textContainer,
            { opacity: fadeAnim, transform: [{ translateY: slideUp }] },
          ]}
        >
          <Text style={[styles.title, { color: theme.text }]}>Todo & Diary</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Liquid glass productivity{'\n'}for your mind
          </Text>
        </Animated.View>

        <Animated.View style={[styles.bottomSection, { opacity: glowAnim }]}>
          <View style={styles.featureRow}>
            {[
              { emoji: '📋', text: 'Smart Tasks' },
              { emoji: '🔒', text: 'Encrypted' },
              { emoji: '✨', text: 'Glass Themes' },
            ].map((f, i) => (
              <View
                key={i}
                style={[styles.featurePill, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}
              >
                <Text style={styles.featureEmoji}>{f.emoji}</Text>
                <Text style={[styles.featureText, { color: theme.textSecondary }]}>{f.text}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.progressTrack, { backgroundColor: theme.inputBg }]}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: theme.primary,
                  width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                },
              ]}
            />
          </View>
        </Animated.View>
      </View>
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    width: 160,
    height: 160,
  },
  glowRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    overflow: 'hidden',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  mainIcon: { fontSize: 58 },
  textContainer: { alignItems: 'center', marginBottom: 60 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: 0.5, marginBottom: 10 },
  subtitle: {
    fontSize: 15, textAlign: 'center', lineHeight: 22, letterSpacing: 0.3,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 60,
    width: '100%',
    alignItems: 'center',
  },
  featureRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  featureEmoji: { fontSize: 14, marginRight: 6 },
  featureText: { fontSize: 12, fontWeight: '600' },
  progressTrack: {
    width: 160,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
