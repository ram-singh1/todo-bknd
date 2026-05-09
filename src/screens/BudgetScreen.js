import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import LiquidBackground from '../components/LiquidBackground';
import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import PremiumBadge from '../components/PremiumBadge';
import {
  DonutChart, AreaChart, MultiBar, GoalRing, ShareBar,
} from '../components/AdvancedCharts';
import api from '../api/client';
import { fmtMoney, resolveCategory } from '../config/budget';

function monthKeyOf(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function shiftMonth(key, delta) {
  const [y, m] = key.split('-').map(Number);
  const dt = new Date(y, m - 1 + delta, 1);
  return monthKeyOf(dt);
}
function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, 1);
  return dt.toLocaleString('default', { month: 'long', year: 'numeric' });
}

export default function BudgetScreen({ navigation }) {
  const { theme } = useTheme();
  const { isPremium } = useSubscription();
  const [month, setMonth] = useState(monthKeyOf());
  const [summary, setSummary] = useState(null);
  const [byCategory, setByCategory] = useState([]);
  const [trend, setTrend] = useState([]);
  const [cashflow, setCashflow] = useState([]);
  const [customCats, setCustomCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, c, t, cf, cats] = await Promise.all([
        api.get(`/budget/summary?month=${month}`),
        api.get(`/budget/by-category?month=${month}`),
        api.get('/budget/trend?days=30'),
        api.get('/budget/cashflow?months=6'),
        api.get('/budget/categories'),
      ]);
      setSummary(s.data.summary);
      setByCategory(c.data.categories || []);
      setTrend(t.data.trend || []);
      setCashflow(cf.data.cashflow || []);
      setCustomCats(cats.data.custom || []);
    } catch (e) {
      // silent — empty state renders
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const currency = summary?.currency || 'USD';
  const limit = summary?.limit || 0;
  const spend = summary?.spend || 0;
  const income = summary?.income || 0;
  const remaining = summary?.remaining || 0;
  const percentUsed = summary?.percentUsed || 0;
  const overBudget = !!summary?.overBudget;
  const savingsRate = summary?.savingsRate || 0;

  // Donut data — top categories with explicit colors from config
  const donutData = byCategory.slice(0, 6).map((c) => ({
    value: c.total,
    color: resolveCategory(c.category, customCats).color,
    text: '',
  }));

  // Trend area chart
  const trendValues = trend.map((d) => d.expense);
  const incomeValues = trend.map((d) => d.income);
  const trendLabels = trend.map((d, i) => (i % 5 === 0 ? d.date.slice(8) : ''));

  // Cashflow comparison
  const cashflowData = cashflow.map((c) => ({
    label: c.month.slice(5),
    primary: c.income,
    secondary: c.expense,
  }));

  // Share bar — proportion across categories
  const shareData = byCategory.slice(0, 5).map((c) => {
    const cfg = resolveCategory(c.category, customCats);
    return {
      label: cfg.label.split(' ')[0],
      value: c.total,
      color: cfg.color,
    };
  });

  const handleAdd = (kind = 'expense') => {
    navigation.navigate('AddExpense', { kind });
  };

  return (
    <LiquidBackground>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Budget</Text>
        <TouchableOpacity onPress={() => navigation.navigate('BudgetSettings', { month })} style={styles.iconBtn}>
          <Ionicons name="settings-outline" size={22} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {/* Month picker */}
        <View style={[styles.monthRow, { backgroundColor: theme.inputBg, borderColor: theme.glassBorder }]}>
          <TouchableOpacity onPress={() => setMonth(shiftMonth(month, -1))} style={styles.monthBtn}>
            <Ionicons name="chevron-back" size={18} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.monthText, { color: theme.text }]}>{monthLabel(month)}</Text>
          <TouchableOpacity
            onPress={() => setMonth(shiftMonth(month, 1))}
            style={styles.monthBtn}
            disabled={shiftMonth(month, 1) > monthKeyOf()}
          >
            <Ionicons
              name="chevron-forward" size={18}
              color={shiftMonth(month, 1) > monthKeyOf() ? theme.textMuted : theme.text}
            />
          </TouchableOpacity>
        </View>

        {/* Hero — Donut + KPIs */}
        <GlassCard variant="solid" glow style={styles.hero}>
          <View style={styles.heroRow}>
            <DonutChart
              size={160}
              innerRadius={56}
              data={donutData.length ? donutData : [{ value: 1, color: theme.inputBg }]}
              centerValue={fmtMoney(spend, currency)}
              centerLabel={limit > 0 ? `of ${fmtMoney(limit, currency)}` : 'spent'}
              hideText
            />
            <View style={styles.heroSide}>
              <KpiRow
                color={theme.success}
                label="Income"
                value={fmtMoney(income, currency)}
              />
              <KpiRow
                color={theme.danger}
                label="Spent"
                value={fmtMoney(spend, currency)}
              />
              <KpiRow
                color={theme.primary}
                label="Balance"
                value={fmtMoney(income - spend, currency)}
              />
              <KpiRow
                color={theme.warning}
                label="Save Rate"
                value={`${savingsRate}%`}
              />
            </View>
          </View>

          {limit > 0 && (
            <View style={{ marginTop: 14 }}>
              <View style={[styles.budgetBar, { backgroundColor: theme.inputBg }]}>
                <View
                  style={{
                    width: `${Math.min(100, percentUsed)}%`,
                    height: '100%',
                    borderRadius: 6,
                    backgroundColor: overBudget ? theme.danger : (percentUsed > 80 ? theme.warning : theme.success),
                  }}
                />
              </View>
              <View style={styles.budgetMetaRow}>
                <Text style={[styles.budgetMeta, { color: theme.textMuted }]}>
                  {percentUsed}% of monthly limit
                </Text>
                <Text style={[styles.budgetMeta, { color: overBudget ? theme.danger : theme.textSecondary, fontWeight: '700' }]}>
                  {overBudget ? `${fmtMoney(spend - limit, currency)} over` : `${fmtMoney(remaining, currency)} left`}
                </Text>
              </View>
            </View>
          )}
        </GlassCard>

        {/* Quick add */}
        <View style={styles.actionRow}>
          <GlassButton
            title="Expense"
            icon="remove-circle"
            variant="primary"
            onPress={() => handleAdd('expense')}
            style={{ flex: 1 }}
          />
          <GlassButton
            title="Income"
            icon="add-circle"
            variant="glass"
            onPress={() => handleAdd('income')}
            style={{ flex: 1 }}
          />
        </View>

        {/* Quick links */}
        <View style={styles.quickRow}>
          <QuickTile
            icon="repeat-outline"
            label="Bills & Subs"
            onPress={() => navigation.navigate('Bills')}
            color={theme.warning}
          />
          <QuickTile
            icon="trophy-outline"
            label="Savings Goals"
            onPress={() => navigation.navigate('SavingsGoals')}
            color={theme.success}
          />
          <QuickTile
            icon="list-outline"
            label="All Expenses"
            onPress={() => navigation.navigate('ExpenseList', { month })}
            color={theme.primary}
          />
        </View>

        {/* Spending trend */}
        <GlassCard variant="solid" style={styles.chartCard}>
          <SectionHead title="30-day cashflow" subtitle="Income · expense per day" />
          <AreaChart
            values={trendValues}
            secondary={incomeValues}
            labels={trendLabels}
            primaryColor={theme.danger}
            secondaryColor={theme.success}
            height={170}
            yAxisFormat={(v) => fmtMoney(v, currency)}
          />
          <View style={styles.legendRow}>
            <Legend color={theme.success} label="Income" />
            <Legend color={theme.danger} label="Expense" />
          </View>
        </GlassCard>

        {/* Category breakdown */}
        {byCategory.length > 0 && (
          <GlassCard variant="solid" style={styles.chartCard}>
            <SectionHead
              title="Where your money went"
              subtitle={`${byCategory.length} categories this month`}
            />
            {shareData.length > 0 && <ShareBar data={shareData} height={14} />}
            <View style={{ marginTop: 16 }}>
              {byCategory.map((c) => {
                const cfg = resolveCategory(c.category, customCats);
                const pct = limit > 0 ? Math.round((c.total / spend) * 100) : 0;
                return (
                  <View key={c.category} style={styles.catRow}>
                    <View style={[styles.catEmoji, { backgroundColor: `${cfg.color}25` }]}>
                      <Text style={{ fontSize: 18 }}>{cfg.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.catTopRow}>
                        <Text style={[styles.catName, { color: theme.text }]}>{cfg.label}</Text>
                        <Text style={[styles.catAmount, { color: theme.text }]}>
                          {fmtMoney(c.total, currency)}
                        </Text>
                      </View>
                      <View style={[styles.catTrack, { backgroundColor: theme.inputBg }]}>
                        <View
                          style={[
                            styles.catFill,
                            { backgroundColor: cfg.color, width: `${Math.min(100, (c.total / Math.max(1, byCategory[0].total)) * 100)}%` },
                          ]}
                        />
                      </View>
                      <Text style={[styles.catSub, { color: theme.textMuted }]}>
                        {c.count} {c.count === 1 ? 'transaction' : 'transactions'} · {pct}%
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </GlassCard>
        )}

        {/* 6-month cashflow comparison */}
        {cashflowData.length > 0 && (
          <GlassCard variant="solid" style={styles.chartCard}>
            <SectionHead title="6-month comparison" subtitle="Income vs expense" />
            <MultiBar
              data={cashflowData}
              primaryColor={theme.success}
              secondaryColor={theme.danger}
              height={170}
            />
          </GlassCard>
        )}

        {/* Upcoming bills */}
        {summary?.upcomingBills?.length > 0 && (
          <GlassCard variant="solid" style={styles.chartCard}>
            <SectionHead
              title="Bills due soon"
              subtitle="Next 7 days"
              right={(
                <TouchableOpacity onPress={() => navigation.navigate('Bills')}>
                  <Text style={[styles.linkText, { color: theme.primary }]}>See all</Text>
                </TouchableOpacity>
              )}
            />
            {summary.upcomingBills.slice(0, 4).map((b) => {
              const due = new Date(b.nextDueAt);
              const days = Math.max(0, Math.ceil((due - new Date()) / 86400000));
              return (
                <View key={b._id} style={styles.billRow}>
                  <View style={[styles.billDot, { backgroundColor: b.color || theme.primary }]}>
                    <Text style={{ fontSize: 16 }}>{b.emoji || '💸'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.billName, { color: theme.text }]}>{b.name}</Text>
                    <Text style={[styles.billSub, { color: theme.textMuted }]}>
                      {days === 0 ? 'Today' : `In ${days} day${days > 1 ? 's' : ''}`} · {b.frequency}
                    </Text>
                  </View>
                  <Text style={[styles.billAmount, { color: theme.text }]}>
                    {fmtMoney(b.amount, currency)}
                  </Text>
                </View>
              );
            })}
          </GlassCard>
        )}

        {/* Savings goals preview */}
        {summary?.goals?.length > 0 && (
          <GlassCard variant="solid" style={styles.chartCard}>
            <SectionHead
              title="Savings goals"
              subtitle={`${summary.goals.length} active`}
              right={(
                <TouchableOpacity onPress={() => navigation.navigate('SavingsGoals')}>
                  <Text style={[styles.linkText, { color: theme.primary }]}>Manage</Text>
                </TouchableOpacity>
              )}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingVertical: 6 }}>
              {summary.goals.slice(0, 5).map((g) => (
                <TouchableOpacity
                  key={g._id}
                  onPress={() => navigation.navigate('SavingsGoals')}
                  activeOpacity={0.85}
                  style={styles.goalChip}
                >
                  <GoalRing
                    size={92}
                    color={g.color || theme.primary}
                    value={g.saved}
                    target={g.target}
                  />
                  <Text style={[styles.goalName, { color: theme.text }]} numberOfLines={1}>
                    {g.emoji || '🎯'} {g.name}
                  </Text>
                  <Text style={[styles.goalSub, { color: theme.textMuted }]}>
                    {fmtMoney(g.saved, currency)} / {fmtMoney(g.target, currency)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </GlassCard>
        )}

        {loading && (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <ActivityIndicator color={theme.primary} />
          </View>
        )}

        {!loading && !summary?.spend && !summary?.income && (
          <GlassCard variant="accent" glow style={{ marginTop: 18 }}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Track your first expense</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Tap "Expense" or "Income" above to start. Set a monthly budget in settings to unlock alerts.
            </Text>
          </GlassCard>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </LiquidBackground>
  );
}

function KpiRow({ color, label, value }) {
  const { theme } = useTheme();
  return (
    <View style={styles.kpiRow}>
      <View style={[styles.kpiDot, { backgroundColor: color }]} />
      <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.kpiValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

function SectionHead({ title, subtitle, right }) {
  const { theme } = useTheme();
  return (
    <View style={styles.sectionHead}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.sectionSub, { color: theme.textMuted }]}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

function Legend({ color, label }) {
  const { theme } = useTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

function QuickTile({ icon, label, onPress, color }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ flex: 1 }}>
      <GlassCard variant="light" style={styles.quickTile}>
        <View style={[styles.quickIcon, { backgroundColor: `${color}25`, borderColor: `${color}55` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={[styles.quickLabel, { color: theme.text }]}>{label}</Text>
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 8,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  scroll: { paddingHorizontal: 18, paddingTop: 4 },

  monthRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, marginBottom: 14,
  },
  monthBtn: { padding: 10 },
  monthText: { fontSize: 14, fontWeight: '700' },

  hero: { marginBottom: 14 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroSide: { flex: 1, gap: 8 },
  kpiRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kpiDot: { width: 8, height: 8, borderRadius: 4 },
  kpiLabel: { fontSize: 11, fontWeight: '700', flex: 1, letterSpacing: 0.4 },
  kpiValue: { fontSize: 14, fontWeight: '800' },

  budgetBar: { height: 10, borderRadius: 6, overflow: 'hidden' },
  budgetMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  budgetMeta: { fontSize: 11, fontWeight: '600' },

  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },

  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  quickTile: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  quickIcon: {
    width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  quickLabel: { fontSize: 12, fontWeight: '700' },

  chartCard: { marginBottom: 14 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  sectionSub: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  linkText: { fontSize: 12, fontWeight: '700' },

  legendRow: { flexDirection: 'row', gap: 14, marginTop: 10, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },

  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  catEmoji: {
    width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  catTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  catName: { fontSize: 13, fontWeight: '700' },
  catAmount: { fontSize: 13, fontWeight: '800' },
  catTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  catFill: { height: '100%', borderRadius: 3 },
  catSub: { fontSize: 10, marginTop: 4, fontWeight: '600' },

  billRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  billDot: {
    width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  billName: { fontSize: 13, fontWeight: '700' },
  billSub: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  billAmount: { fontSize: 13, fontWeight: '800' },

  goalChip: { width: 130, alignItems: 'center', gap: 6 },
  goalName: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  goalSub: { fontSize: 10, fontWeight: '600' },

  emptyTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  emptyText: { fontSize: 13, lineHeight: 18 },
});
