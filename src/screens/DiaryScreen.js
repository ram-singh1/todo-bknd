import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet, View, Text, FlatList, TouchableOpacity,
  RefreshControl, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import LiquidBackground from '../components/LiquidBackground';
import GlassCard from '../components/GlassCard';
import AppIcon from '../components/AppIcon';
import api from '../api/client';
import { moodConfig } from '../themes';
import { format } from 'date-fns';

const MOOD_FILTERS = ['all', 'amazing', 'happy', 'neutral', 'sad', 'excited', 'grateful'];

export default function DiaryScreen({ navigation }) {
  const { theme } = useTheme();
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [moodFilter, setMoodFilter] = useState('all');
  const [showFavorites, setShowFavorites] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fabScale = useRef(new Animated.Value(1)).current;
  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(fabScale, { toValue: 1.1, duration: 1200, useNativeDriver: true }),
        Animated.timing(fabScale, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const loadEntries = useCallback(async () => {
    try {
      const params = { limit: 50, sortBy: 'createdAt', order: 'desc' };
      if (moodFilter !== 'all') params.mood = moodFilter;
      if (showFavorites) params.favorite = 'true';

      const [entriesRes, statsRes] = await Promise.all([
        api.get('/diary', { params }),
        api.get('/diary/stats').catch(() => ({ data: { stats: null } })),
      ]);
      setEntries(entriesRes.data.entries || []);
      setStats(statsRes.data.stats);
    } catch {}
  }, [moodFilter, showFavorites]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadEntries);
    return unsubscribe;
  }, [navigation, loadEntries]);

  const toggleFavorite = async (entry) => {
    try {
      await api.put(`/diary/${entry._id}/favorite`);
      loadEntries();
    } catch {}
  };

  const renderEntry = ({ item: entry }) => {
    const mood = moodConfig[entry.mood] || moodConfig.neutral;
    const createdAt = new Date(entry.createdAt);

    return (
      <GlassCard
        variant="default"
        style={[styles.entryCard, { borderLeftWidth: 3, borderLeftColor: mood.color }]}
        onPress={() => navigation.navigate('DiaryDetail', { id: entry._id })}
      >
        <View style={styles.entryHeader}>
          <View style={styles.entryDate}>
            <Text style={[styles.dateDay, { color: theme.text }]}>{format(createdAt, 'd')}</Text>
            <Text style={[styles.dateMonth, { color: theme.textMuted }]}>{format(createdAt, 'MMM')}</Text>
          </View>
          <View style={styles.entryInfo}>
            <Text style={[styles.entryTitle, { color: theme.text }]} numberOfLines={1}>
              {entry.title}
            </Text>
            <View style={styles.entryMetaRow}>
              <AppIcon name={entry.moodEmoji || mood.icon} size={16} color={mood.color} style={styles.moodEmoji} />
              <Text style={[styles.moodLabel, { color: mood.color }]}>{mood.label}</Text>
              {entry.tags?.length > 0 && (
                <Text style={[styles.tagText, { color: theme.textMuted }]}>
                  #{entry.tags[0]}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.entryActions}>
            <TouchableOpacity onPress={() => toggleFavorite(entry)}>
              <Ionicons
                name={entry.isFavorite ? 'heart' : 'heart-outline'}
                size={22}
                color={entry.isFavorite ? '#F43F5E' : theme.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Preview details */}
        <View style={styles.entryFooter}>
          {entry.wordCount > 0 && (
            <View style={[styles.footerBadge, { backgroundColor: theme.inputBg }]}>
              <Text style={[styles.footerText, { color: theme.textMuted }]}>
                {entry.wordCount} words
              </Text>
            </View>
          )}
          {entry.readingTime > 0 && (
            <View style={[styles.footerBadge, { backgroundColor: theme.inputBg }]}>
              <Text style={[styles.footerText, { color: theme.textMuted }]}>
                {entry.readingTime} min read
              </Text>
            </View>
          )}
          {entry.images?.length > 0 && (
            <View style={[styles.footerBadge, { backgroundColor: theme.inputBg }]}>
              <Text style={[styles.footerText, { color: theme.textMuted }]}>
                {entry.images.length} images
              </Text>
            </View>
          )}
          <Text style={[styles.timeText, { color: theme.textMuted }]}>
            {format(createdAt, 'h:mm a')}
          </Text>
        </View>
      </GlassCard>
    );
  };

  return (
    <LiquidBackground>
      {/* Header */}
      <Animated.View style={[styles.headerSection, { opacity: headerFade }]}>
        <Text style={[styles.screenTitle, { color: theme.text }]}>My Diary</Text>
        {stats && (
          <Text style={[styles.statsText, { color: theme.textMuted }]}>
            {stats.total} entries · {stats.streak} day streak
          </Text>
        )}
      </Animated.View>

      {/* Stats Row */}
      {stats && stats.total > 0 && (
        <View style={styles.moodStatsRow}>
          {Object.entries(stats.moods || {}).slice(0, 5).map(([mood, count]) => {
            const m = moodConfig[mood] || moodConfig.neutral;
            return (
              <View key={mood} style={[styles.moodStat, { backgroundColor: `${m.color}15` }]}>
                <AppIcon name={m.icon} size={18} color={m.color} style={styles.moodStatEmoji} />
                <Text style={[styles.moodStatCount, { color: m.color }]}>{count}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Mood filter */}
      <FlatList
        horizontal
        data={MOOD_FILTERS}
        renderItem={({ item }) => {
          const m = moodConfig[item] || { icon: 'apps-outline', label: 'All', color: theme.primary };
          return (
            <TouchableOpacity
              style={[
                styles.moodPill,
                {
                  backgroundColor: moodFilter === item ? `${m.color}30` : theme.inputBg,
                  borderColor: moodFilter === item ? m.color : 'transparent',
                },
              ]}
              onPress={() => setMoodFilter(item)}
            >
              <AppIcon name={item === 'all' ? 'apps-outline' : m.icon} size={15} color={moodFilter === item ? m.color : theme.textMuted} style={styles.moodPillEmoji} />
              <Text style={[styles.moodPillText, { color: moodFilter === item ? m.color : theme.textMuted }]}>
                {item === 'all' ? 'All' : m.label}
              </Text>
            </TouchableOpacity>
          );
        }}
        keyExtractor={(item) => item}
        style={styles.moodScroll}
        contentContainerStyle={styles.moodContent}
        showsHorizontalScrollIndicator={false}
      />

      {/* Favorites Toggle */}
      <View style={styles.favToggle}>
        <TouchableOpacity
          style={[
            styles.favBtn,
            { backgroundColor: showFavorites ? '#F43F5E20' : theme.inputBg },
          ]}
          onPress={() => setShowFavorites(!showFavorites)}
        >
          <Ionicons
            name={showFavorites ? 'heart' : 'heart-outline'}
            size={16}
            color={showFavorites ? '#F43F5E' : theme.textMuted}
          />
          <Text style={[styles.favBtnText, { color: showFavorites ? '#F43F5E' : theme.textMuted }]}>
            Favorites
          </Text>
        </TouchableOpacity>
      </View>

      {/* Entries List */}
      <FlatList
        data={entries}
        renderItem={renderEntry}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await loadEntries(); setRefreshing(false); }}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📖</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Your diary awaits</Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              Start writing your thoughts, feelings, and memories. Everything is encrypted and private.
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity
          onPress={() => navigation.navigate('AddDiary')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[theme.primary, theme.secondary]}
            style={styles.fabGradient}
          >
            <Ionicons name="create" size={26} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerSection: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 8 },
  screenTitle: { fontSize: 28, fontWeight: '800' },
  statsText: { fontSize: 13, marginTop: 4, fontWeight: '500' },
  moodStatsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginVertical: 12 },
  moodStat: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 4 },
  moodStatEmoji: { fontSize: 16 },
  moodStatCount: { fontSize: 13, fontWeight: '700' },
  moodScroll: { maxHeight: 46, marginBottom: 4 },
  moodContent: { paddingHorizontal: 20, gap: 8 },
  moodPill: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 14, borderWidth: 1,
  },
  moodPillEmoji: { fontSize: 16, marginRight: 4 },
  moodPillText: { fontSize: 12, fontWeight: '600' },
  favToggle: { paddingHorizontal: 20, marginBottom: 8 },
  favBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 6 },
  favBtnText: { fontSize: 13, fontWeight: '600' },
  listContent: { paddingHorizontal: 20, paddingBottom: 120 },
  entryCard: { marginBottom: 12 },
  entryHeader: { flexDirection: 'row', alignItems: 'center' },
  entryDate: { alignItems: 'center', marginRight: 14, width: 40 },
  dateDay: { fontSize: 22, fontWeight: '800' },
  dateMonth: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  entryInfo: { flex: 1 },
  entryTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  entryMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  moodEmoji: { fontSize: 16 },
  moodLabel: { fontSize: 13, fontWeight: '600' },
  tagText: { fontSize: 12 },
  entryActions: { paddingLeft: 8 },
  entryFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8, flexWrap: 'wrap' },
  footerBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  footerText: { fontSize: 11, fontWeight: '500' },
  timeText: { fontSize: 11, marginLeft: 'auto' },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
  fab: { position: 'absolute', bottom: 90, right: 20, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  fabGradient: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
