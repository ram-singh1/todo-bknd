import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import LiquidBackground from '../components/LiquidBackground';
import GlassCard from '../components/GlassCard';
import api from '../api/client';

const TOOLS = [
  {
    id: 'decision',
    label: 'Decision Matrix',
    desc: 'Score options against weighted criteria. Stops the spiraling.',
    emoji: '🧮',
    color: '#6C63FF',
    route: 'DecisionMatrix',
  },
  {
    id: 'pros-cons',
    label: 'Pros & Cons',
    desc: 'Weighted pros vs cons for any choice you face.',
    emoji: '⚖️',
    color: '#0EA5E9',
    route: 'ProsCons',
  },
  {
    id: 'cbt',
    label: 'CBT Thought Record',
    desc: 'Reframe negative thoughts in 5 minutes.',
    emoji: '🧠',
    color: '#A78BFA',
    route: 'CBT',
  },
  {
    id: 'worry',
    label: 'Worry Log',
    desc: 'Park worries today, review later. Most never happen.',
    emoji: '🫧',
    color: '#10B981',
    route: 'WorryLog',
  },
];

export default function ToolsScreen({ navigation }) {
  const { theme } = useTheme();
  const [counts, setCounts] = useState({});
  const [worryDue, setWorryDue] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [all, due] = await Promise.all([
        api.get('/tools'),
        api.get('/tools/worry/due').catch(() => ({ data: { due: [] } })),
      ]);
      const c = {};
      (all.data.tools || []).forEach((t) => { c[t.kind] = (c[t.kind] || 0) + 1; });
      setCounts(c);
      setWorryDue((due.data.due || []).length);
    } catch {}
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  return (
    <LiquidBackground>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Problem-solving tools</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.primary} />}
      >
        {worryDue > 0 && (
          <TouchableOpacity onPress={() => navigation.navigate('WorryLog')}>
            <GlassCard variant="accent" glow style={styles.banner}>
              <Text style={{ fontSize: 22 }}>🫧</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.bannerTitle, { color: theme.text }]}>
                  {worryDue} {worryDue === 1 ? 'worry' : 'worries'} ready to review
                </Text>
                <Text style={[styles.bannerSub, { color: theme.textSecondary }]}>
                  Did it actually happen? Find out.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={theme.text} />
            </GlassCard>
          </TouchableOpacity>
        )}

        <Text style={[styles.intro, { color: theme.textSecondary }]}>
          Structured thinking templates. Each one is a quick form that stays in your account so you can revisit your reasoning later.
        </Text>

        {TOOLS.map((t) => (
          <TouchableOpacity key={t.id} onPress={() => navigation.navigate(t.route)} activeOpacity={0.85}>
            <GlassCard variant="solid" style={styles.toolCard}>
              <View style={[styles.toolEmoji, { backgroundColor: `${t.color}25`, borderColor: `${t.color}66` }]}>
                <Text style={{ fontSize: 26 }}>{t.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.toolName, { color: theme.text }]}>{t.label}</Text>
                <Text style={[styles.toolDesc, { color: theme.textMuted }]}>{t.desc}</Text>
                {counts[t.id] > 0 && (
                  <Text style={[styles.toolCount, { color: t.color }]}>
                    {counts[t.id]} saved
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
            </GlassCard>
          </TouchableOpacity>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingTop: 50, paddingBottom: 8,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  scroll: { paddingHorizontal: 18, paddingBottom: 16 },

  intro: { fontSize: 13, lineHeight: 20, marginBottom: 14 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  bannerTitle: { fontSize: 14, fontWeight: '800' },
  bannerSub: { fontSize: 12, marginTop: 2, fontWeight: '600' },

  toolCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  toolEmoji: {
    width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  toolName: { fontSize: 15, fontWeight: '800' },
  toolDesc: { fontSize: 12, marginTop: 4, lineHeight: 17, fontWeight: '500' },
  toolCount: { fontSize: 11, fontWeight: '800', marginTop: 6, letterSpacing: 0.5 },
});
