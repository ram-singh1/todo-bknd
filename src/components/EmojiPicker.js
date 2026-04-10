import React from 'react';
import {
  StyleSheet, View, Text, Modal, TouchableOpacity,
  FlatList, Dimensions,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { emojiList } from '../themes';

const { width } = Dimensions.get('window');
const COLS = 8;
const ITEM_SIZE = (width - 80) / COLS;

export default function EmojiPicker({ visible, onClose, onSelect }) {
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
        <Text style={[styles.title, { color: theme.text }]}>Choose Emoji</Text>
        <FlatList
          data={emojiList}
          numColumns={COLS}
          keyExtractor={(item, i) => `${item}-${i}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.emojiBtn}
              onPress={() => { onSelect(item); onClose(); }}
            >
              <Text style={styles.emoji}>{item}</Text>
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.grid}
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
    maxHeight: '70%',
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
  grid: {
    paddingBottom: 20,
  },
  emojiBtn: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 26,
  },
});
