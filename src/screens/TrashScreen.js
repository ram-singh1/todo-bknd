import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import LiquidBackground from '../components/LiquidBackground';
import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import api from '../api/client';

const SECTIONS = [
  { key: 'todos',    label: 'Tasks',     icon: 'checkmark-circle-outline', color: '#6C63FF' },
  { key: 'diaries',  label: 'Diary',     icon: 'book-outline',             color: '#A78BFA' },
  { key: 'habits',   label: 'Habits',    icon: 'flame-outline',            color: '#EF4444' },
  { key: 'expenses', label: 'Expenses',  icon: 'wallet-outline',           color: '#10B981' },
  { key: 'tools',    label: 'Tools',     icon: 'construct-outline',        color: '#F97316' },
];

export default function TrashScreen({ navigation }) {
  const { theme } = useTheme();
  const [items, setItems] = useState({ todos: [], diaries: [], expenses: [], tools: [], habits: [] });
  const [ttlDays, setTtlDays] = useState(30);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/trash');
      setItems(res.data.items || {});
      setTtlDays(res.data.ttlDays || 30);
    } finally { setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const restore = async (type, id) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await api.post(`/trash/${type}/${id}/restore`);
      load();
    } catch (e) {
      Alert.alert('Could not restore', e?.response?.data?.message || e.message);
    }
  };

  const forever = (type, id) => {
    Alert.alert('Delete forever?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await api.delete(`/trash/${type}/${id}`);
          load();
        },
      },
    ]);
  };

  const empty = () => {
    Alert.alert('Empty trash?', 'All items will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Empty', style: 'destructive', onPress: async () => {
          await api.delete('/trash');
          load();
        },
      },
    ]);
  };

  const total = Object.values(items).reduce((s, arr) => s + (Array.isArray(arr) ? arr.length : 0), 0);

  return (
    <LiquidBackground>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Trash</Text>
        {total > 0 ? (
          <TouchableOpacity onPress={empty} style={styles.iconBtn}>
            <Ionicons name="trash" size={22} color={theme.danger} />
          </TouchableOpacity>
        ) : <View style={styles.iconBtn} />}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.primary} />}
      >
        <Text style={[styles.intro, { color: theme.textMuted }]}>
          Items deleted in the last {ttlDays} days. Restore or remove forever.
        </Text>

        {total === 0 && (
          <GlassCard variant="accent" glow style={{ marginTop: 12 }}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Nothing here</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Soft-deleted items show up here for {ttlDays} days. Anything you delete by accident can be restored.
            </Text>
          </GlassCard>
        )}

        {SECTIONS.map((s) => {
          const arr = items[s.key] || [];
          if (!arr.length) return null;
          return (
            <View key={s.key} style={{ marginTop: 14 }}>
              <View style={styles.sectionHead}>
                <Ionicons name={s.icon} size={18} color={s.color} />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  {s.label} <Text style={{ color: theme.textMuted, fontWeight: '600' }}>({arr.length})</Text>
                </Text>
              </View>
              {arr.map((it) => (
                <GlassCard key={it._id} variant="solid" style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>
                      {[it.emoji, it.title || it.name || it.note || (it.amount != null ? `${it.amount}` : null) || it.kind]
                        .filter(Boolean).join(' ')}
                    </Text>
                    <Text style={[styles.itemSub, { color: theme.textMuted }]}>
                      Deleted {timeAgo(it.deletedAt)}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => restore(s.key, it._id)} style={[styles.miniBtn, { backgroundColor: theme.primary }]}>
                    <Ionicons name="refresh" size={14} color="#fff" />
                    <Text style={styles.miniBtnText}>Restore</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => forever(s.key, it._id)} style={[styles.miniBtn, { backgroundColor: theme.inputBg, borderColor: theme.glassBorder, borderWidth: 1 }]}>
                    <Ionicons name="trash-outline" size={14} color={theme.danger} />
                  </TouchableOpacity>
                </GlassCard>
              ))}
            </View>
          );
        })}

        <View style={{ height: 80 }} />
      </ScrollView>
    </LiquidBackground>
  );
}

function timeAgo(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingTop: 50, paddingBottom: 8,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  scroll: { paddingHorizontal: 18, paddingBottom: 16 },
  intro: { fontSize: 12, fontWeight: '600' },

  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  emptyText: { fontSize: 13, lineHeight: 19 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  itemTitle: { fontSize: 13, fontWeight: '700' },
  itemSub: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  miniBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8 },
  miniBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
