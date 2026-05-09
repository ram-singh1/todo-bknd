import React, { useState, useEffect } from 'react';
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
import {
  EXPENSE_CATEGORIES, PAYMENT_METHODS, CURRENCY_SYMBOLS, resolveCategory,
} from '../config/budget';

const NEW_CATEGORY_COLORS = ['#6C63FF', '#10B981', '#F97316', '#EC4899', '#0EA5E9', '#A78BFA', '#F59E0B', '#EF4444', '#94A3B8'];
const NEW_CATEGORY_EMOJIS = ['🔸', '🍔', '🚗', '🏠', '💼', '🎮', '📱', '🎵', '✈️', '🐾', '🌱', '⛽', '☕', '💄', '🛠️', '📦'];

// Wider palette for per-transaction overrides so users can mark a single
// entry distinctively (e.g. a birthday gift that should stand out).
const ENTRY_EMOJIS = [
  '⭐', '🔥', '💎', '🎁', '🎂', '🍕', '🍣', '🍷', '🍻', '☕', '🍼',
  '🚕', '🚂', '✈️', '⛽', '🏖️', '🎫', '🎭', '🎮', '🎧', '🎸',
  '💊', '🩺', '🦷', '💪', '🛒', '👕', '👟', '👜', '💄', '💍',
  '📚', '✏️', '🎓', '💻', '🖱️', '📷', '📱', '🔌',
  '🐶', '🐱', '🌱', '🪴', '🧹', '🧴', '🛠️', '🔧',
];
const ENTRY_COLORS = [
  '#6C63FF', '#A78BFA', '#EC4899', '#F472B6',
  '#EF4444', '#F97316', '#F59E0B', '#FBBF24',
  '#10B981', '#22C55E', '#0EA5E9', '#06B6D4',
  '#3B82F6', '#8B5CF6', '#14B8A6', '#94A3B8',
];

