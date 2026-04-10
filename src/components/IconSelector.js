import React from 'react';
import {
  StyleSheet, View, Text, Modal, TouchableOpacity,
  FlatList, Dimensions,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

const ICON_SETS = [
  { label: 'Tasks', icons: ['📝', '✅', '📋', '🎯', '⚡', '🔥', '💡', '📌', '📍', '🚀'] },
  { label: 'Work', icons: ['💼', '📊', '📈', '💻', '🖥️', '📱', '🔧', '⚙️', '🏢', '📑'] },
  { label: 'Health', icons: ['💪', '🏋️', '🧘', '🏃', '🍎', '💊', '🏥', '❤️', '🌿', '🥗'] },
  { label: 'Study', icons: ['📚', '📖', '✏️', '🎓', '🔬', '🧪', '🧑‍💻', '📐', '🗒️', '💭'] },
  { label: 'Finance', icons: ['💰', '💳', '📉', '🏦', '💵', '🪙', '📊', '💹', '🏪', '🛒'] },
  { label: 'Social', icons: ['👥', '🤝', '❤️', '💬', '🥳', '🎉', '🎁', '👋', '🫂', '🌍'] },
  { label: 'Travel', icons: ['✈️', '🌍', '🗺️', '🏖️', '🏔️', '🚗', '🚢', '🏕️', '🗼', '🧳'] },
  { label: 'Home', icons: ['🏠', '🛁', '🛋️', '🧹', '🍳', '🌱', '🐾', '🔑', '💡', '🛏️'] },
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
        <View style={styles.handle} />
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
                    <Text style={styles.icon}>{icon}</Text>
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
  icon: {
    fontSize: 24,
  },
});
