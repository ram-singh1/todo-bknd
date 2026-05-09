import React from 'react';
import {
  StyleSheet, View, Text, Modal, TouchableOpacity,
  FlatList, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

const ICON_SETS = [
  { label: 'Tasks', icons: ['document-text-outline', 'checkmark-circle-outline', 'clipboard-outline', 'radio-button-on-outline', 'flash-outline', 'flame-outline', 'bulb-outline', 'pin-outline', 'location-outline', 'rocket-outline'] },
  { label: 'Work', icons: ['briefcase-outline', 'stats-chart-outline', 'trending-up-outline', 'laptop-outline', 'desktop-outline', 'phone-portrait-outline', 'construct-outline', 'settings-outline', 'business-outline', 'reader-outline'] },
  { label: 'Health', icons: ['fitness-outline', 'barbell-outline', 'body-outline', 'walk-outline', 'nutrition-outline', 'medical-outline', 'medkit-outline', 'heart-outline', 'leaf-outline', 'restaurant-outline'] },
  { label: 'Study', icons: ['library-outline', 'book-outline', 'pencil-outline', 'school-outline', 'flask-outline', 'beaker-outline', 'code-slash-outline', 'triangle-outline', 'newspaper-outline', 'chatbubble-ellipses-outline'] },
  { label: 'Finance', icons: ['cash-outline', 'card-outline', 'trending-down-outline', 'business-outline', 'wallet-outline', 'ellipse-outline', 'stats-chart-outline', 'analytics-outline', 'storefront-outline', 'cart-outline'] },
  { label: 'Social', icons: ['people-outline', 'hand-left-outline', 'heart-outline', 'chatbubble-outline', 'sparkles-outline', 'gift-outline', 'hand-right-outline', 'people-circle-outline', 'earth-outline'] },
  { label: 'Travel', icons: ['airplane-outline', 'earth-outline', 'map-outline', 'sunny-outline', 'trail-sign-outline', 'car-outline', 'boat-outline', 'bonfire-outline', 'navigate-outline', 'bag-handle-outline'] },
  { label: 'Home', icons: ['home-outline', 'water-outline', 'albums-outline', 'brush-outline', 'egg-outline', 'leaf-outline', 'paw-outline', 'key-outline', 'bulb-outline', 'bed-outline'] },
];

export default function IconSelector({ visible, onClose, onSelect }) {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={[styles.sheet, { backgroundColor: theme.surface, borderTopColor: theme.glassBorder }]}>
        <View style={[styles.handle, { backgroundColor: theme.mode === 'light' ? 'rgba(15,23,42,0.2)' : 'rgba(255,255,255,0.2)' }]} />
        <Text style={[styles.title, { color: theme.text }]}>Choose Icon</Text>
        <FlatList
          data={ICON_SETS}
          keyExtractor={(item) => item.label}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: section }) => (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>{section.label}</Text>
              <View style={styles.iconRow}>
                {section.icons.map((icon, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.iconBtn, { backgroundColor: theme.inputBg }]}
                    onPress={() => { onSelect(icon); onClose(); }}
                  >
                    <Ionicons name={icon} size={24} color={theme.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        />
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
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  iconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
