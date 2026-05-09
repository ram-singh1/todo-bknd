import React from 'react';
import { Platform, StyleSheet, TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
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
    small: { paddingVertical: 10, paddingHorizontal: 18, fontSize: 13, iconSize: 16 },
    medium: { paddingVertical: 16, paddingHorizontal: 26, fontSize: 15, iconSize: 20 },
    large: { paddingVertical: 18, paddingHorizontal: 32, fontSize: 17, iconSize: 22 },
  };

  const s = sizeStyles[size] || sizeStyles.medium;

  const getVariantStyle = () => {
    switch (variant) {
      case 'primary':
        return {
          gradientColors: [theme.primary, theme.secondary],
          backgroundColor: theme.primary,
          textColor: '#FFFFFF',
          borderColor: 'transparent',
          raised: true,
        };
      case 'glass':
        return {
          gradientColors: [`${theme.primary}1F`, `${theme.secondary}18`],
          backgroundColor: theme.inputBg,
          textColor: theme.primary,
          borderColor: `${theme.primary}66`,
          raised: false,
        };
      case 'outline':
        return {
          gradientColors: ['transparent', 'transparent'],
          backgroundColor: 'transparent',
          textColor: theme.primary,
          borderColor: theme.primary,
          raised: false,
        };
      case 'danger':
        return {
          gradientColors: [theme.danger, '#DC2626'],
          backgroundColor: theme.danger,
          textColor: '#FFFFFF',
          borderColor: 'transparent',
          raised: true,
        };
      case 'ghost':
        return {
          gradientColors: ['transparent', 'transparent'],
          backgroundColor: 'transparent',
          textColor: theme.textSecondary,
          borderColor: 'transparent',
          raised: false,
        };
      default:
        return {
          gradientColors: [theme.primary, theme.secondary],
          backgroundColor: theme.primary,
          textColor: '#FFFFFF',
          borderColor: 'transparent',
          raised: true,
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
            backgroundColor: v.backgroundColor,
            paddingVertical: s.paddingVertical,
            paddingHorizontal: s.paddingHorizontal,
            borderColor: v.borderColor,
            borderWidth: v.borderColor !== 'transparent' ? 1 : 0,
            opacity: disabled ? 0.6 : 1,
          },
          v.raised ? styles.raisedButton : styles.flatButton,
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
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 52,
    overflow: 'hidden',
  },
  raisedButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: Platform.OS === 'android' ? 0 : 0.12,
    shadowRadius: 12,
    elevation: Platform.OS === 'android' ? 0 : 5,
  },
  flatButton: {
    shadowOpacity: 0,
    elevation: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0,
    backgroundColor: 'transparent',
    textAlign: 'center',
  },
});
