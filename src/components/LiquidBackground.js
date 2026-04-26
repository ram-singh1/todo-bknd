import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Easing, ImageBackground, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/**
 * Animated "liquid" backdrop: soft drifting orbs over a gradient.
 * Drop-in replacement for <LinearGradient colors={theme.colors} style={styles.container}>.
 *
 * Themes can declare a `decorations` array to layer extra elements
 * (positioned orbs, horizon bands, twinkling sparkles) for a
 * scene-like, image-feel backdrop without an actual photo.
 */
export default function LiquidBackground({ children, style, intensity = 1 }) {
  const { theme } = useTheme();
  const orb1 = useRef(new Animated.Value(0)).current;
  const orb2 = useRef(new Animated.Value(0)).current;
  const orb3 = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const sparkle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [theme.name]);

  useEffect(() => {
    const spawn = (value, duration) => Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    const a = spawn(orb1, 12000);
    const b = spawn(orb2, 16000);
    const c = spawn(orb3, 20000);
    a.start(); b.start(); c.start();

    const s = Animated.loop(
      Animated.sequence([
        Animated.timing(sparkle, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(sparkle, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    s.start();

    return () => { a.stop(); b.stop(); c.stop(); s.stop(); };
  }, []);

  const orbStyle = (anim, xRange, yRange) => ({
    transform: [
      { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: xRange }) },
      { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: yRange }) },
      { scale: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.15, 1] }) },
    ],
  });

  const renderDecorations = () => {
    if (!theme.decorations || theme.decorations.length === 0) return null;
    return theme.decorations.map((d, i) => {
      if (d.kind === 'orb') {
        const left = d.x * SCREEN_W - d.size / 2;
        const top = d.y * SCREEN_H - d.size / 2;
        return (
          <View
            key={`dec-${i}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left,
              top,
              width: d.size,
              height: d.size,
              borderRadius: d.size / 2,
              backgroundColor: d.color,
              opacity: d.opacity ?? 0.5,
            }}
          />
        );
      }
      if (d.kind === 'band') {
        const top = d.y * SCREEN_H - d.height / 2;
        return (
          <LinearGradient
            key={`dec-${i}`}
            pointerEvents="none"
            colors={d.colors}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ position: 'absolute', left: 0, right: 0, top, height: d.height }}
          />
        );
      }
      if (d.kind === 'sparkle') {
        const left = d.x * SCREEN_W - d.size / 2;
        const top = d.y * SCREEN_H - d.size / 2;
        const animatedOpacity = sparkle.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.25, 0.95, 0.25],
        });
        return (
          <Animated.View
            key={`dec-${i}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left,
              top,
              width: d.size,
              height: d.size,
              borderRadius: d.size / 2,
              backgroundColor: d.color,
              opacity: animatedOpacity,
            }}
          />
        );
      }
      return null;
    });
  };

  const content = (
    <Animated.View style={[styles.animatedRoot, { opacity: fade }]}>
      {renderDecorations()}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb,
          {
            top: -80, left: -60, width: 260, height: 260,
            backgroundColor: `${theme.primary}${Math.round(intensity * 45).toString(16).padStart(2, '0')}`,
          },
          orbStyle(orb1, [0, 40], [0, 80]),
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb,
          {
            top: 220, right: -80, width: 240, height: 240,
            backgroundColor: `${theme.secondary}${Math.round(intensity * 35).toString(16).padStart(2, '0')}`,
          },
          orbStyle(orb2, [0, -50], [0, 60]),
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb,
          {
            bottom: -60, left: 40, width: 200, height: 200,
            backgroundColor: `${theme.accent}${Math.round(intensity * 30).toString(16).padStart(2, '0')}`,
          },
          orbStyle(orb3, [0, 60], [0, -40]),
        ]}
      />
      <View style={styles.content}>{children}</View>
    </Animated.View>
  );

  if (theme.backgroundImage) {
    return (
      <ImageBackground
        source={theme.backgroundImage}
        resizeMode="cover"
        style={[styles.container, style]}
      >
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: theme.overlay || 'rgba(0,0,0,0.32)' },
          ]}
        />
        {content}
      </ImageBackground>
    );
  }

  return (
    <LinearGradient
      colors={theme.colors}
      // For scene gradients with 4-5 stops, a top-to-bottom gradient
      // produces the most natural sky/horizon feel.
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.container, style]}
    >
      {content}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  animatedRoot: { flex: 1 },
  content: { flex: 1 },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.22,
  },
});
