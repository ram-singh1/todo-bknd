import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import LiquidBackground from '../components/LiquidBackground';
import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import PressScale from '../components/PressScale';
import api from '../api/client';

const DRAFT_KEY = 'brain_dump_draft';
// Auto-save the draft while typing so a force-quit doesn't lose your stream
// of consciousness. Cleared on save/discard.
const AUTO_SAVE_DEBOUNCE = 600;

const PROMPTS = [
  'What\'s on your mind right now?',
  'Three things I want to do soon...',
  'What\'s bothering me?',
  'Ideas I don\'t want to forget...',
  'My biggest worry today is...',
  'I\'m grateful for...',
];

export default function BrainDumpScreen({ navigation }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [prompt, setPrompt] = useState(PROMPTS[0]);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const inputRef = useRef(null);
  const saveTimerRef = useRef(null);

  // Restore unsaved draft on mount.
  useEffect(() => {
    (async () => {
      try {
        const draft = await AsyncStorage.getItem(DRAFT_KEY);
        if (draft) setText(draft);
      } catch {}
      setHydrated(true);
      // Focus the input shortly after mount so typing is immediate.
      setTimeout(() => inputRef.current?.focus(), 250);
    })();
    // Pick a prompt deterministically per day so the prompt feels stable
    // within a session but fresh between days.
    const day = new Date().getDate();
    setPrompt(PROMPTS[day % PROMPTS.length]);
  }, []);

  // Debounced auto-save of the draft.
  useEffect(() => {
    if (!hydrated) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      AsyncStorage.setItem(DRAFT_KEY, text).catch(() => {});
    }, AUTO_SAVE_DEBOUNCE);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [text, hydrated]);

  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  const handleSaveAsDiary = async () => {
    if (!text.trim()) {
      Alert.alert('Nothing to save', 'Write something first.');
      return;
    }
    setSaving(true);
    try {
      const today = new Date();
      const datePart = today.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      await api.post('/diary', {
        title: `Brain dump · ${datePart}`,
        content: text.trim(),
        mood: 'neutral',
        tags: ['braindump'],
        color: '#A78BFA',
      });
      await AsyncStorage.removeItem(DRAFT_KEY);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved to diary', 'Your brain dump is tagged #braindump.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      const msg = e?.response?.data?.message || 'Could not save to diary.';
      Alert.alert('Save failed', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (!text.trim()) {
      navigation.goBack();
      return;
    }
    Alert.alert('Discard?', 'This brain dump will be lost.', [
      { text: 'Keep writing', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem(DRAFT_KEY);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <LiquidBackground>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={handleDiscard} style={styles.iconBtn}>
          <Ionicons name="close" size={26} color={theme.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Brain dump</Text>
          <Text style={[styles.headerSub, { color: theme.textMuted }]}>
            {wordCount} word{wordCount === 1 ? '' : 's'} · auto-saved
          </Text>
        </View>
        <View style={styles.iconBtn} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Prompt suggestion */}
          <PressScale
            onPress={() => {
              const idx = (PROMPTS.indexOf(prompt) + 1) % PROMPTS.length;
              setPrompt(PROMPTS[idx]);
              Haptics.selectionAsync();
            }}
            style={[styles.promptCard, { backgroundColor: `${theme.primary}14`, borderColor: `${theme.primary}33` }]}
          >
            <Ionicons name="bulb-outline" size={18} color={theme.primary} />
            <Text style={[styles.promptText, { color: theme.text }]} numberOfLines={2}>
              {prompt}
            </Text>
            <Ionicons name="refresh" size={16} color={theme.textMuted} />
          </PressScale>

          {/* Free-form writing area */}
          <GlassCard variant="solid" style={styles.writeCard}>
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              placeholder="Just start typing. No structure. No judgment. Get it out of your head."
              placeholderTextColor={theme.textMuted}
              multiline
              textAlignVertical="top"
              underlineColorAndroid="transparent"
              selectionColor={theme.primary}
              style={[styles.input, { color: theme.text }]}
              maxLength={20000}
            />
          </GlassCard>

          <Text style={[styles.helper, { color: theme.textMuted }]}>
            {charCount}/20000 · drafts auto-save · save to diary when you're done
          </Text>
        </ScrollView>

        {/* Bottom action bar */}
        <View style={[styles.actions, { paddingBottom: insets.bottom + 12 }]}>
          <GlassButton
            title="Save to diary"
            onPress={handleSaveAsDiary}
            icon="bookmark"
            loading={saving}
            disabled={!text.trim() || saving}
            fullWidth
            size="large"
          />
        </View>
      </KeyboardAvoidingView>
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingBottom: 8,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  headerSub: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  scroll: { paddingHorizontal: 18 },
  promptCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 16, borderWidth: 1, marginBottom: 14,
  },
  promptText: { flex: 1, fontSize: 13, fontWeight: '700' },
  writeCard: { padding: 16, minHeight: 380 },
  input: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 360,
    paddingTop: 0,
  },
  helper: { fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 12 },
  actions: { paddingHorizontal: 18, paddingTop: 8 },
});
