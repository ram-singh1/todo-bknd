import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert,
  Platform, Animated, Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import api from '../api/client';
import { moodConfig } from '../themes';
import { format } from 'date-fns';
import { VOICE_LANGUAGES, VOICE_SPEEDS } from '../utils/tts';

export default function DiaryDetailScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { id } = route.params;
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [voiceLang, setVoiceLang] = useState('en');
  const [voiceSpeed, setVoiceSpeed] = useState('normal');
  const [showVoiceOptions, setShowVoiceOptions] = useState(false);

  // Animated sound wave bars
  const waveBars = useRef([...Array(7)].map(() => new Animated.Value(8))).current;

  useEffect(() => {
    loadEntry();
    return () => { Speech.stop(); };
  }, []);

  useEffect(() => {
    if (isSpeaking) {
      startWaveAnimation();
    } else {
      waveBars.forEach(bar => bar.setValue(8));
    }
  }, [isSpeaking]);

  const startWaveAnimation = () => {
    const animations = waveBars.map((bar, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(bar, { toValue: 8 + Math.random() * 22, duration: 300 + i * 80, useNativeDriver: false }),
          Animated.timing(bar, { toValue: 6, duration: 300 + i * 60, useNativeDriver: false }),
        ])
      )
    );
    Animated.parallel(animations).start();
  };

  const loadEntry = async () => {
    try {
      const res = await api.get(`/diary/${id}`);
      setEntry(res.data.entry);
    } catch (error) {
      Alert.alert('Error', 'Could not load entry');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const toggleSpeech = async () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }
    if (!entry?.content) return;

    setIsSpeaking(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const speed = VOICE_SPEEDS.find(s => s.key === voiceSpeed)?.rate || 0.85;

    Speech.speak(entry.content, {
      language: voiceLang === 'hi' ? 'hi-IN' : 'en-US',
      pitch: 1.05,
      rate: speed,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const analyzeWithAI = async () => {
    setAnalyzing(true);
    try {
      const res = await api.post('/ai/analyze-diary', { entryId: id });
      setAnalysis(res.data.analysis);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error', 'Could not analyze entry');
    } finally {
      setAnalyzing(false);
    }
  };

  const shareEntry = async () => {
    if (!entry) return;
    try {
      await Share.share({
        title: entry.title,
        message: `${entry.title}\n\n${entry.content}\n\n— Written on ${format(new Date(entry.createdAt), 'MMMM d, yyyy')}`,
      });
    } catch {}
  };

  const deleteEntry = () => {
    Alert.alert('Delete Entry', 'This cannot be undone. Delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/diary/${id}`);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            navigation.goBack();
          } catch {}
        },
      },
    ]);
  };

  const toggleFavorite = async () => {
    try {
      await api.put(`/diary/${id}/favorite`);
      setEntry({ ...entry, isFavorite: !entry.isFavorite });
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  if (loading || !entry) {
    return (
      <LinearGradient colors={theme.colors} style={[styles.container, styles.centered]}>
        <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading...</Text>
      </LinearGradient>
    );
  }

  const mood = moodConfig[entry.mood] || moodConfig.neutral;
  const createdAt = new Date(entry.createdAt);

  const getFontFamily = () => {
    switch (entry.fontStyle) {
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
        <TouchableOpacity onPress={() => { Speech.stop(); navigation.goBack(); }} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={shareEntry} style={styles.actionBtn}>
            <Ionicons name="share-outline" size={22} color={theme.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleFavorite} style={styles.actionBtn}>
            <Ionicons
              name={entry.isFavorite ? 'heart' : 'heart-outline'}
              size={22}
              color={entry.isFavorite ? '#F43F5E' : theme.textMuted}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={deleteEntry} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={22} color={theme.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Date & Mood Header */}
        <GlassCard variant="accent" style={[styles.moodCard, { borderLeftWidth: 4, borderLeftColor: mood.color }]}>
          <View style={styles.moodHeader}>
            <View>
              <Text style={[styles.entryDate, { color: theme.textSecondary }]}>
                {format(createdAt, 'EEEE, MMMM d, yyyy')}
              </Text>
              <Text style={[styles.entryTime, { color: theme.textMuted }]}>
                {format(createdAt, 'h:mm a')}
              </Text>
            </View>
            <View style={[styles.moodBadge, { backgroundColor: `${mood.color}20` }]}>
              <Text style={styles.moodBadgeEmoji}>{entry.moodEmoji || mood.emoji}</Text>
              <Text style={[styles.moodBadgeLabel, { color: mood.color }]}>{mood.label}</Text>
            </View>
          </View>
        </GlassCard>

        {/* Title */}
        <Text style={[styles.title, { color: theme.text }]}>{entry.title}</Text>

        {/* Emojis */}
        {entry.emojis?.length > 0 && (
          <View style={styles.emojisRow}>
            {entry.emojis.map((e, i) => (
              <Text key={i} style={styles.entryEmoji}>{e}</Text>
            ))}
          </View>
        )}

        {/* Content */}
        <GlassCard variant="solid" style={styles.contentCard}>
          <Text style={[
            styles.content,
            { color: theme.text, fontFamily: getFontFamily() },
          ]}>
            {entry.content}
          </Text>
        </GlassCard>

        {/* Listen Card with Voice Controls */}
        <GlassCard
          variant={isSpeaking ? 'accent' : 'default'}
          style={styles.listenCard}
          glow={isSpeaking}
        >
          <TouchableOpacity onPress={toggleSpeech} activeOpacity={0.7}>
            <View style={styles.listenRow}>
              <View style={[styles.playBtn, { backgroundColor: isSpeaking ? theme.primary : theme.glass }]}>
                <Ionicons
                  name={isSpeaking ? 'pause' : 'play'}
                  size={24}
                  color={isSpeaking ? '#FFF' : theme.primary}
                />
              </View>
              <View style={styles.listenInfo}>
                <Text style={[styles.listenTitle, { color: theme.text }]}>
                  {isSpeaking ? '🎧 Listening...' : '🎧 Listen to Entry'}
                </Text>
                <Text style={[styles.listenSub, { color: theme.textMuted }]}>
                  {VOICE_LANGUAGES.find(l => l.key === voiceLang)?.flag} {VOICE_LANGUAGES.find(l => l.key === voiceLang)?.label} · {voiceSpeed} · {entry.readingTime || 1} min
                </Text>
              </View>
              {isSpeaking && (
                <View style={styles.soundWaves}>
                  {waveBars.map((bar, i) => (
                    <Animated.View
                      key={i}
                      style={[styles.soundBar, { backgroundColor: theme.primary, height: bar }]}
                    />
                  ))}
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Voice settings toggle */}
          <TouchableOpacity
            onPress={() => setShowVoiceOptions(!showVoiceOptions)}
            style={styles.voiceToggle}
          >
            <Ionicons name="options-outline" size={16} color={theme.textMuted} />
            <Text style={[styles.voiceToggleText, { color: theme.textMuted }]}>
              {showVoiceOptions ? 'Hide Options' : 'Voice Options'}
            </Text>
          </TouchableOpacity>

          {showVoiceOptions && (
            <View style={styles.voiceOptions}>
              {/* Language selector */}
              <Text style={[styles.voiceLabel, { color: theme.textSecondary }]}>LANGUAGE</Text>
              <View style={styles.voicePillRow}>
                {VOICE_LANGUAGES.map(lang => (
                  <TouchableOpacity
                    key={lang.key}
                    style={[styles.voicePill, {
                      backgroundColor: voiceLang === lang.key ? `${theme.primary}30` : theme.inputBg,
                      borderColor: voiceLang === lang.key ? theme.primary : 'transparent',
                    }]}
                    onPress={() => { setVoiceLang(lang.key); if (isSpeaking) { Speech.stop(); setIsSpeaking(false); } }}
                  >
                    <Text style={styles.voicePillFlag}>{lang.flag}</Text>
                    <Text style={[styles.voicePillText, { color: voiceLang === lang.key ? theme.primary : theme.textMuted }]}>
                      {lang.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Speed selector */}
              <Text style={[styles.voiceLabel, { color: theme.textSecondary, marginTop: 10 }]}>SPEED</Text>
              <View style={styles.voicePillRow}>
                {VOICE_SPEEDS.map(spd => (
                  <TouchableOpacity
                    key={spd.key}
                    style={[styles.voicePill, {
                      backgroundColor: voiceSpeed === spd.key ? `${theme.primary}30` : theme.inputBg,
                      borderColor: voiceSpeed === spd.key ? theme.primary : 'transparent',
                    }]}
                    onPress={() => { setVoiceSpeed(spd.key); if (isSpeaking) { Speech.stop(); setIsSpeaking(false); } }}
                  >
                    <Text style={[styles.voicePillText, { color: voiceSpeed === spd.key ? theme.primary : theme.textMuted }]}>
                      {spd.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </GlassCard>

        {/* Tags */}
        {entry.tags?.length > 0 && (
          <View style={styles.tagsRow}>
            {entry.tags.map((tag, i) => (
              <View key={i} style={[styles.tag, { backgroundColor: `${theme.primary}15`, borderColor: `${theme.primary}30`, borderWidth: 1 }]}>
                <Text style={[styles.tagText, { color: theme.primary }]}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* AI Analysis */}
        {!analysis ? (
          <GlassButton
            title="🤖 Analyze with AI"
            onPress={analyzeWithAI}
            loading={analyzing}
            variant="glass"
            fullWidth
            style={{ marginTop: 16 }}
          />
        ) : (
          <GlassCard variant="accent" style={styles.analysisCard} glow>
            <Text style={[styles.analysisTitle, { color: theme.primary }]}>🤖 AI Analysis</Text>

            {analysis.sentiment && (
              <View style={styles.analysisRow}>
                <Text style={[styles.analysisLabel, { color: theme.textSecondary }]}>Sentiment</Text>
                <Text style={[styles.analysisValue, { color: theme.text }]}>{analysis.sentiment}</Text>
              </View>
            )}

            {analysis.keywords?.length > 0 && (
              <View style={styles.analysisRow}>
                <Text style={[styles.analysisLabel, { color: theme.textSecondary }]}>Keywords</Text>
                <View style={styles.keywordsRow}>
                  {analysis.keywords.map((kw, i) => (
                    <View key={i} style={[styles.keyword, { backgroundColor: `${theme.primary}20` }]}>
                      <Text style={[styles.keywordText, { color: theme.primary }]}>{kw}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {analysis.summary && (
              <View style={styles.analysisRow}>
                <Text style={[styles.analysisLabel, { color: theme.textSecondary }]}>Summary</Text>
                <Text style={[styles.analysisSummary, { color: theme.text }]}>{analysis.summary}</Text>
              </View>
            )}

            {analysis.affirmation && (
              <View style={[styles.affirmation, { backgroundColor: `${theme.success}15` }]}>
                <Text style={[styles.affirmationText, { color: theme.success }]}>{analysis.affirmation}</Text>
              </View>
            )}
          </GlassCard>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <GlassCard variant="light" style={styles.statItem}>
            <Text style={styles.statEmoji}>📝</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>{entry.wordCount || 0}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Words</Text>
          </GlassCard>
          <GlassCard variant="light" style={styles.statItem}>
            <Text style={styles.statEmoji}>⏱️</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>{entry.readingTime || 1}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Min Read</Text>
          </GlassCard>
          <GlassCard variant="light" style={styles.statItem}>
            <Text style={styles.statEmoji}>🔒</Text>
            <Text style={[styles.statValue, { color: theme.success }]}>Yes</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Encrypted</Text>
          </GlassCard>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { padding: 8 },
  scroll: { paddingHorizontal: 20 },
  moodCard: { marginBottom: 16 },
  moodHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryDate: { fontSize: 15, fontWeight: '600' },
  entryTime: { fontSize: 13, marginTop: 2 },
  moodBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 6 },
  moodBadgeEmoji: { fontSize: 20 },
  moodBadgeLabel: { fontSize: 14, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 12, lineHeight: 34 },
  emojisRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 16 },
  entryEmoji: { fontSize: 24 },
  contentCard: { marginBottom: 16 },
  content: { fontSize: 16, lineHeight: 28, letterSpacing: 0.2 },
  listenCard: { marginBottom: 16 },
  listenRow: { flexDirection: 'row', alignItems: 'center' },
  playBtn: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  listenInfo: { flex: 1 },
  listenTitle: { fontSize: 15, fontWeight: '700' },
  listenSub: { fontSize: 13, marginTop: 2 },
  soundWaves: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  soundBar: { width: 3, borderRadius: 2 },
  voiceToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, alignSelf: 'center' },
  voiceToggleText: { fontSize: 12, fontWeight: '600' },
  voiceOptions: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  voiceLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },
  voicePillRow: { flexDirection: 'row', gap: 8 },
  voicePill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, gap: 6 },
  voicePillFlag: { fontSize: 16 },
  voicePillText: { fontSize: 13, fontWeight: '600' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tag: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  tagText: { fontSize: 13, fontWeight: '500' },
  analysisCard: { marginTop: 16, marginBottom: 16 },
  analysisTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  analysisRow: { marginBottom: 12 },
  analysisLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  analysisValue: { fontSize: 15, fontWeight: '600', textTransform: 'capitalize' },
  keywordsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  keyword: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  keywordText: { fontSize: 13, fontWeight: '600' },
  analysisSummary: { fontSize: 14, lineHeight: 22 },
  affirmation: { padding: 14, borderRadius: 14, marginTop: 8 },
  affirmationText: { fontSize: 14, fontWeight: '600', lineHeight: 22 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statEmoji: { fontSize: 22, marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
});
