import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, FlatList, TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import LiquidBackground from '../components/LiquidBackground';
import GlassCard from '../components/GlassCard';
import api from '../api/client';
import { fmtMoney, resolveCategory } from '../config/budget';

export default function ExpenseListScreen({ navigation, route }) {
  const { theme } = useTheme();
  const month = route.params?.month;
  const [expenses, setExpenses] = useState([]);
  const [customCats, setCustomCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all | expense | income

  const load = useCallback(async () => {
    try {
      const q = month ? `?month=${month}` : '';
      const [res, cats] = await Promise.all([
        api.get(`/budget/expenses${q}`),
        api.get('/budget/categories').catch(() => ({ data: { custom: [] } })),
      ]);
      setExpenses(res.data.expenses || []);
      setCustomCats(cats.data.custom || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  const remove = (item) => {
    Alert.alert('Delete?', 'Move this entry to trash?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await api.delete(`/budget/expenses/${item._id}`);
          load();
        },
      },
    ]);
  };

  const filtered = filter === 'all' ? expenses : expenses.filter((e) => e.kind === filter);

  // Group by date
  const groups = {};
  filtered.forEach((e) => {
    const key = e.date.slice(0, 10);
    groups[key] = groups[key] || [];
    groups[key].push(e);
  });
  const sections = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  return (
    <LiquidBackground>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {month ? month : 'All transactions'}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddExpense')} style={styles.iconBtn}>
          <Ionicons name="add" size={26} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.tabs, { backgroundColor: theme.inputBg, borderColor: theme.glassBorder }]}>
        {[
          { id: 'all', label: 'All' },
          { id: 'expense', label: 'Expenses' },
          { id: 'income', label: 'Income' },
        ].map((t) => {
          const on = filter === t.id;
          return (
            <TouchableOpacity key={t.id} onPress={() => setFilter(t.id)} style={[styles.tab, on && { backgroundColor: theme.primary }]}>
              <Text style={[styles.tabText, { color: on ? '#fff' : theme.textSecondary }]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={sections}
        keyExtractor={(s) => s}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.primary} />}
        renderItem={({ item: dateKey }) => {
          const items = groups[dateKey];
          const dayTotal = items.reduce((s, x) => s + (x.kind === 'expense' ? -x.amount : x.amount), 0);
          return (
            <View style={{ marginBottom: 14 }}>
              <View style={styles.sectionHead}>
                <Text style={[styles.sectionDate, { color: theme.text }]}>
                  {new Date(dateKey).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                </Text>
                <Text style={[styles.sectionTotal, { color: dayTotal < 0 ? theme.danger : theme.success }]}>
                  {dayTotal < 0 ? '-' : '+'}{fmtMoney(Math.abs(dayTotal), items[0].currency)}
                </Text>
              </View>
              {items.map((it) => {
                const cfg = resolveCategory(it.category, customCats);
                // Per-transaction emoji/color override → fallback to category
                const dispEmoji = it.emoji || cfg.emoji;
                const dispColor = it.color || cfg.color;
                return (
                  <TouchableOpacity
                    key={it._id}
                    onLongPress={() => remove(it)}
                    delayLongPress={350}
                    activeOpacity={0.8}
                  >
                    <GlassCard variant="solid" style={styles.itemCard}>
                      <View style={[styles.iconBox, { backgroundColor: `${dispColor}25`, borderColor: `${dispColor}55` }]}>
                        <Text style={{ fontSize: 18 }}>{dispEmoji}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>
                          {it.note || cfg.label}
                        </Text>
                        <Text style={[styles.itemSub, { color: theme.textMuted }]}>
                          {cfg.label} · {it.paymentMethod}
                        </Text>
                      </View>
                      <Text style={[styles.itemAmount, { color: it.kind === 'expense' ? theme.danger : theme.success }]}>
                        {it.kind === 'expense' ? '-' : '+'}{fmtMoney(it.amount, it.currency)}
                      </Text>
                    </GlassCard>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        }}
        ListEmptyComponent={!loading ? (
          <GlassCard variant="accent" glow style={{ marginTop: 12 }}>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800' }}>No transactions yet</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 6 }}>
              Tap the + button to add your first one. Long-press any row to delete.
            </Text>
          </GlassCard>
        ) : null}
      />
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
  tabs: {
    flexDirection: 'row', borderRadius: 999, padding: 3, borderWidth: 1,
    marginHorizontal: 18, marginBottom: 12,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 999 },
  tabText: { fontSize: 12, fontWeight: '800' },

  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, paddingHorizontal: 4 },
  sectionDate: { fontSize: 13, fontWeight: '800' },
  sectionTotal: { fontSize: 13, fontWeight: '800' },

  itemCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  iconBox: {
    width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  itemTitle: { fontSize: 14, fontWeight: '700' },
  itemSub: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  itemAmount: { fontSize: 14, fontWeight: '800' },
});