export default function AddExpenseScreen({ navigation, route }) {
  const { theme } = useTheme();
  const initialKind = route.params?.kind || 'expense';

  const [kind, setKind] = useState(initialKind);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [currency, setCurrency] = useState('USD');
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [customCats, setCustomCats] = useState([]);
  const [showNewCat, setShowNewCat] = useState(false);
  const [showCurrency, setShowCurrency] = useState(false);
  // Per-transaction overrides — null = inherit from category
  const [overrideEmoji, setOverrideEmoji] = useState(null);
  const [overrideColor, setOverrideColor] = useState(null);
  const [showCustomize, setShowCustomize] = useState(false);

  const reloadCategories = async () => {
    try {
      const res = await api.get('/budget/categories');
      setCustomCats(res.data.custom || []);
    } catch {}
  };

  useEffect(() => { reloadCategories(); }, []);

  const submit = async () => {
    const a = parseFloat(amount);
    if (!a || a <= 0) {
      Alert.alert('Enter an amount', 'Please type a positive amount.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/budget/expenses', {
        amount: a,
        kind,
        category,
        paymentMethod,
        date: date.toISOString(),
        note,
        currency,
        ...(overrideEmoji ? { emoji: overrideEmoji } : {}),
        ...(overrideColor ? { color: overrideColor } : {}),
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Could not save', e?.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  // Combined picker list: built-ins followed by user customs
  const allCategories = [
    ...EXPENSE_CATEGORIES,
    ...customCats.map((c) => ({ ...c, custom: true })),
  ];

  return (
    <LiquidBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="close" size={26} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            New {kind === 'expense' ? 'expense' : 'income'}
          </Text>
          <View style={styles.iconBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Kind toggle */}
          <View style={[styles.kindRow, { backgroundColor: theme.inputBg, borderColor: theme.glassBorder }]}>
            {[
              { id: 'expense', label: 'Expense', color: theme.danger },
              { id: 'income', label: 'Income', color: theme.success },
            ].map((opt) => {
              const on = kind === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setKind(opt.id)}
                  style={[styles.kindBtn, on && { backgroundColor: opt.color }]}
                >
                  <Text style={[styles.kindText, { color: on ? '#fff' : theme.textSecondary }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Amount + Currency */}
          <GlassCard variant="solid" style={styles.amountCard}>
            <View style={styles.amountHead}>
              <Text style={[styles.amountLabel, { color: theme.textMuted }]}>AMOUNT</Text>
              <TouchableOpacity onPress={() => setShowCurrency(true)} style={[styles.currencyPill, { backgroundColor: theme.inputBg, borderColor: theme.glassBorder }]}>
                <Text style={{ color: theme.text, fontWeight: '800', fontSize: 12 }}>
                  {CURRENCY_SYMBOLS[currency] || ''} {currency}
                </Text>
                <Ionicons name="chevron-down" size={12} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.amountInputRow}>
              <Text style={[styles.amountSym, { color: theme.text }]}>
                {CURRENCY_SYMBOLS[currency] || ''}
              </Text>
              <GlassInput
                value={amount}
                onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))}
                placeholder="0.00"
                keyboardType="decimal-pad"
                style={{ flex: 1, marginBottom: 0 }}
                inputStyle={{ fontSize: 30, fontWeight: '800', paddingVertical: 8 }}
              />
            </View>
          </GlassCard>

          {/* Category */}
          <View style={styles.sectionHead}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>CATEGORY</Text>
            <TouchableOpacity onPress={() => setShowNewCat(true)}>
              <Text style={[styles.addLink, { color: theme.primary }]}>+ New</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.gridWrap}>
            {allCategories.map((c) => {
              const cfg = c.custom ? c : { ...c };
              const on = category === cfg.id;
              return (
                <TouchableOpacity
                  key={cfg.id}
                  onPress={() => setCategory(cfg.id)}
                  activeOpacity={0.85}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: on ? `${cfg.color}30` : theme.inputBg,
                      borderColor: on ? cfg.color : theme.glassBorder,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 16 }}>{cfg.emoji}</Text>
                  <Text style={[styles.chipText, { color: on ? theme.text : theme.textSecondary }]}>
                    {cfg.label}
                  </Text>
                  {c.custom && <Text style={{ color: theme.textMuted, fontSize: 9, marginLeft: 2 }}>•</Text>}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Payment method */}
          <Text style={[styles.sectionLabel, { color: theme.textMuted, marginTop: 18 }]}>PAID WITH</Text>
          <View style={styles.gridWrap}>
            {PAYMENT_METHODS.map((p) => {
              const on = paymentMethod === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setPaymentMethod(p.id)}
                  activeOpacity={0.85}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: on ? `${theme.primary}30` : theme.inputBg,
                      borderColor: on ? theme.primary : theme.glassBorder,
                    },
                  ]}
                >
                  <Ionicons name={p.icon} size={15} color={on ? theme.primary : theme.textMuted} />
                  <Text style={[styles.chipText, { color: on ? theme.text : theme.textSecondary }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Date */}
          <Text style={[styles.sectionLabel, { color: theme.textMuted, marginTop: 18 }]}>DATE</Text>
          <TouchableOpacity onPress={() => setShowPicker(true)}>
            <GlassCard variant="light" style={styles.dateCard}>
              <Ionicons name="calendar-outline" size={18} color={theme.primary} />
              <Text style={[styles.dateText, { color: theme.text }]}>
                {date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </GlassCard>
          </TouchableOpacity>
          {showPicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(_, d) => {
                setShowPicker(Platform.OS === 'ios');
                if (d) setDate(d);
              }}
              maximumDate={new Date()}
            />
          )}

          {/* Note */}
          <GlassInput
            label="Note (optional)"
            value={note}
            onChangeText={setNote}
            placeholder="What was it for?"
            icon="create-outline"
            multiline
            numberOfLines={3}
            maxLength={240}
            style={{ marginTop: 6 }}
          />

          {/* Customize this entry — overrides category icon/color for this row only */}
          <TouchableOpacity onPress={() => setShowCustomize(!showCustomize)} activeOpacity={0.85}>
            <GlassCard variant="light" style={styles.customizeHead}>
              <Ionicons
                name={showCustomize ? 'chevron-down' : 'chevron-forward'}
                size={18}
                color={theme.textMuted}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>
                  Customize this entry
                </Text>
                <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 2 }}>
                  Override icon &amp; color for just this transaction
                </Text>
              </View>
              {(overrideEmoji || overrideColor) && (
                <View style={[
                  styles.previewDot,
                  { backgroundColor: `${overrideColor || theme.primary}30`, borderColor: overrideColor || theme.primary },
                ]}>
                  <Text style={{ fontSize: 16 }}>{overrideEmoji || '🔸'}</Text>
                </View>
              )}
            </GlassCard>
          </TouchableOpacity>

          {showCustomize && (
            <GlassCard variant="solid" style={styles.customizeBody}>
              <View style={styles.customRow}>
                <Text style={[styles.customLabel, { color: theme.textMuted }]}>ICON</Text>
                {overrideEmoji && (
                  <TouchableOpacity onPress={() => setOverrideEmoji(null)}>
                    <Text style={[styles.resetText, { color: theme.primary }]}>Use category</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.gridWrap}>
                {ENTRY_EMOJIS.map((e) => {
                  const on = overrideEmoji === e;
                  return (
                    <TouchableOpacity
                      key={e}
                      onPress={() => setOverrideEmoji(e)}
                      style={[
                        styles.emojiTile,
                        {
                          backgroundColor: on ? `${theme.primary}30` : theme.inputBg,
                          borderColor: on ? theme.primary : theme.glassBorder,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 18 }}>{e}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={[styles.customRow, { marginTop: 14 }]}>
                <Text style={[styles.customLabel, { color: theme.textMuted }]}>COLOR</Text>
                {overrideColor && (
                  <TouchableOpacity onPress={() => setOverrideColor(null)}>
                    <Text style={[styles.resetText, { color: theme.primary }]}>Use category</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.gridWrap}>
                {ENTRY_COLORS.map((c) => {
                  const on = overrideColor === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setOverrideColor(c)}
                      style={[
                        styles.colorTile,
                        { backgroundColor: c, borderWidth: on ? 3 : 0, borderColor: '#fff' },
                      ]}
                    />
                  );
                })}
              </View>
            </GlassCard>
          )}

          <GlassButton
            title={`Save ${kind}`}
            icon="checkmark"
            onPress={submit}
            loading={saving}
            fullWidth
            style={{ marginTop: 12 }}
          />
          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <NewCategoryModal
        visible={showNewCat}
        onClose={() => setShowNewCat(false)}
        onCreated={(c) => {
          setShowNewCat(false);
          setCustomCats((prev) => [...prev, c]);
          setCategory(c.id);
        }}
      />
      <CurrencyModal
        visible={showCurrency}
        currency={currency}
        onSelect={(c) => { setCurrency(c); setShowCurrency(false); }}
        onClose={() => setShowCurrency(false)}
      />
    </LiquidBackground>
  );
}

function NewCategoryModal({ visible, onClose, onCreated }) {
  const { theme } = useTheme();
  const [label, setLabel] = useState('');
  const [emoji, setEmoji] = useState('🔸');
  const [color, setColor] = useState(NEW_CATEGORY_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!label.trim()) { Alert.alert('Type a name'); return; }
    setSaving(true);
    try {
      const res = await api.post('/budget/categories', { label: label.trim(), emoji, color });
      setLabel(''); setEmoji('🔸'); setColor(NEW_CATEGORY_COLORS[0]);
      onCreated(res.data.category);
    } catch (e) {
      Alert.alert('Could not save', e?.response?.data?.message || e.message);
    } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.glassBorder }]}>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>New category</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
              {NEW_CATEGORY_EMOJIS.map((e) => (
                <TouchableOpacity key={e} onPress={() => setEmoji(e)}
                  style={[styles.emojiChip, {
                    backgroundColor: emoji === e ? `${color}30` : theme.inputBg,
                    borderColor: emoji === e ? color : theme.glassBorder,
                  }]}>
                  <Text style={{ fontSize: 22 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, marginBottom: 12 }}>
              {NEW_CATEGORY_COLORS.map((c) => (
                <TouchableOpacity key={c} onPress={() => setColor(c)}
                  style={[styles.colorDot, { backgroundColor: c, borderWidth: c === color ? 3 : 0, borderColor: '#fff' }]} />
              ))}
            </ScrollView>

            <GlassInput
              label="Name"
              value={label}
              onChangeText={setLabel}
              placeholder="e.g. Pet supplies"
              icon="bookmark-outline"
              maxLength={40}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <GlassButton title="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
              <GlassButton title="Save" onPress={submit} loading={saving} style={{ flex: 1 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function CurrencyModal({ visible, currency, onSelect, onClose }) {
  const { theme } = useTheme();
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} style={styles.modalBg} onPress={onClose}>
        <View style={[styles.currencySheet, { backgroundColor: theme.surface, borderColor: theme.glassBorder }]}>
          <Text style={[styles.sheetTitle, { color: theme.text }]}>Currency</Text>
          <ScrollView style={{ maxHeight: 320 }}>
            {Object.keys(CURRENCY_SYMBOLS).map((c) => {
              const on = c === currency;
              return (
                <TouchableOpacity key={c} onPress={() => onSelect(c)} style={[styles.currencyRow, { borderBottomColor: theme.glassBorder }]}>
                  <Text style={[styles.currencySym, { color: theme.text }]}>{CURRENCY_SYMBOLS[c]}</Text>
                  <Text style={[styles.currencyCode, { color: theme.text }]}>{c}</Text>
                  {on && <Ionicons name="checkmark" size={20} color={theme.primary} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </TouchableOpacity>
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

  kindRow: {
    flexDirection: 'row', borderRadius: 999, padding: 4, borderWidth: 1, marginBottom: 14,
  },
  kindBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 999 },
  kindText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },

  amountCard: { marginBottom: 16 },
  amountHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  amountLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  currencyPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1,
  },
  amountInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  amountSym: { fontSize: 28, fontWeight: '800' },

  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 6 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  addLink: { fontSize: 13, fontWeight: '800' },

  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 999, borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '700' },

  dateCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  dateText: { fontSize: 14, fontWeight: '700' },

  customizeHead: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 14, marginTop: 4,
  },
  customizeBody: { marginTop: 8 },
  customRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
  },
  customLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  resetText: { fontSize: 12, fontWeight: '800' },
  emojiTile: {
    width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  colorTile: { width: 36, height: 36, borderRadius: 18 },
  previewDot: {
    width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    paddingHorizontal: 20, paddingTop: 22, paddingBottom: 30,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderBottomWidth: 0,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },

  emojiChip: {
    width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  colorDot: { width: 32, height: 32, borderRadius: 16 },

  currencySheet: {
    marginHorizontal: 30, marginTop: '40%',
    borderRadius: 22, borderWidth: 1, padding: 20,
  },
  currencyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 12, borderBottomWidth: 1,
  },
  currencySym: { width: 30, fontSize: 18, fontWeight: '800' },
  currencyCode: { flex: 1, fontSize: 14, fontWeight: '700' },
});
