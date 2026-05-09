import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import LiquidBackground from '../components/LiquidBackground';
import GlassCard from '../components/GlassCard';
import GlassInput from '../components/GlassInput';
import GlassButton from '../components/GlassButton';
import api from '../api/client';
import { EXPENSE_CATEGORIES, CURRENCY_SYMBOLS, fmtMoney } from '../config/budget';

export default function BudgetSettingsScreen({ navigation, route }) {
  const { theme } = useTheme();
  const month = route.params?.month;
  const [totalLimit, setTotalLimit] = useState('');
  const [alertThreshold, setAlertThreshold] = useState(80);
  const [categoryLimits, setCategoryLimits] = useState({});
  const [currency, setCurrency] = useState('USD');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    api.get(`/budget/budgets?month=${month}`).then((res) => {
      if (!alive) return;
      const b = res.data.budget || {};
      setTotalLimit(b.totalLimit ? String(b.totalLimit) : '');
      setAlertThreshold(b.alertThreshold || 80);
      setCategoryLimits(b.categoryLimits || {});
      setCurrency(b.currency || 'USD');
    }).catch(() => {});
    return () => { alive = false; };
  }, [month]);

  const setCatLimit = (id, value) => {
    const v = value.replace(/[^0-9.]/g, '');
    setCategoryLimits((prev) => {
      const next = { ...prev };
      if (!v) delete next[id]; else next[id] = parseFloat(v);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/budget/budgets', {
        month,
        totalLimit: totalLimit ? parseFloat(totalLimit) : 0,
        alertThreshold,
        categoryLimits,
        currency,
      });
      Alert.alert('Saved', 'Your budget for this month has been updated.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Could not save', e?.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <LiquidBackground>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Budget settings</Text>
          <View style={styles.iconBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={[styles.subhead, { color: theme.textMuted }]}>For {month}</Text>

          {/* Currency */}
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>CURRENCY</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {Object.keys(CURRENCY_SYMBOLS).map((c) => {
              const on = c === currency;
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCurrency(c)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: on ? `${theme.primary}30` : theme.inputBg,
                      borderColor: on ? theme.primary : theme.glassBorder,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: on ? theme.text : theme.textSecondary }]}>
                    {CURRENCY_SYMBOLS[c]} {c}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Total limit */}
          <GlassInput
            label="Monthly limit (total)"
            value={totalLimit}
            onChangeText={(v) => setTotalLimit(v.replace(/[^0-9.]/g, ''))}
            placeholder={`${CURRENCY_SYMBOLS[currency]} 0.00`}
            icon="wallet-outline"
            keyboardType="decimal-pad"
            style={{ marginTop: 16 }}
          />

          {/* Alert threshold */}
          <GlassCard variant="solid" style={{ marginBottom: 16 }}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Alert at {alertThreshold}%</Text>
            <Text style={[styles.sectionSub, { color: theme.textMuted }]}>
              Warn when monthly spend crosses this percentage of the limit.
            </Text>
            <View style={[styles.threshRow, { backgroundColor: theme.inputBg }]}>
              {[50, 65, 80, 90, 100].map((v) => {
                const on = alertThreshold === v;
                return (
                  <TouchableOpacity
                    key={v}
                    onPress={() => setAlertThreshold(v)}
                    style={[styles.threshBtn, on && { backgroundColor: theme.primary }]}
                  >
                    <Text style={[styles.threshText, { color: on ? '#fff' : theme.textSecondary }]}>
                      {v}%
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </GlassCard>

          {/* Category caps */}
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>CATEGORY LIMITS</Text>
          {EXPENSE_CATEGORIES.map((c) => {
            const v = categoryLimits[c.id] || '';
            return (
              <GlassCard key={c.id} variant="light" style={styles.catRow}>
                <View style={[styles.catEmoji, { backgroundColor: `${c.color}25` }]}>
                  <Text style={{ fontSize: 18 }}>{c.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.catName, { color: theme.text }]}>{c.label}</Text>
                </View>
                <GlassInput
                  value={String(v)}
                  onChangeText={(val) => setCatLimit(c.id, val)}
                  placeholder="—"
                  keyboardType="decimal-pad"
                  style={{ marginBottom: 0, width: 110 }}
                  inputStyle={{ fontSize: 14, paddingVertical: 8, textAlign: 'right' }}
                />
              </GlassCard>
            );
          })}

          <GlassButton title="Save budget" icon="checkmark" onPress={save} loading={saving} fullWidth style={{ marginTop: 12 }} />
          <View style={{ height: 80 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  subhead: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 10, marginTop: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  sectionSub: { fontSize: 12, fontWeight: '500', marginBottom: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 999, borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '700' },

  threshRow: { flexDirection: 'row', borderRadius: 999, padding: 3 },
  threshBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 999 },
  threshText: { fontSize: 12, fontWeight: '700' },

  catRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, marginBottom: 8,
  },
  catEmoji: {
    width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  catName: { fontSize: 13, fontWeight: '700' },
});
