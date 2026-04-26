import React, { useState } from 'react';
import { StyleSheet, View, TextInput, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function GlassInput({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  secureTextEntry = false,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  maxLength,
  style,
  inputStyle,
  error,
  rightIcon,
  onRightIconPress,
}) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.inputBg,
            borderColor: error
              ? theme.danger
              : focused
              ? theme.primary
              : theme.glassBorder,
            borderWidth: focused ? 1.5 : 1,
          },
          multiline && { minHeight: numberOfLines * 24 + 32, alignItems: 'flex-start' },
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={focused ? theme.primary : theme.textMuted}
            style={[styles.icon, multiline && { marginTop: 14 }]}
          />
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          secureTextEntry={secureTextEntry && !showPassword}
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          underlineColorAndroid="transparent"
          selectionColor={theme.primary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.input,
            {
              color: theme.text,
            },
            multiline && {
              textAlignVertical: 'top',
              paddingTop: 14,
              minHeight: numberOfLines * 24,
            },
            inputStyle,
          ]}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color={theme.textMuted}
            />
          </TouchableOpacity>
        )}
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.eyeIcon}>
            <Ionicons name={rightIcon} size={20} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>
      )}
      {maxLength && value && (
        <Text style={[styles.counter, { color: theme.textMuted }]}>
          {value.length}/{maxLength}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    // Clip native TextInput's default background/underline to the rounded
    // corners. Inputs stay flat — no elevation — so there's no Android
    // shadow-clipping artifact to worry about.
    overflow: 'hidden',
  },
  icon: {
    marginLeft: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: '#FFFFFF',
  },
  eyeIcon: {
    paddingRight: 16,
    paddingVertical: 14,
  },
  error: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  counter: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
  },
});
