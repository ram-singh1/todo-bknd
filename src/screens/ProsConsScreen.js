import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, Alert, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import LiquidBackground from '../components/LiquidBackground';
import GlassCard from '../components/GlassCard';
import GlassInput from '../components/GlassInput';
import GlassButton from '../components/GlassButton';
import { ShareBar } from '../components/AdvancedCharts';
import api from '../api/client';

let nextId = 1;
const uid = () => `id-${nextId++}`;

export default function ProsConsScreen({ navigation }) {
  const { theme } = useTheme();
  const [list, setList] = useState([]);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/tools?kind=pros-cons');
      setList(res.data.tools || []);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <LiquidBackground>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="close" size={26} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>⚖️ Pros &amp; Cons</Text>
        <TouchableOpacity onPress={() => setShowNew(true)} style={styles.iconBtn}>
          <Ionicons name="add" size={26} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {list.length === 0 && (
          <GlassCard variant="accent" glow>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Weigh a decision</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              List the pros and cons. Give each one a weight from 1–5. The bar tells you which side wins.
            </Text>
            <GlassButton title="New" icon="add" onPress={() => setShowNew(true)} fullWidth style={{ marginTop: 12 }} />
          </GlassCard>
        )}

        {list.map((t) => {
          const proSum = (t.payload?.pros || []).reduce((s, p) => s + (p.weight || 1), 0);
          const conSum = (t.payload?.cons || []).reduce((s, p) => s + (p.weight || 1), 0);
          const verdict = proSum > conSum ? 'GO' : conSum > proSum ? 'STOP' : 'EVEN';
          const verdictColor = proSum > conSum ? theme.success : conSum > proSum ? theme.danger : theme.warning;
          return (
            <GlassCard key={t._id} variant="solid" style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{t.title}</Text>
                <View style={[styles.verdict, { backgroundColor: `${verdictColor}25`, borderColor: `${verdictColor}66` }]}>
                  <Text style={{ color: verdictColor, fontSize: 12, fontWeight: '800' }}>{verdict}</Text>
                </View>
              </View>
              <View style={{ marginTop: 12 }}>
                <ShareBar
                  data={[
                    { label: `Pros ${proSum}`, value: proSum, color: theme.success },
                    { label: `Cons ${conSum}`, value: conSum, color: theme.danger },
                  ]}
                  height={10}
                />
              </View>
            </GlassCard>
          );
        })}

        <View style={{ height: 80 }} />
      </ScrollView>

      <NewModal visible={showNew} onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); load(); }} />
    </LiquidBackground>
  );
}

function NewModal({ visible, onClose, onSaved }) {
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [pros, setPros] = useState([{ id: uid(), text: '', weight: 3 }]);
  const [cons, setCons] = useState([{ id: uid(), text: '', weight: 3 }]);
  const [saving, setSaving] = useState(false);

  const proSum = useMemo(() => pros.reduce((s, p) => s + (p.text ? p.weight : 0), 0), [pros]);
  const conSum = useMemo(() => cons.reduce((s, p) => s + (p.text ? p.weight : 0), 0), [cons]);

  const submit = async () => {
    if (!title) { Alert.alert('Add a title'); return; }
    setSaving(true);
    try {
      await api.post('/tools', {
        kind: 'pros-cons', title,
        payload: {
          pros: pros.filter((p) => p.text).map(({ text, weight }) => ({ text, weight })),
          cons: cons.filter((p) => p.text).map(({ text, weight }) => ({ text, weight })),
          verdict: proSum > conSum ? 'go' : conSum > proSum ? 'stop' : 'even',
        },
      });
      setTitle(''); setPros([{ id: uid(), text: '', weight: 3 }]); setCons([{ id: uid(), text: '', weight: 3 }]);
      onSaved();
    } catch (e) {
      Alert.alert('Could not save', e?.response?.data?.message || e.message);
    } finally { setSaving(false); }
  };

  const renderRow = (items, setItems, color) => items.map((it, idx) => (
    <View key={it.id} style={styles.proRow}>
      <TextInput
        value={it.text}
        onChangeText={(v) => setItems(items.map((x, i) => i === idx ? { ...x, text: v } : x))}
        placeholder="…"
        placeholderTextColor={theme.textMuted}
        style={[styles.input, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.glassBorder }]}
      />
      <View style={[styles.weightRow, { backgroundColor: theme.inputBg, borderColor: theme.glassBorder }]}>
        {[1, 2, 3, 4, 5].map((w) => {
          const on = it.weight === w;
          return (
            <TouchableOpacity key={w} onPress={() => setItems(items.map((x, i) => i === idx ? { ...x, weight: w } : x))}
              style={[styles.weightBtn, on && { backgroundColor: color }]}>
              <Text style={{ color: on ? '#fff' : theme.text, fontWeight: '700', fontSize: 11 }}>{w}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity onPress={() => setItems(items.filter((_, i) => i !== idx))}>
        <Ionicons name="close-circle" size={18} color={theme.textMuted} />
      </TouchableOpacity>
    </View>
  ));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <ScrollView style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.glassBorder }]}>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>New decision</Text>
            <GlassInput label="Question" value={title} onChangeText={setTitle} placeholder="e.g. Should I take this job?" icon="help-circle-outline" />

            {/* Live verdict */}
            {(proSum + conSum > 0) && (
              <View style={{ marginVertical: 10 }}>
                <ShareBar
                  data={[
                    { label: `Pros ${proSum}`, value: proSum, color: theme.success },
                    { label: `Cons ${conSum}`, value: conSum, color: theme.danger },
                  ]}
                  height={12}
                />
              </View>
            )}

            <View style={[styles.sectionHead]}>
              <Text style={[styles.section, { color: theme.success }]}>👍 PROS</Text>
              <TouchableOpacity onPress={() => setPros([...pros, { id: uid(), text: '', weight: 3 }])}>
                <Text style={[styles.addBtn, { color: theme.success }]}>+ Add</Text>
              </TouchableOpacity>
            </View>
            {renderRow(pros, setPros, theme.success)}

            <View style={[styles.sectionHead, { marginTop: 10 }]}>
              <Text style={[styles.section, { color: theme.danger }]}>👎 CONS</Text>
              <TouchableOpacity onPress={() => setCons([...cons, { id: uid(), text: '', weight: 3 }])}>
                <Text style={[styles.addBtn, { color: theme.danger }]}>+ Add</Text>
              </TouchableOpacity>
            </View>
            {renderRow(cons, setCons, theme.danger)}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
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

  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  emptyText: { fontSize: 13, lineHeight: 19 },
  cardTitle: { fontSize: 14, fontWeight: '800', flex: 1 },
  verdict: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },

  sheet: {
    paddingHorizontal: 20, paddingTop: 22, paddingBottom: 30,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderBottomWidth: 0, maxHeight: '94%',
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },

  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  section: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  addBtn: { fontSize: 13, fontWeight: '800' },

  proRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  input: { flex: 1, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, fontSize: 13 },
  weightRow: { flexDirection: 'row', gap: 2, padding: 3, borderRadius: 999, borderWidth: 1 },
  weightBtn: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
