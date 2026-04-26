import React from 'react';
import { Platform, StyleSheet, View, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { useLiquidMotion } from '../contexts/LiquidMotionContext';

// Large enough to drift a bit past card bounds; clipped by the card's overflow:hidden.
const SHIMMER_SIZE = 420;

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
      background: theme.mode === 'light' ? 'rgba(255,255,255,0.82)' : withAlpha(theme.card, 0.88),
      border: theme.mode === 'light' ? 'rgba(15,23,42,0.10)' : theme.glassBorder,
      gradientColors: [`${theme.primary}10`, `${theme.secondary}08`, 'transparent'],
    },
    light: {
      background: theme.mode === 'light' ? 'rgba(255,255,255,0.72)' : withAlpha(theme.surface, 0.78),
      border: theme.mode === 'light' ? 'rgba(15,23,42,0.09)' : 'rgba(255, 255, 255, 0.10)',
      gradientColors: theme.mode === 'light'
        ? ['rgba(255,255,255,0.34)', 'rgba(255,255,255,0.10)', 'transparent']
        : ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)', 'transparent'],
    },
    solid: {
      background: theme.mode === 'light' ? 'rgba(255,255,255,0.92)' : withAlpha(theme.card, 0.96),
      border: theme.mode === 'light' ? 'rgba(15,23,42,0.11)' : theme.glassBorder,
      gradientColors: [`${theme.primary}08`, 'transparent', 'transparent'],
    },
    accent: {
      background: `${theme.primary}26`,
      border: `${theme.primary}45`,
      gradientColors: [`${theme.primary}14`, `${theme.secondary}0C`, 'transparent'],
    },
    frosted: {
      background: theme.mode === 'light' ? 'rgba(255,255,255,0.62)' : withAlpha(theme.surface, 0.65),
      border: theme.mode === 'light' ? 'rgba(15,23,42,0.09)' : 'rgba(255, 255, 255, 0.14)',
      gradientColors: ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)', 'transparent'],
    },
  };

  const v = variants[variant] || variants.default;

  // No card shadow. On Android, elevation + a tinted shadowColor renders a
  // solid-colored rectangle behind the card (not a soft blur), which looked
  // like a duplicate box on every screen. Cards read cleanly from the
  // background via backgroundColor + border alone.
  const shadowStyle = useAnimatedStyle(() => {
    if (Platform.OS === 'android' || !glow) {
      return {};
    }
    // iOS only: a soft black shadow for `glow` cards (e.g. trial banner,
    // paywall sheet). Never primary-tinted, never animated.
    if (!motion || !liquid) {
      return {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
      };
    }
    return {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: interpolate(motion.shakeIntensity.value, [0, 1], [0.18, 0.32]),
      shadowRadius: interpolate(motion.shakeIntensity.value, [0, 1], [16, 22]),
    };
  });

  const shimmerStyle = useAnimatedStyle(() => {
    if (!motion || !liquid) return {};
    const { tiltX, tiltY } = motion;
    return {
      transform: [
        { translateX: tiltX.value * 24 },
        { translateY: -tiltY.value * 24 },
      ],
    };
  });

  const borderPulseStyle = useAnimatedStyle(() => {
    if (!motion || !liquid) return { opacity: 0 };
    return {
      opacity: interpolate(motion.shakeIntensity.value, [0, 0.25, 1], [0, 0.4, 0.8]),
    };
  });

  // Single-view card: shadow + clipping + user style all on one node, so
  // layout props (flexDirection, padding, alignItems) from the caller
  // actually affect the content container.
  const cardNode = (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: v.background,
          borderColor: v.border,
        },
        noPadding && { padding: 0 },
        shadowStyle,
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

      <View
        style={[styles.topHighlight, { backgroundColor: `${theme.primary}18` }]}
        pointerEvents="none"
      />

      {liquid && motion && (
        <Animated.View
          style={[styles.shimmerContainer, shimmerStyle]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={[
              'transparent',
              `${theme.primary}12`,
              `${theme.secondary}1A`,
              `${theme.primary}12`,
              'transparent',
            ]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}

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
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.75} onPress={onPress}>
        {cardNode}
      </TouchableOpacity>
    );
  }

  return cardNode;
}

function withAlpha(color, alpha) {
  if (!color) return `rgba(20, 20, 30, ${alpha})`;
  if (color.startsWith('rgba')) {
    return color.replace(/rgba\(([^)]+)\)/, (_, inner) => {
      const parts = inner.split(',').map((p) => p.trim());
      return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
    });
  }
  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
  }
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const full = hex.length === 3
      ? hex.split('').map((c) => c + c).join('')
      : hex.slice(0, 6);
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
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
    borderRadius: 22,
    borderWidth: 1.5,
  },
});
