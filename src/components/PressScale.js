import React from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/**
 * Press feedback that squishes its child slightly on press-in and snaps back.
 * Uses a quick timing for press-in (snappy) and a bouncy spring for release.
 * Add `minScale` to tune the depth — default feels right for cards/buttons.
 */
export default function PressScale({
  children,
  onPress,
  onLongPress,
  style,
  pressableStyle,
  minScale = 0.96,
  disabled = false,
  hitSlop,
  accessibilityLabel,
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      onPressIn={() => {
        if (disabled) return;
        scale.value = withTiming(minScale, { duration: 90 });
      }}
      onPressOut={() => {
        if (disabled) return;
        scale.value = withSpring(1, { damping: 14, stiffness: 260, mass: 0.7 });
      }}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={pressableStyle}
    >
      <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>
    </Pressable>
  );
}
