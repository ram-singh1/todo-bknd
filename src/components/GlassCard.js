import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

export default function GlassCard({
  children,
  style,
  onPress,
  variant = 'default',
  noPadding = false,
  glow = false,
}) {
  const { theme } = useTheme();

  const variants = {
    default: {
      background: theme.glass,
      border: theme.glassBorder,
      gradientColors: [`${theme.primary}08`, `${theme.secondary}05`, 'transparent'],
    },
    light: {
      background: theme.glassLight,
      border: 'rgba(255, 255, 255, 0.12)',
      gradientColors: ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)', 'transparent'],
    },
    solid: {
      background: theme.card,
      border: theme.glassBorder,
      gradientColors: [`${theme.primary}06`, 'transparent', 'transparent'],
    },
    accent: {
      background: `${theme.primary}15`,
      border: `${theme.primary}40`,
      gradientColors: [`${theme.primary}12`, `${theme.secondary}08`, 'transparent'],
    },
    frosted: {
      background: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(255, 255, 255, 0.15)',
      gradientColors: ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)', 'transparent'],
    },
  };

  const v = variants[variant] || variants.default;

  const cardContent = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: v.background,
          borderColor: v.border,
        },
        noPadding && { padding: 0 },
        glow && {
          shadowColor: theme.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.35,
          shadowRadius: 20,
          elevation: 10,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={v.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={[styles.topHighlight, { backgroundColor: `${theme.primary}10` }]} pointerEvents="none" />
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    borderRadius: 1,
  },
});
