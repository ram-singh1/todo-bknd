import React from 'react';
import { StyleSheet, TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function GlassButton({
  title,
  onPress,
  icon,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
}) {
  const { theme } = useTheme();

  const sizeStyles = {
    small: { paddingVertical: 8, paddingHorizontal: 16, fontSize: 13, iconSize: 16 },
    medium: { paddingVertical: 14, paddingHorizontal: 24, fontSize: 15, iconSize: 20 },
    large: { paddingVertical: 18, paddingHorizontal: 32, fontSize: 17, iconSize: 22 },
  };

  const s = sizeStyles[size] || sizeStyles.medium;

  const getVariantStyle = () => {
    switch (variant) {
      case 'primary':
        return {
          gradientColors: [theme.primary, theme.secondary],
          textColor: '#FFFFFF',
          borderColor: 'transparent',
        };
      case 'glass':
        return {
          gradientColors: [theme.glass, theme.glass],
          textColor: theme.text,
          borderColor: theme.glassBorder,
        };
      case 'outline':
        return {
          gradientColors: ['transparent', 'transparent'],
          textColor: theme.primary,
          borderColor: theme.primary,
        };
      case 'danger':
        return {
          gradientColors: [theme.danger, '#DC2626'],
          textColor: '#FFFFFF',
          borderColor: 'transparent',
        };
      case 'ghost':
        return {
          gradientColors: ['transparent', 'transparent'],
          textColor: theme.textSecondary,
          borderColor: 'transparent',
        };
      default:
        return {
          gradientColors: [theme.primary, theme.secondary],
          textColor: '#FFFFFF',
          borderColor: 'transparent',
        };
    }
  };

  const v = getVariantStyle();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled || loading}
      style={[fullWidth && { width: '100%' }, style]}
    >
      <LinearGradient
        colors={v.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.button,
          {
            paddingVertical: s.paddingVertical,
            paddingHorizontal: s.paddingHorizontal,
            borderColor: v.borderColor,
            borderWidth: v.borderColor !== 'transparent' ? 1 : 0,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={v.textColor} size="small" />
        ) : (
          <View style={styles.content}>
            {icon && (
              <Ionicons
                name={icon}
                size={s.iconSize}
                color={v.textColor}
                style={{ marginRight: title ? 8 : 0 }}
              />
            )}
            {title && (
              <Text style={[styles.text, { color: v.textColor, fontSize: s.fontSize }, textStyle]}>
                {title}
              </Text>
            )}
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
