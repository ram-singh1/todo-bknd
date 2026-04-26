import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, View, Text, ScrollView, KeyboardAvoidingView,
  Platform, Alert, TouchableOpacity, Switch, TextInput, Animated, Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import LiquidBackground from '../components/LiquidBackground';
import GlassCard from '../components/GlassCard';
import GlassInput from '../components/GlassInput';
import GlassButton from '../components/GlassButton';
import IconSelector from '../components/IconSelector';
import api from '../api/client';
import { categoryConfig, priorityConfig } from '../themes';
import { scheduleSmartRepeat } from '../utils/notifications';

// ── Attachment limits (kept in sync with backend) ─────────────
const MAX_ATTACHMENTS = 10;
const MAX_IMAGE_MB = 10;
const MAX_FILE_MB = 20;
const ATTACH_BATCH = 5;

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIconFor(mime, name = '') {
  const m = (mime || '').toLowerCase();
  const n = name.toLowerCase();
  if (m.includes('pdf') || n.endsWith('.pdf')) return 'document-text';
  if (m.includes('word') || n.match(/\.(doc|docx)$/)) return 'document';
  if (m.includes('sheet') || n.match(/\.(xls|xlsx|csv)$/)) return 'grid';
  if (m.includes('zip') || n.match(/\.(zip|rar|7z)$/)) return 'archive';
  if (m.includes('text') || n.match(/\.(txt|md)$/)) return 'reader';
  return 'document-attach';
}

// ── Smart defaults: emojis inferred from keywords in the task title ──
const KEYWORD_EMOJI = [
  [/call|phone|ring/i, '📞'],
  [/meet(ing)?|zoom/i, '🤝'],
  [/mail|email|reply/i, '📧'],
  [/buy|shop|order|grocer/i, '🛒'],
  [/pay|bill|invoice|bank/i, '💳'],
  [/gym|workout|exercise|run|walk/i, '💪'],
  [/eat|lunch|dinner|meal|food/i, '🍽️'],
  [/sleep|rest|nap/i, '😴'],
  [/read|book|study/i, '📚'],
  [/write|draft|doc/i, '✍️'],
  [/code|bug|deploy|git/i, '💻'],
  [/clean|wash|laundry/i, '🧹'],
  [/birthday|party|celebrat/i, '🎉'],
  [/travel|flight|trip/i, '✈️'],
  [/doctor|dentist|health|pill/i, '💊'],
  [/water|drink/i, '💧'],
  [/idea|brainstorm/i, '💡'],
];

const CATEGORY_KEYWORDS = [
  [/work|job|meet|email|project|client/i, 'work'],
  [/gym|workout|run|walk|health|doctor|meditat/i, 'health'],
  [/buy|shop|order|grocer|cart/i, 'shopping'],
  [/study|read|learn|exam|homework/i, 'study'],
  [/bill|pay|bank|invoice|money|finance/i, 'finance'],
  [/flight|trip|travel|vacation/i, 'travel'],
  [/call|friend|family|party|social/i, 'social'],
  [/urgent|asap|now|critical/i, 'urgent'],
];

function inferEmoji(title) {
  for (const [re, e] of KEYWORD_EMOJI) if (re.test(title)) return e;
  return '📝';
}

function inferCategory(title) {
  for (const [re, c] of CATEGORY_KEYWORDS) if (re.test(title)) return c;
  return 'general';
}

function inferPriority(title) {
  if (/!$|urgent|asap|critical|now/i.test(title)) return 'critical';
  if (/important|high|!!/i.test(title)) return 'high';
  if (/later|someday|low/i.test(title)) return 'low';
  return 'medium';
}

const QUICK_DATES = [
  { key: 'today', label: 'Today', emoji: '☀️', compute: () => {
    const d = new Date(); d.setHours(23, 59, 0, 0); return d;
  }},
  { key: 'tomorrow', label: 'Tomorrow', emoji: '🌤️', compute: () => {
    const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d;
  }},
  { key: 'week', label: 'Next week', emoji: '📅', compute: () => {
    const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(9, 0, 0, 0); return d;
  }},
  { key: 'weekend', label: 'Weekend', emoji: '🛋️', compute: () => {
    const d = new Date();
    const daysToSat = (6 - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + daysToSat); d.setHours(10, 0, 0, 0);
    return d;
  }},
];

