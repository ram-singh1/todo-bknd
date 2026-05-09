import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import LiquidBackground from '../components/LiquidBackground';
import GlassCard from '../components/GlassCard';
import GlassInput from '../components/GlassInput';
import GlassButton from '../components/GlassButton';
import api from '../api/client';
import { fmtMoney, EXPENSE_CATEGORIES, CURRENCY_SYMBOLS } from '../config/budget';

const BILL_EMOJIS = ['💸', '🏠', '⚡', '💧', '📺', '🎵', '📱', '☁️', '🚗', '📚', '🎮', '🛒'];

export default function BillsScreen({ navigation }) {
  const { theme } = useTheme();
  const [bills, setBills] = useState([]);
  const [monthlyBurn, setMonthlyBurn] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all'); // all | bill | subscription
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/budget/bills');
      setBills(res.data.bills || []);
      setMonthlyBurn(res.data.monthlyBurn || 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const logPayment = async (b) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await api.post(`/budget/bills/${b._id}/log`);
      load();
    } catch (e) {
      Alert.alert('Could not log', e?.response?.data?.message || e.message);
    }
  };

  const remove = (b) => {
    Alert.alert('Delete?', `"${b.name}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await api.delete(`/budget/bills/${b._id}`);
          load();
        },
      },
    ]);
  };

  const filtered = tab === 'all' ? bills : bills.filter((b) => b.kind === tab);

  return (
    <LiquidBackground>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Bills & Subscriptions</Text>
        <TouchableOpacity onPress={() => setShowCreate(true)} style={styles.iconBtn}>
          <Ionicons name="add" size={26} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Subscription burn */}
        {monthlyBurn > 0 && (
          <GlassCard variant="solid" glow style={styles.burnCard}>
            <Text style={[styles.burnLabel, { color: theme.textMuted }]}>SUBSCRIPTION BURN</Text>
            <Text style={[styles.burnValue, { color: theme.text }]}>
              {fmtMoney(monthlyBurn, 'USD')}<Text style={{ fontSize: 14, color: theme.textMuted }}> /mo</Text>
            </Text>
            <Text style={[styles.burnSub, { color: theme.textSecondary }]}>
              ≈ {fmtMoney(monthlyBurn * 12, 'USD')} per year
            </Text>
          </GlassCard>
        )}

        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: theme.inputBg, borderColor: theme.glassBorder }]}>
          {[
            { id: 'all', label: 'All' },
            { id: 'bill', label: 'Bills' },
            { id: 'subscription', label: 'Subscriptions' },
          ].map((t) => {
            const on = tab === t.id;
            return (
              <TouchableOpacity key={t.id} onPress={() => setTab(t.id)} style={[styles.tab, on && { backgroundColor: theme.primary }]}>
                <Text style={[styles.tabText, { color: on ? '#fff' : theme.textSecondary }]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {filtered.length === 0 && !loading && (
          <GlassCard variant="accent" glow style={{ marginTop: 8 }}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Nothing scheduled yet</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Add a recurring bill (rent, internet) or a subscription (Netflix, Spotify) to track upcoming charges and total monthly burn.
            </Text>
            <GlassButton title="Add a bill" icon="add" onPress={() => setShowCreate(true)} fullWidth style={{ marginTop: 12 }} />
          </GlassCard>
        )}

        {filtered.map((b) => {
          const due = new Date(b.nextDueAt);
          const days = Math.ceil((due - new Date()) / 86400000);
          const overdue = days < 0;
          const soon = days >= 0 && days <= 3;
          return (
            <GlassCard key={b._id} variant="solid" style={styles.billCard}>
              <View style={[styles.billDot, { backgroundColor: `${b.color || theme.primary}25`, borderColor: `${b.color || theme.primary}66` }]}>
                <Text style={{ fontSize: 22 }}>{b.emoji || '💸'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.billName, { color: theme.text }]} numberOfLines={1}>{b.name}</Text>
                  {b.kind === 'subscription' && (
                    <View style={[styles.tag, { backgroundColor: `${theme.primary}25` }]}>
                      <Text style={[styles.tagText, { color: theme.primary }]}>SUB</Text>
                    </View>
                  )}
                  {b.autoLog && (
                    <View style={[styles.tag, { backgroundColor: `${theme.success}25` }]}>
                      <Text style={[styles.tagText, { color: theme.success }]}>AUTO</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.billSub, { color: overdue ? theme.danger : soon ? theme.warning : theme.textMuted }]}>
                  {overdue
                    ? `Overdue by ${Math.abs(days)}d`
                    : days === 0 ? 'Due today'
                    : `Due in ${days}d · ${b.frequency}`}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.billAmount, { color: theme.text }]}>
                  {fmtMoney(b.amount, b.currency)}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                  <TouchableOpacity onPress={() => logPayment(b)} style={[styles.miniBtn, { backgroundColor: theme.primary }]}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                    <Text style={styles.miniBtnText}>Paid</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => remove(b)} style={[styles.miniBtn, { backgroundColor: theme.inputBg, borderColor: theme.glassBorder, borderWidth: 1 }]}>
                    <Ionicons name="trash-outline" size={14} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            </GlassCard>
          );
        })}

        <View style={{ height: 80 }} />
      </ScrollView>

      <CreateBillModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); load(); }}
      />
    </LiquidBackground>
  );
}

function CreateBillModal({ visible, onClose, onCreated }) {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState('bill');
  const [frequency, setFrequency] = useState('monthly');
  const [emoji, setEmoji] = useState('💸');
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  });
  const [showPicker, setShowPicker] = useState(false);
  const [autoLog, setAutoLog] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const a = parseFloat(amount);
    if (!name || !a) {
      Alert.alert('Missing info', 'Set a name and amount.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/budget/bills', {
        name, amount: a, kind, frequency, emoji,
        nextDueAt: date.toISOString(),
        autoLog,
        category: kind === 'subscription' ? 'subscriptions' : 'bills',
      });
      setName(''); setAmount(''); setKind('bill'); setFrequency('monthly'); setEmoji('💸'); setAutoLog(false);
      onCreated();
    } catch (e) {
      Alert.alert('Could not create', e?.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <ScrollView style={[styles.modalSheet, { backgroundColor: theme.surface, borderColor: theme.glassBorder }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>New recurring</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
              {BILL_EMOJIS.map((e) => (
                <TouchableOpacity key={e} onPress={() => setEmoji(e)}
                  style={[styles.emojiChip, {
                    backgroundColor: emoji === e ? `${theme.primary}30` : theme.inputBg,
                    borderColor: emoji === e ? theme.primary : theme.glassBorder,
                  }]}>
                  <Text style={{ fontSize: 20 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={[styles.kindRow, { backgroundColor: theme.inputBg, borderColor: theme.glassBorder }]}>
              {[{ id: 'bill', label: 'Bill' }, { id: 'subscription', label: 'Subscription' }].map((k) => {
                const on = kind === k.id;
                return (
                  <TouchableOpacity key={k.id} onPress={() => setKind(k.id)} style={[styles.kindBtn, on && { backgroundColor: theme.primary }]}>
                    <Text style={[styles.kindText, { color: on ? '#fff' : theme.textSecondary }]}>{k.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <GlassInput label="Name" value={name} onChangeText={setName} placeholder="e.g. Netflix" icon="bookmark-outline" />
            <GlassInput
              label="Amount"
              value={amount}
              onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))}
              placeholder="0.00"
              icon="wallet-outline"
              keyboardType="decimal-pad"
            />

            <Text style={[styles.label, { color: theme.textMuted }]}>FREQUENCY</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
              {['daily', 'weekly', 'monthly', 'yearly'].map((f) => {
                const on = frequency === f;
                return (
                  <TouchableOpacity key={f} onPress={() => setFrequency(f)}
                    style={[styles.chip, {
                      flex: 1, justifyContent: 'center',
                      backgroundColor: on ? `${theme.primary}30` : theme.inputBg,
                      borderColor: on ? theme.primary : theme.glassBorder,
                    }]}>
                    <Text style={[styles.chipText, { color: on ? theme.text : theme.textSecondary }]}>{f}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.label, { color: theme.textMuted }]}>NEXT DUE</Text>
            <TouchableOpacity onPress={() => setShowPicker(true)}>
              <GlassCard variant="light" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Ionicons name="calendar-outline" size={18} color={theme.primary} />
                <Text style={{ color: theme.text, fontWeight: '700' }}>
                  {date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </GlassCard>
            </TouchableOpacity>
            {showPicker && (
              <DateTimePicker
                value={date} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(_, d) => { setShowPicker(Platform.OS === 'ios'); if (d) setDate(d); }}
                minimumDate={new Date()}
              />
            )}

            <TouchableOpacity onPress={() => setAutoLog(!autoLog)}>
              <GlassCard variant="light" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Ionicons name={autoLog ? 'checkbox' : 'square-outline'} size={20} color={autoLog ? theme.primary : theme.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: '700' }}>Auto-log when due</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 11 }}>
                    Create an expense automatically each cycle
                  </Text>
                </View>
              </GlassCard>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <GlassButton title="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
              <GlassButton title="Save" onPress={submit} loading={saving} style={{ flex: 1 }} />
            </View>
            <View style={{ height: 30 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
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

  burnCard: { marginBottom: 14 },
  burnLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  burnValue: { fontSize: 36, fontWeight: '800', marginTop: 4 },
  burnSub: { fontSize: 12, fontWeight: '600', marginTop: 4 },

  tabs: {
    flexDirection: 'row', borderRadius: 999, padding: 3, borderWidth: 1, marginBottom: 12,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 999 },
  tabText: { fontSize: 12, fontWeight: '800' },

  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  emptyText: { fontSize: 13, lineHeight: 19 },

  billCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  billDot: {
    width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  billName: { fontSize: 14, fontWeight: '800' },
  billSub: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  billAmount: { fontSize: 14, fontWeight: '800' },
  tag: { paddingVertical: 1, paddingHorizontal: 6, borderRadius: 4 },
  tagText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  miniBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8,
  },
  miniBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    paddingHorizontal: 20, paddingTop: 22, paddingBottom: 30,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderBottomWidth: 0,
    maxHeight: '92%',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },

  emojiChip: {
    width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  kindRow: { flexDirection: 'row', borderRadius: 999, padding: 3, borderWidth: 1, marginBottom: 14 },
  kindBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 999 },
  kindText: { fontSize: 12, fontWeight: '800', textTransform: 'capitalize' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 999, borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
});
