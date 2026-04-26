import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, Animated, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';

const LABELS = {
  free: { text: 'FREE', icon: null, gradient: ['#6b7280', '#4b5563'] },
  trial: { text: 'TRIAL', icon: 'timer-outline', gradient: ['#FB923C', '#F97316'] },
  pro: { text: 'PRO', icon: 'sparkles', gradient: ['#6C63FF', '#A78BFA'] },
  ultimate: { text: 'ULTIMATE', icon: 'diamond', gradient: ['#F59E0B', '#F43F5E'] },
};

export default function PremiumBadge({ compact = false, size = 'medium', plan: planProp, showLabel = true }) {
  const { theme } = useTheme();
  const sub = useSubscription();
  const plan = planProp || sub.plan || 'free';
  const label = LABELS[plan] || LABELS.free;

  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (plan === 'free') return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    ).start();
  }, [plan]);

  const sizes = {
    small: { padH: 8, padV: 3, fs: 10, icon: 10 },
    medium: { padH: 10, padV: 4, fs: 11, icon: 12 },
    large: { padH: 14, padV: 6, fs: 13, icon: 14 },
  };
  const s = sizes[size] || sizes.medium;

  if (compact) {
    return (
      <LinearGradient
        colors={label.gradient}
        style={[styles.dot, { padding: s.padV }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {label.icon && <Ionicons name={label.icon} size={s.icon} color="#fff" />}
      </LinearGradient>
    );
  }

  return (
    <Animated.View
      style={{
        transform: [{ scale: shimmer.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }],
        shadowColor: label.gradient[0],
        shadowOpacity: 0.35,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      <LinearGradient
        colors={label.gradient}
        style={[styles.badge, { paddingHorizontal: s.padH, paddingVertical: s.padV }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {label.icon && <Ionicons name={label.icon} size={s.icon} color="#fff" style={{ marginRight: 4 }} />}
        {showLabel && <Text style={[styles.text, { fontSize: s.fs }]}>{label.text}</Text>}
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  dot: {
    borderRadius: 999,
    width: 24, height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 1,
  },
});
