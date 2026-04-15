import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { useLiquidMotion } from '../contexts/LiquidMotionContext';

// Large enough to overflow card bounds after tilt translation — clipped by overflow:hidden
const SHIMMER_SIZE = 500;

export default function GlassCard({
  children,
  style,
  onPress,
  variant = 'default',
  noPadding = false,
  glow = false,
  liquid = true,
}) {
  const { theme } = useTheme();
  const motion = useLiquidMotion();

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

  // --- Liquid motion animated styles ---

  // Outer wrapper: shadow glides with tilt, flares on shake
  const outerGlowStyle = useAnimatedStyle(() => {
    if (!motion || !liquid) {
      return glow
        ? {
            shadowColor: theme.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.35,
            shadowRadius: 20,
            elevation: 10,
          }
        : {};
    }
    const { tiltX, tiltY, shakeIntensity } = motion;
    return {
      shadowColor: theme.primary,
      shadowOffset: {
        width: tiltX.value * 14,
        height: -tiltY.value * 14,
      },
      shadowOpacity: interpolate(
        shakeIntensity.value,
        [0, 1],
        [glow ? 0.38 : 0.22, 0.85]
      ),
      shadowRadius: interpolate(
        shakeIntensity.value,
        [0, 1],
        [glow ? 20 : 14, 32]
      ),
      elevation: interpolate(
        shakeIntensity.value,
        [0, 1],
        [glow ? 10 : 6, 20]
      ),
    };
  });

  // Inner shimmer blob drifts with tilt — clipped by card overflow:hidden
  const shimmerStyle = useAnimatedStyle(() => {
    if (!motion || !liquid) return {};
    const { tiltX, tiltY } = motion;
    return {
      transform: [
        { translateX: tiltX.value * 40 },
        { translateY: -tiltY.value * 40 },
      ],
    };
  });

  // Border pulse opacity surges on shake
  const borderPulseStyle = useAnimatedStyle(() => {
    if (!motion || !liquid) return { opacity: 0 };
    return {
      opacity: interpolate(motion.shakeIntensity.value, [0, 0.25, 1], [0, 0.55, 1]),
    };
  });

  const cardContent = (
    <Animated.View style={[styles.cardOuter, outerGlowStyle, style]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: v.background,
            borderColor: v.border,
          },
          noPadding && { padding: 0 },
        ]}
      >
        {/* Base gradient sheen */}
        <LinearGradient
          colors={v.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Static top-edge highlight */}
        <View
          style={[styles.topHighlight, { backgroundColor: `${theme.primary}10` }]}
          pointerEvents="none"
        />

        {/* Liquid shimmer — large gradient blob that drifts with tilt */}
        {liquid && motion && (
          <Animated.View
            style={[styles.shimmerContainer, shimmerStyle]}
            pointerEvents="none"
          >
            <LinearGradient
              colors={[
                'transparent',
                `${theme.primary}18`,
                `${theme.secondary}28`,
                `${theme.primary}18`,
                'transparent',
              ]}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.85, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        )}

        {/* Border glow that pulses on shake */}
        {liquid && motion && (
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              styles.borderPulse,
              { borderColor: theme.primary },
              borderPulseStyle,
            ]}
            pointerEvents="none"
          />
        )}

        {children}
      </View>
    </Animated.View>
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
  cardOuter: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  card: {
    borderRadius: 24,
    padding: 18,
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
  shimmerContainer: {
    position: 'absolute',
    width: SHIMMER_SIZE,
    height: SHIMMER_SIZE,
    top: '50%',
    left: '50%',
    marginTop: -SHIMMER_SIZE / 2,
    marginLeft: -SHIMMER_SIZE / 2,
    borderRadius: SHIMMER_SIZE / 2,
    overflow: 'hidden',
  },
  borderPulse: {
    borderRadius: 20,
    borderWidth: 1.5,
  },
});
