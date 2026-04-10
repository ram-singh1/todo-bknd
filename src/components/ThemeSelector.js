import React from 'react';
import {
  StyleSheet, View, Text, Modal, TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { themes } from '../themes';

export default function ThemeSelector({ visible, onClose, onSelect, currentTheme }) {
  const { theme } = useTheme();

  const classicKeys = ['aurora', 'sunset', 'ocean', 'forest', 'lavender', 'midnight', 'rose', 'cosmic'];
  const relaxKeys = ['zen', 'rainyDay', 'sakura', 'northern', 'warmCandle', 'deepSea', 'dreamyPastel', 'starryNight'];

  const renderThemeGrid = (keys) => (
    <View style={styles.grid}>
      {keys.filter(key => themes[key]).map((key) => {
        const t = themes[key];
        return (
          <TouchableOpacity
            key={key}
            style={[
              styles.themeCard,
              currentTheme === key && { borderColor: t.primary, borderWidth: 2 },
            ]}
            onPress={() => { onSelect(key); onClose(); }}
          >
            <LinearGradient colors={t.colors} style={styles.themePreview}>
              <Text style={styles.themeEmoji}>{t.emoji}</Text>
              <View style={styles.themeColorRow}>
                <View style={[styles.colorDot, { backgroundColor: t.primary }]} />
                <View style={[styles.colorDot, { backgroundColor: t.secondary }]} />
                <View style={[styles.colorDot, { backgroundColor: t.accent }]} />
              </View>
            </LinearGradient>
            <Text style={[styles.themeName, { color: theme.text }]}>{t.name}</Text>
            {currentTheme === key && (
              <Text style={[styles.activeLabel, { color: t.primary }]}>Active</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.surface, borderTopColor: theme.glassBorder }]}>
        <View style={styles.handle} />
        <Text style={[styles.title, { color: theme.text }]}>Choose Theme</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={[styles.categoryLabel, { color: theme.textSecondary }]}>✨ CLASSIC</Text>
          {renderThemeGrid(classicKeys)}
          <Text style={[styles.categoryLabel, { color: theme.textSecondary, marginTop: 16 }]}>🧘 MIND RELAXING</Text>
          {renderThemeGrid(relaxKeys)}
          <View style={{ height: 20 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '75%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 20,
  },
  themeCard: {
    width: '46%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  themePreview: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  themeEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  themeColorRow: {
    flexDirection: 'row',
    gap: 4,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  themeName: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  activeLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
});