export default function AddTodoScreen({ navigation }) {
  const { theme } = useTheme();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('medium');
  const [emoji, setEmoji] = useState('📝');
  const [dueDate, setDueDate] = useState(null);
  const [quickDate, setQuickDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState(15);
  const [tags, setTags] = useState('');
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [autoEmoji, setAutoEmoji] = useState(true);
  const [autoCategory, setAutoCategory] = useState(true);
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const [recurringPattern, setRecurringPattern] = useState('daily');
  const [recurringInterval, setRecurringInterval] = useState(1);
  const [smartRepeatEnabled, setSmartRepeatEnabled] = useState(false);
  const [smartRepeatMinutes, setSmartRepeatMinutes] = useState(10);
  const titleRef = useRef(null);

  // ── Smart inference: as the user types the title, we update emoji & category ──
  useEffect(() => {
    if (!title) return;
    if (autoEmoji) setEmoji(inferEmoji(title));
    if (autoCategory) setCategory(inferCategory(title));
    setPriority(inferPriority(title));
  }, [title]);

  // Auto-focus the title so typing starts immediately
  useEffect(() => {
    const t = setTimeout(() => titleRef.current?.focus(), 180);
    return () => clearTimeout(t);
  }, []);

  const pickQuickDate = (qd) => {
    Haptics.selectionAsync();
    if (quickDate === qd.key) {
      setQuickDate(null); setDueDate(null); return;
    }
    setQuickDate(qd.key);
    setDueDate(qd.compute());
  };

  // ── Attachments ─────────────────────────────────────────────

  const uploadPickedAssets = async (items) => {
    // items: [{ uri, name, mimeType, size }]
    if (!items || items.length === 0) return;

    // Client-side size gate to fail fast without hitting the network.
    for (const it of items) {
      const maxMb = (it.mimeType || '').startsWith('image/') ? MAX_IMAGE_MB : MAX_FILE_MB;
      if (it.size && it.size > maxMb * 1024 * 1024) {
        Alert.alert(
          'File too large',
          `"${it.name}" is ${(it.size / 1024 / 1024).toFixed(1)} MB. Max is ${maxMb} MB.`,
        );
        return;
      }
    }

    setUploading(true);
    try {
      const form = new FormData();
      items.forEach((it) => {
        form.append('files', {
          uri: it.uri,
          name: it.name || 'file',
          type: it.mimeType || 'application/octet-stream',
        });
      });

      // axios default Content-Type is JSON — override so boundary is set by RN.
      const res = await api.post('/uploads', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });
      setAttachments((prev) => [...prev, ...(res.data.attachments || [])]);
      await Haptics.selectionAsync();
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || 'Upload failed';
      Alert.alert('Upload failed', msg);
    } finally {
      setUploading(false);
    }
  };

  const pickImages = async () => {
    if (attachments.length >= MAX_ATTACHMENTS) {
      Alert.alert('Limit reached', `You can attach at most ${MAX_ATTACHMENTS} files per task.`);
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Enable photo access in Settings to attach images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: Math.min(ATTACH_BATCH, MAX_ATTACHMENTS - attachments.length),
        quality: 0.85,
        exif: false,
      });
      if (result.canceled) return;
      const items = (result.assets || []).map((a) => ({
        uri: a.uri,
        name: a.fileName || `photo-${Date.now()}.jpg`,
        mimeType: a.mimeType || 'image/jpeg',
        size: a.fileSize,
      }));
      await uploadPickedAssets(items);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not pick images');
    }
  };

  const takePhoto = async () => {
    if (attachments.length >= MAX_ATTACHMENTS) {
      Alert.alert('Limit reached', `You can attach at most ${MAX_ATTACHMENTS} files per task.`);
      return;
    }
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Enable camera access to take photos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        exif: false,
      });
      if (result.canceled) return;
      const a = result.assets?.[0];
      if (!a) return;
      await uploadPickedAssets([{
        uri: a.uri,
        name: a.fileName || `photo-${Date.now()}.jpg`,
        mimeType: a.mimeType || 'image/jpeg',
        size: a.fileSize,
      }]);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not capture photo');
    }
  };

  const pickFiles = async () => {
    if (attachments.length >= MAX_ATTACHMENTS) {
      Alert.alert('Limit reached', `You can attach at most ${MAX_ATTACHMENTS} files per task.`);
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'text/csv',
          'text/markdown',
          'application/zip',
          'application/json',
        ],
      });
      if (result.canceled) return;
      const picked = (result.assets || []).slice(0, MAX_ATTACHMENTS - attachments.length);
      const items = picked.map((a) => ({
        uri: a.uri,
        name: a.name || 'file',
        mimeType: a.mimeType || 'application/octet-stream',
        size: a.size,
      }));
      await uploadPickedAssets(items);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not pick files');
    }
  };

  const removeAttachment = async (att) => {
    setAttachments((prev) => prev.filter((a) => a.path !== att.path));
    // Best-effort server-side cleanup — don't block UI if it fails.
    try {
      await api.delete('/uploads', { data: { path: att.path } });
    } catch {}
  };

  // ── Save ────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Oops', 'Please enter a task title');
      return;
    }
    if (uploading) {
      Alert.alert('Please wait', 'An upload is still in progress.');
      return;
    }
    setLoading(true);
    try {
      const todoData = {
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        emoji,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        subtasks: subtasks.map(s => ({ title: s })),
        attachments: attachments.map((a) => ({
          kind: a.kind, path: a.path, url: a.url,
          name: a.name, mimeType: a.mimeType, size: a.size,
        })),
      };
      if (dueDate) todoData.dueDate = dueDate.toISOString();
      if (reminderEnabled && dueDate) {
        todoData.reminder = {
          enabled: true,
          time: new Date(dueDate.getTime() - reminderMinutes * 60000).toISOString(),
          advanceMinutes: reminderMinutes,
        };
      }
      if (recurringEnabled) {
        todoData.recurring = {
          enabled: true,
          pattern: recurringPattern,
          interval: recurringInterval,
        };
      }
      const created = await api.post('/todos', todoData);
      // Smart repeat: schedule N follow-ups locally. Stored under the new
      // todo's _id so toggleComplete can cancel them.
      if (smartRepeatEnabled && reminderEnabled && dueDate && created?.data?.todo?._id) {
        const firstFire = new Date(dueDate.getTime() - reminderMinutes * 60000);
        await scheduleSmartRepeat(
          created.data.todo._id,
          title.trim(),
          firstFire,
          Math.max(1, smartRepeatMinutes),
        );
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      const msg = error?.response?.data?.message || error.message || 'Failed to create task';
      Alert.alert('Could not create task', msg);
    } finally {
      setLoading(false);
    }
  };

  const addSubtask = () => {
    if (newSubtask.trim()) {
      setSubtasks([...subtasks, newSubtask.trim()]);
      setNewSubtask('');
    }
  };

  return (
    <LiquidBackground>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          ✨ Quick Add
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!title.trim() || loading}
          style={[styles.headerSave, { opacity: title.trim() ? 1 : 0.3 }]}
        >
          <Text style={[styles.headerSaveText, { color: theme.primary }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <>
              {/* ── HERO: big input + emoji + primary CTA (tap-tap flow) ── */}
              <GlassCard variant="solid" glow style={styles.hero}>
                <View style={styles.heroTopRow}>
                  <TouchableOpacity
                    style={[styles.emojiBubble, { backgroundColor: theme.inputBg, borderColor: theme.glassBorder }]}
                    onPress={() => { setAutoEmoji(false); setShowIconPicker(true); }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                  <TextInput
                    ref={titleRef}
                    style={[styles.titleInput, { color: theme.text }]}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="What needs to be done?"
                    placeholderTextColor={theme.textMuted}
                    maxLength={200}
                    returnKeyType="done"
                    onSubmitEditing={handleSave}
                    underlineColorAndroid="transparent"
                    selectionColor={theme.primary}
                  />
                </View>

                {/* Quick date chips */}
                <Text style={[styles.miniLabel, { color: theme.textMuted }]}>WHEN</Text>
                <View style={styles.quickRow}>
                  {QUICK_DATES.map((qd) => {
                    const active = quickDate === qd.key;
                    return (
                      <TouchableOpacity
                        key={qd.key}
                        onPress={() => pickQuickDate(qd)}
                        style={[
                          styles.quickChip,
                          {
                            backgroundColor: active ? `${theme.primary}30` : theme.inputBg,
                            borderColor: active ? theme.primary : 'transparent',
                          },
                        ]}
                      >
                        <Text style={styles.quickEmoji}>{qd.emoji}</Text>
                        <Text style={[styles.quickText, { color: active ? theme.primary : theme.textSecondary }]}>
                          {qd.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    onPress={() => { setQuickDate('custom'); setShowDatePicker(true); }}
                    style={[
                      styles.quickChip,
                      {
                        backgroundColor: quickDate === 'custom' ? `${theme.primary}30` : theme.inputBg,
                        borderColor: quickDate === 'custom' ? theme.primary : 'transparent',
                      },
                    ]}
                  >
                    <Ionicons name="calendar-outline" size={14} color={quickDate === 'custom' ? theme.primary : theme.textMuted} />
                    <Text style={[styles.quickText, { color: quickDate === 'custom' ? theme.primary : theme.textSecondary }]}>
                      Pick
                    </Text>
                  </TouchableOpacity>
                </View>

                {dueDate && (
                  <Text style={[styles.dueHint, { color: theme.textMuted }]}>
                    Due {dueDate.toLocaleDateString()} · {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}

                {/* Priority chips */}
                <Text style={[styles.miniLabel, { color: theme.textMuted, marginTop: 14 }]}>PRIORITY</Text>
                <View style={styles.priorityRow}>
                  {Object.entries(priorityConfig).map(([key, pri]) => {
                    const active = priority === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.priorityChip,
                          {
                            backgroundColor: active ? `${pri.color}30` : theme.inputBg,
                            borderColor: active ? pri.color : 'transparent',
                          },
                        ]}
                        onPress={() => { Haptics.selectionAsync(); setPriority(key); }}
                      >
                        <Ionicons name={pri.icon} size={14} color={pri.color} />
                        <Text style={[styles.priorityText, { color: active ? pri.color : theme.textSecondary }]}>
                          {pri.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Category chips */}
                <Text style={[styles.miniLabel, { color: theme.textMuted, marginTop: 14 }]}>
                  CATEGORY {autoCategory && title ? '· auto' : ''}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.pillRow}>
                    {Object.entries(categoryConfig).map(([key, cat]) => {
                      const active = category === key;
                      return (
                        <TouchableOpacity
                          key={key}
                          style={[
                            styles.pill,
                            {
                              backgroundColor: active ? `${cat.color}30` : theme.inputBg,
                              borderColor: active ? cat.color : 'transparent',
                            },
                          ]}
                          onPress={() => { setAutoCategory(false); setCategory(key); }}
                        >
                          <Text style={styles.pillEmoji}>{cat.emoji}</Text>
                          <Text style={[styles.pillText, { color: active ? cat.color : theme.textMuted }]}>
                            {cat.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                {/* Big create button */}
                <GlassButton
                  title={loading ? 'Creating...' : 'Create Task'}
                  onPress={handleSave}
                  loading={loading}
                  icon="checkmark"
                  fullWidth
                  size="large"
                  style={{ marginTop: 18 }}
                />
              </GlassCard>

              {showDatePicker && (
                <DateTimePicker
                  value={dueDate || new Date()}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onChange={(event, date) => {
                    setShowDatePicker(false);
                    if (date) {
                      setDueDate(date);
                      setQuickDate('custom');
                    } else {
                      setQuickDate(null);
                    }
                  }}
                />
              )}

              {/* ── Advanced (collapsed by default) ── */}
              <TouchableOpacity
                onPress={() => setShowAdvanced(s => !s)}
                style={[styles.advToggle, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}
              >
                <Ionicons
                  name={showAdvanced ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={theme.textSecondary}
                />
                <Text style={[styles.advToggleText, { color: theme.textSecondary }]}>
                  {showAdvanced ? 'Hide advanced' : 'More options'}
                </Text>
              </TouchableOpacity>

              {showAdvanced && (
                <>
                  <GlassCard variant="solid" style={styles.section}>
                    <GlassInput
                      label="Description"
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Add more details..."
                      multiline
                      numberOfLines={3}
                      maxLength={1000}
                    />
                  </GlassCard>

                  <GlassCard variant="solid" style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>REMINDER</Text>
                    <View style={styles.reminderRow}>
                      <View style={styles.reminderInfo}>
                        <Ionicons name="notifications-outline" size={18} color={theme.warning} />
                        <Text style={[styles.reminderLabel, { color: theme.text }]}>
                          Notify before due
                        </Text>
                      </View>
                      <Switch
                        value={reminderEnabled}
                        onValueChange={(v) => {
                          if (v && !dueDate) {
                            Alert.alert('Pick a date first', 'Reminders need a due date.');
                            return;
                          }
                          setReminderEnabled(v);
                        }}
                        trackColor={{ true: theme.primary, false: theme.inputBg }}
                        thumbColor="#FFF"
                      />
                    </View>
                    {reminderEnabled && (
                      <View style={styles.reminderOptions}>
                        {[5, 15, 30, 60].map((mins) => {
                          const active = reminderMinutes === mins;
                          return (
                            <TouchableOpacity
                              key={mins}
                              style={[
                                styles.reminderPill,
                                {
                                  backgroundColor: active ? `${theme.warning}30` : theme.inputBg,
                                  borderColor: active ? theme.warning : 'transparent',
                                },
                              ]}
                              onPress={() => setReminderMinutes(mins)}
                            >
                              <Text style={[styles.reminderPillText, { color: active ? theme.warning : theme.textMuted }]}>
                                {mins < 60 ? `${mins}m` : '1h'} before
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    {/* Smart repeat: nag every N min until done */}
                    {reminderEnabled && (
                      <>
                        <View style={[styles.reminderRow, { marginTop: 14 }]}>
                          <View style={styles.reminderInfo}>
                            <Ionicons name="alarm-outline" size={18} color={theme.danger} />
                            <Text style={[styles.reminderLabel, { color: theme.text }]}>
                              Repeat until done
                            </Text>
                          </View>
                          <Switch
                            value={smartRepeatEnabled}
                            onValueChange={setSmartRepeatEnabled}
                            trackColor={{ true: theme.danger, false: theme.inputBg }}
                            thumbColor="#FFF"
                          />
                        </View>
                        {smartRepeatEnabled && (
                          <>
                            <View style={[styles.reminderOptions, { marginTop: 8 }]}>
                              {[5, 10, 15, 30].map((m) => {
                                const active = smartRepeatMinutes === m;
                                return (
                                  <TouchableOpacity
                                    key={m}
                                    style={[
                                      styles.reminderPill,
                                      {
                                        backgroundColor: active ? `${theme.danger}25` : theme.inputBg,
                                        borderColor: active ? theme.danger : 'transparent',
                                      },
                                    ]}
                                    onPress={() => setSmartRepeatMinutes(m)}
                                  >
                                    <Text style={[styles.reminderPillText, { color: active ? theme.danger : theme.textMuted }]}>
                                      every {m}m
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                            <Text style={[styles.attachHint, { color: theme.textMuted, marginTop: 8, marginBottom: 0 }]}>
                              Up to 6 follow-up notifications. They stop the moment you mark this task complete.
                            </Text>
                          </>
                        )}
                      </>
                    )}
                  </GlassCard>

                  <GlassCard variant="solid" style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>REPEAT</Text>
                    <View style={styles.reminderRow}>
                      <View style={styles.reminderInfo}>
                        <Ionicons name="repeat-outline" size={18} color={theme.primary} />
                        <Text style={[styles.reminderLabel, { color: theme.text }]}>
                          Recurring task
                        </Text>
                      </View>
                      <Switch
                        value={recurringEnabled}
                        onValueChange={setRecurringEnabled}
                        trackColor={{ true: theme.primary, false: theme.inputBg }}
                        thumbColor="#FFF"
                      />
                    </View>
                    {recurringEnabled && (
                      <>
                        <View style={[styles.reminderOptions, { marginTop: 14 }]}>
                          {[
                            { key: 'daily', label: 'Daily' },
                            { key: 'weekly', label: 'Weekly' },
                            { key: 'monthly', label: 'Monthly' },
                            { key: 'custom', label: 'Every N days' },
                          ].map((p) => {
                            const active = recurringPattern === p.key;
                            return (
                              <TouchableOpacity
                                key={p.key}
                                style={[
                                  styles.reminderPill,
                                  {
                                    backgroundColor: active ? `${theme.primary}30` : theme.inputBg,
                                    borderColor: active ? theme.primary : 'transparent',
                                  },
                                ]}
                                onPress={() => {
                                  Haptics.selectionAsync();
                                  setRecurringPattern(p.key);
                                  if (p.key !== 'custom') setRecurringInterval(1);
                                }}
                              >
                                <Text style={[styles.reminderPillText, { color: active ? theme.primary : theme.textMuted }]}>
                                  {p.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                        {(recurringPattern === 'custom' || recurringInterval > 1) && (
                          <View style={[styles.reminderOptions, { marginTop: 10 }]}>
                            {[1, 2, 3, 5, 7, 14, 30].map((n) => {
                              const active = recurringInterval === n;
                              return (
                                <TouchableOpacity
                                  key={n}
                                  style={[
                                    styles.reminderPill,
                                    {
                                      backgroundColor: active ? `${theme.primary}30` : theme.inputBg,
                                      borderColor: active ? theme.primary : 'transparent',
                                    },
                                  ]}
                                  onPress={() => setRecurringInterval(n)}
                                >
                                  <Text style={[styles.reminderPillText, { color: active ? theme.primary : theme.textMuted }]}>
                                    Every {n} day{n === 1 ? '' : 's'}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                        <Text style={[styles.attachHint, { color: theme.textMuted, marginTop: 10, marginBottom: 0 }]}>
                          When you complete this task, the next one will be created automatically.
                        </Text>
                      </>
                    )}
                  </GlassCard>

                  <GlassCard variant="solid" style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>SUBTASKS</Text>
                    {subtasks.map((st, i) => (
                      <View key={i} style={styles.subtaskRow}>
                        <Ionicons name="ellipse-outline" size={14} color={theme.textMuted} />
                        <Text style={[styles.subtaskText, { color: theme.text }]}>{st}</Text>
                        <TouchableOpacity onPress={() => setSubtasks(subtasks.filter((_, idx) => idx !== i))}>
                          <Ionicons name="close" size={18} color={theme.danger} />
                        </TouchableOpacity>
                      </View>
                    ))}
                    <View style={styles.addSubtaskRow}>
                      <View style={{ flex: 1 }}>
                        <GlassInput
                          value={newSubtask}
                          onChangeText={setNewSubtask}
                          placeholder="Add subtask..."
                          style={{ marginBottom: 0 }}
                        />
                      </View>
                      <GlassButton
                        title="Add"
                        onPress={addSubtask}
                        variant="glass"
                        size="small"
                        style={{ marginBottom: 16, marginLeft: 8 }}
                      />
                    </View>
                  </GlassCard>

                  <GlassCard variant="solid" style={styles.section}>
                    <View style={styles.attachHead}>
                      <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginBottom: 0 }]}>
                        ATTACHMENTS
                      </Text>
                      <Text style={[styles.attachCount, { color: theme.textMuted }]}>
                        {attachments.length} / {MAX_ATTACHMENTS}
                      </Text>
                    </View>
                    <Text style={[styles.attachHint, { color: theme.textMuted }]}>
                      Images up to {MAX_IMAGE_MB} MB · Files up to {MAX_FILE_MB} MB
                    </Text>

                    {/* Pickers */}
                    <View style={styles.attachActions}>
                      <TouchableOpacity
                        style={[styles.attachBtn, { backgroundColor: `${theme.primary}20`, borderColor: theme.primary }]}
                        onPress={pickImages}
                        disabled={uploading || attachments.length >= MAX_ATTACHMENTS}
                      >
                        <Ionicons name="image-outline" size={18} color={theme.primary} />
                        <Text style={[styles.attachBtnText, { color: theme.primary }]}>Photos</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.attachBtn, { backgroundColor: `${theme.secondary}20`, borderColor: theme.secondary }]}
                        onPress={takePhoto}
                        disabled={uploading || attachments.length >= MAX_ATTACHMENTS}
                      >
                        <Ionicons name="camera-outline" size={18} color={theme.secondary} />
                        <Text style={[styles.attachBtnText, { color: theme.secondary }]}>Camera</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.attachBtn, { backgroundColor: `${theme.accent || theme.primary}20`, borderColor: theme.accent || theme.primary }]}
                        onPress={pickFiles}
                        disabled={uploading || attachments.length >= MAX_ATTACHMENTS}
                      >
                        <Ionicons name="document-attach-outline" size={18} color={theme.accent || theme.primary} />
                        <Text style={[styles.attachBtnText, { color: theme.accent || theme.primary }]}>Files</Text>
                      </TouchableOpacity>
                    </View>

                    {uploading && (
                      <View style={styles.uploadingRow}>
                        <ActivityIndicator size="small" color={theme.primary} />
                        <Text style={[styles.uploadingText, { color: theme.textSecondary }]}>
                          Uploading...
                        </Text>
                      </View>
                    )}

                    {/* Preview list */}
                    {attachments.length > 0 && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ marginTop: 14 }}
                        contentContainerStyle={{ gap: 10, paddingRight: 10 }}
                      >
                        {attachments.map((a) => (
                          <View
                            key={a.path}
                            style={[styles.attachChip, { backgroundColor: theme.inputBg, borderColor: theme.glassBorder }]}
                          >
                            {a.kind === 'image' ? (
                              <Image source={{ uri: a.url }} style={styles.attachThumb} />
                            ) : (
                              <View style={[styles.attachFileIcon, { backgroundColor: `${theme.primary}25` }]}>
                                <Ionicons
                                  name={fileIconFor(a.mimeType, a.name)}
                                  size={26}
                                  color={theme.primary}
                                />
                              </View>
                            )}
                            <Text
                              style={[styles.attachName, { color: theme.text }]}
                              numberOfLines={1}
                            >
                              {a.name}
                            </Text>
                            <Text style={[styles.attachSize, { color: theme.textMuted }]}>
                              {formatSize(a.size)}
                            </Text>
                            <TouchableOpacity
                              onPress={() => removeAttachment(a)}
                              style={[styles.attachRemove, { backgroundColor: theme.danger }]}
                            >
                              <Ionicons name="close" size={12} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </ScrollView>
                    )}
                  </GlassCard>

                  <GlassCard variant="solid" style={styles.section}>
                    <GlassInput
                      label="Tags (comma separated)"
                      value={tags}
                      onChangeText={setTags}
                      placeholder="work, important, meeting"
                      icon="pricetag-outline"
                    />
                  </GlassCard>
                </>
              )}
          </>

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <IconSelector visible={showIconPicker} onClose={() => setShowIconPicker(false)} onSelect={(e) => { setEmoji(e); setAutoEmoji(false); }} />
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 58, paddingBottom: 10,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSave: { paddingHorizontal: 12, paddingVertical: 8 },
  headerSaveText: { fontSize: 15, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  hero: { marginBottom: 14, padding: 18 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  emojiBubble: {
    width: 56, height: 56, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  emojiText: { fontSize: 28 },
  titleInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    paddingVertical: 10,
  },
  miniLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  quickChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1,
  },
  quickEmoji: { fontSize: 14 },
  quickText: { fontSize: 12, fontWeight: '700' },
  dueHint: { fontSize: 11, marginTop: 8 },
  priorityRow: { flexDirection: 'row', gap: 6 },
  priorityChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 9, borderRadius: 12, borderWidth: 1,
  },
  priorityText: { fontSize: 12, fontWeight: '700' },
  pillRow: { flexDirection: 'row', gap: 6 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: 999, borderWidth: 1,
  },
  pillEmoji: { fontSize: 14 },
  pillText: { fontSize: 12, fontWeight: '600' },
  advToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 14, borderWidth: 1,
    marginBottom: 14,
  },
  advToggleText: { fontSize: 13, fontWeight: '700' },
  section: { marginBottom: 14 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  reminderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  reminderInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reminderLabel: { fontSize: 14, fontWeight: '600' },
  reminderOptions: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  reminderPill: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1,
  },
  reminderPillText: { fontSize: 12, fontWeight: '700' },
  subtaskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  subtaskText: { flex: 1, fontSize: 13 },
  addSubtaskRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 },

  // Attachments
  attachHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 6,
  },
  attachCount: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  attachHint: { fontSize: 11, marginBottom: 12, lineHeight: 15 },
  attachActions: { flexDirection: 'row', gap: 8 },
  attachBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, paddingHorizontal: 8,
    borderRadius: 12, borderWidth: 1,
  },
  attachBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  uploadingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 12, justifyContent: 'center',
  },
  uploadingText: { fontSize: 12, fontWeight: '600' },
  attachChip: {
    width: 110, padding: 8, borderRadius: 14, borderWidth: 1,
    alignItems: 'center',
  },
  attachThumb: {
    width: 94, height: 80, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  attachFileIcon: {
    width: 94, height: 80, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  attachName: {
    fontSize: 11, fontWeight: '700', marginTop: 6,
    width: '100%', textAlign: 'center',
  },
  attachSize: { fontSize: 10, fontWeight: '600', marginTop: 1 },
  attachRemove: {
    position: 'absolute', top: -4, right: -4,
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
});
