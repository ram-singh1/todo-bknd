import React, { useState, useRef } from 'react';
import {
  StyleSheet, View, Text, ScrollView, KeyboardAvoidingView,
  Platform, Alert, TouchableOpacity, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import GlassCard from '../components/GlassCard';
import GlassInput from '../components/GlassInput';
import GlassButton from '../components/GlassButton';
import EmojiPicker from '../components/EmojiPicker';
import api from '../api/client';
import { moodConfig, diaryColors } from '../themes';

export default function AddDiaryScreen({ navigation }) {
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('neutral');
  const [selectedColor, setSelectedColor] = useState(theme.primary);
  const [tags, setTags] = useState('');
  const [emojis, setEmojis] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [fontStyle, setFontStyle] = useState('default');
  const [loading, setLoading] = useState(false);
  const [writingLang, setWritingLang] = useState('en');

  // Writing prompts to inspire
  const writingPrompts = [
    '✨ What made you smile today?',
    '🌟 What are you grateful for?',
    '💭 What\'s on your mind right now?',
    '🎯 What did you accomplish today?',
    '🌈 Describe one beautiful moment today',
    '💪 What challenge did you overcome?',
    '🙏 Who would you like to thank today?',
    '🔮 What are you looking forward to?',
  ];
  const [currentPrompt] = useState(writingPrompts[Math.floor(Math.random() * writingPrompts.length)]);

  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const charCount = content.length;

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please give your entry a title');
      return;
    }
    if (!content.trim()) {
      Alert.alert('Missing Content', 'Write something in your diary');
      return;
    }

    setLoading(true);
    try {
      const diaryData = {
        title: title.trim(),
        content: content.trim(),
        mood,
        moodEmoji: moodConfig[mood]?.emoji || '😐',
        color: selectedColor,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        emojis,
        isFavorite,
        fontStyle,
        isEncrypted: true,
      };

      await api.post('/diary', diaryData);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to save entry');
    } finally {
      setLoading(false);
    }
  };

  const fontStyles = [
    { key: 'default', label: 'Default', icon: 'text' },
    { key: 'serif', label: 'Serif', icon: 'book' },
    { key: 'handwriting', label: 'Cursive', icon: 'brush' },
    { key: 'monospace', label: 'Mono', icon: 'code' },
  ];

  const getFontFamily = () => {
    switch (fontStyle) {
      case 'serif': return Platform.OS === 'ios' ? 'Georgia' : 'serif';
      case 'handwriting': return Platform.OS === 'ios' ? 'Snell Roundhand' : 'cursive';
      case 'monospace': return Platform.OS === 'ios' ? 'Menlo' : 'monospace';
      default: return undefined;
    }
  };

  return (
    <LinearGradient colors={theme.colors} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>✍️ New Entry</Text>
        <TouchableOpacity onPress={() => setIsFavorite(!isFavorite)}>
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={24}
            color={isFavorite ? '#F43F5E' : theme.textMuted}
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Mood Selector */}
          <GlassCard variant="solid" style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>HOW ARE YOU FEELING?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.moodRow}>
                {Object.entries(moodConfig).map(([key, m]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.moodBtn,
                      {
                        backgroundColor: mood === key ? `${m.color}25` : theme.inputBg,
                        borderColor: mood === key ? m.color : 'transparent',
                        borderWidth: mood === key ? 2 : 1,
                      },
                    ]}
                    onPress={() => { setMood(key); Haptics.selectionAsync(); }}
                  >
                    <Text style={styles.moodEmoji}>{m.emoji}</Text>
                    <Text style={[styles.moodLabel, { color: mood === key ? m.color : theme.textMuted }]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </GlassCard>

          {/* Title */}
          <GlassCard variant="solid" style={styles.section}>
            <GlassInput
              label="Title"
              value={title}
              onChangeText={setTitle}
              placeholder="Give this entry a title..."
              icon="create-outline"
              maxLength={200}
            />
          </GlassCard>

          {/* Font Style */}
          <GlassCard variant="solid" style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>FONT STYLE</Text>
            <View style={styles.fontRow}>
              {fontStyles.map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={[
                    styles.fontBtn,
                    {
                      backgroundColor: fontStyle === f.key ? `${theme.primary}25` : theme.inputBg,
                      borderColor: fontStyle === f.key ? theme.primary : 'transparent',
                    },
                  ]}
                  onPress={() => setFontStyle(f.key)}
                >
                  <Ionicons name={f.icon} size={18} color={fontStyle === f.key ? theme.primary : theme.textMuted} />
                  <Text style={[styles.fontLabel, { color: fontStyle === f.key ? theme.primary : theme.textMuted }]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>

          {/* Content */}
          <GlassCard variant="solid" style={styles.section}>
            <View style={styles.contentHeader}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>YOUR THOUGHTS</Text>
              <View style={styles.contentStats}>
                <Text style={[styles.wordCount, { color: theme.textMuted }]}>{wordCount} words</Text>
                <Text style={[styles.wordCount, { color: theme.textMuted }]}> · {charCount} chars</Text>
              </View>
            </View>

            {/* Writing Language */}
            <View style={styles.langRow}>
              <Text style={[styles.langLabel, { color: theme.textMuted }]}>Write in:</Text>
              {[
                { key: 'en', label: 'English', flag: '🇬🇧' },
                { key: 'hi', label: 'Hindi', flag: '🇮🇳' },
                { key: 'mixed', label: 'Mix', flag: '🌐' },
              ].map(l => (
                <TouchableOpacity
                  key={l.key}
                  style={[styles.langPill, {
                    backgroundColor: writingLang === l.key ? `${theme.primary}30` : theme.inputBg,
                    borderColor: writingLang === l.key ? theme.primary : 'transparent',
                  }]}
                  onPress={() => setWritingLang(l.key)}
                >
                  <Text style={styles.langFlag}>{l.flag}</Text>
                  <Text style={[styles.langText, { color: writingLang === l.key ? theme.primary : theme.textMuted }]}>
                    {l.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Writing prompt inspiration */}
            <GlassCard variant="frosted" style={styles.promptCard}>
              <Text style={[styles.promptText, { color: theme.textSecondary }]}>
                {currentPrompt}
              </Text>
            </GlassCard>

            <GlassInput
              value={content}
              onChangeText={setContent}
              placeholder={writingLang === 'hi'
                ? 'अपने दिल की बात लिखें... 💭'
                : writingLang === 'mixed'
                ? 'Type in English ya Hindi... 💭'
                : 'Write your heart out... 💭\n\nWhat happened today? How do you feel? What are you grateful for?'
              }
              multiline
              numberOfLines={12}
              inputStyle={{ fontFamily: getFontFamily(), lineHeight: 26 }}
            />
          </GlassCard>

          {/* Emojis */}
          <GlassCard variant="solid" style={styles.section}>
            <View style={styles.emojiHeader}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>ADD EMOJIS</Text>
              <TouchableOpacity onPress={() => setShowEmojiPicker(true)}>
                <Text style={[styles.addEmojiBtn, { color: theme.primary }]}>+ Add</Text>
              </TouchableOpacity>
            </View>
            {emojis.length > 0 && (
              <View style={styles.emojiDisplay}>
                {emojis.map((e, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setEmojis(emojis.filter((_, idx) => idx !== i))}
                    style={[styles.emojiChip, { backgroundColor: theme.inputBg }]}
                  >
                    <Text style={styles.emojiChipText}>{e}</Text>
                    <Ionicons name="close" size={12} color={theme.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </GlassCard>

          {/* Color */}
          <GlassCard variant="solid" style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>ENTRY COLOR</Text>
            <View style={styles.colorRow}>
              {diaryColors.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorDot,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorDotActive,
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && (
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>

          {/* Tags */}
          <GlassCard variant="solid" style={styles.section}>
            <GlassInput
              label="Tags"
              value={tags}
              onChangeText={setTags}
              placeholder="personal, gratitude, goals (comma separated)"
              icon="pricetag-outline"
            />
          </GlassCard>

          {/* Encryption notice */}
          <GlassCard variant="accent" style={styles.section}>
            <View style={styles.encryptRow}>
              <Ionicons name="shield-checkmark" size={20} color={theme.success} />
              <Text style={[styles.encryptText, { color: theme.textSecondary }]}>
                Your diary will be encrypted and stored securely. Only you can read it.
              </Text>
            </View>
          </GlassCard>

          {/* Save */}
          <GlassButton
            title="Save Entry 💾"
            onPress={handleSave}
            loading={loading}
            fullWidth
            size="large"
            style={styles.saveBtn}
          />

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <EmojiPicker
        visible={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onSelect={(emoji) => setEmojis([...emojis, emoji])}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  scroll: { paddingHorizontal: 20 },
  section: { marginBottom: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  moodRow: { flexDirection: 'row', gap: 8 },
  moodBtn: {
    alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14,
  },
  moodEmoji: { fontSize: 28, marginBottom: 4  },
  moodLabel: { fontSize: 11, fontWeight: '600' },
  fontRow: { flexDirection: 'row', gap: 8 },
  fontBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1, gap: 4,
  },
  fontLabel: { fontSize: 11, fontWeight: '600' },
  contentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  contentStats: { flexDirection: 'row', alignItems: 'center' },
  wordCount: { fontSize: 12, fontWeight: '500' },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  langLabel: { fontSize: 12, fontWeight: '600', marginRight: 4 },
  langPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, gap: 4 },
  langFlag: { fontSize: 14 },
  langText: { fontSize: 11, fontWeight: '600' },
  promptCard: { marginBottom: 12, padding: 12 },
  promptText: { fontSize: 13, fontStyle: 'italic', textAlign: 'center', lineHeight: 20 },
  emojiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addEmojiBtn: { fontSize: 14, fontWeight: '600' },
  emojiDisplay: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  emojiChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, gap: 4,
  },
  emojiChipText: { fontSize: 20 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorDot: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
  },
  colorDotActive: {
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)',
  },
  encryptRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  encryptText: { flex: 1, fontSize: 13, lineHeight: 20 },
  saveBtn: { marginTop: 8 },
});
