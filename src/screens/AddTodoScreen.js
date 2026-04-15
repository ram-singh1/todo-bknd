import React, { useState } from 'react';
import {
  StyleSheet, View, Text, ScrollView, KeyboardAvoidingView,
  Platform, Alert, TouchableOpacity, Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import GlassCard from '../components/GlassCard';
import GlassInput from '../components/GlassInput';
import GlassButton from '../components/GlassButton';
import EmojiPicker from '../components/EmojiPicker';
import IconSelector from '../components/IconSelector';
import api from '../api/client';
import { categoryConfig, priorityConfig } from '../themes';

export default function AddTodoScreen({ navigation, route }) {
  const { theme } = useTheme();
  const aiMode = route.params?.aiMode || false;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('medium');
  const [emoji, setEmoji] = useState('📝');
  const [dueDate, setDueDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState(15);
  const [tags, setTags] = useState('');
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [aiGoal, setAiGoal] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
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
      };
      if (dueDate) {
        todoData.dueDate = dueDate.toISOString();
      }
      if (reminderEnabled && dueDate) {
        todoData.reminder = {
          enabled: true,
          time: new Date(dueDate.getTime() - reminderMinutes * 60000).toISOString(),
          advanceMinutes: reminderMinutes,
        };
      }

      await api.post('/todos', todoData);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiGoal.trim()) {
      Alert.alert('Error', 'Please describe your goal');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/ai/generate-tasks', { goal: aiGoal.trim(), category });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Tasks Created! 🎉',
        res.data.message || `${res.data.todos?.length || 0} tasks generated`,
        [{ text: 'View Tasks', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to generate tasks');
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
    <LinearGradient colors={theme.colors} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {aiMode ? '🤖 AI Generate Tasks' : '✏️ New Task'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {aiMode ? (
            /* AI Mode */
            <GlassCard variant="solid">
              <Text style={[styles.aiLabel, { color: theme.primary }]}>
                🤖 Describe your goal and AI will create tasks for you
              </Text>
              <GlassInput
                value={aiGoal}
                onChangeText={setAiGoal}
                placeholder="e.g., Plan a birthday party, Study for exams, Launch a product..."
                multiline
                numberOfLines={4}
                maxLength={500}
              />

              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>CATEGORY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.optionRow}>
                  {Object.entries(categoryConfig).map(([key, cat]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.optionPill,
                        {
                          backgroundColor: category === key ? `${cat.color}30` : theme.inputBg,
                          borderColor: category === key ? cat.color : 'transparent',
                        },
                      ]}
                      onPress={() => setCategory(key)}
                    >
                      <Text style={styles.optionEmoji}>{cat.emoji}</Text>
                      <Text style={[styles.optionText, { color: category === key ? cat.color : theme.textMuted }]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <GlassButton
                title="Generate Tasks with AI ✨"
                onPress={handleAiGenerate}
                loading={loading}
                fullWidth
                size="large"
                style={{ marginTop: 20 }}
              />
            </GlassCard>
          ) : (
            /* Manual Mode */
            <>
              {/* Emoji & Title */}
              <GlassCard variant="solid" style={styles.section}>
                <View style={styles.emojiTitleRow}>
                  <TouchableOpacity
                    style={[styles.emojiBtn, { backgroundColor: theme.inputBg, borderColor: theme.glassBorder }]}
                    onPress={() => setShowIconPicker(true)}
                  >
                    <Text style={styles.selectedEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <GlassInput
                      value={title}
                      onChangeText={setTitle}
                      placeholder="What needs to be done?"
                      maxLength={200}
                      style={{ marginBottom: 0 }}
                    />
                  </View>
                </View>

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

              {/* Category */}
              <GlassCard variant="solid" style={styles.section}>
                <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>CATEGORY</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.optionRow}>
                    {Object.entries(categoryConfig).map(([key, cat]) => (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.optionPill,
                          {
                            backgroundColor: category === key ? `${cat.color}30` : theme.inputBg,
                            borderColor: category === key ? cat.color : 'transparent',
                          },
                        ]}
                        onPress={() => setCategory(key)}
                      >
                        <Text style={styles.optionEmoji}>{cat.emoji}</Text>
                        <Text style={[styles.optionText, { color: category === key ? cat.color : theme.textMuted }]}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </GlassCard>

              {/* Priority */}
              <GlassCard variant="solid" style={styles.section}>
                <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>PRIORITY</Text>
                <View style={styles.priorityRow}>
                  {Object.entries(priorityConfig).map(([key, pri]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.priorityBtn,
                        {
                          backgroundColor: priority === key ? `${pri.color}30` : theme.inputBg,
                          borderColor: priority === key ? pri.color : 'transparent',
                          borderWidth: 1,
                        },
                      ]}
                      onPress={() => setPriority(key)}
                    >
                      <Ionicons name={pri.icon} size={16} color={pri.color} />
                      <Text style={[styles.priorityText, { color: priority === key ? pri.color : theme.textMuted }]}>
                        {pri.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </GlassCard>

              {/* Due Date & Reminder */}
              <GlassCard variant="solid" style={styles.section}>
                <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>SCHEDULE</Text>

                <TouchableOpacity
                  style={[styles.dateBtn, { backgroundColor: theme.inputBg, borderColor: theme.glassBorder }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color={theme.primary} />
                  <Text style={[styles.dateBtnText, { color: dueDate ? theme.text : theme.textMuted }]}>
                    {dueDate ? dueDate.toLocaleDateString() : 'Set due date'}
                  </Text>
                  {dueDate && (
                    <TouchableOpacity onPress={() => setDueDate(null)}>
                      <Ionicons name="close-circle" size={20} color={theme.textMuted} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={dueDate || new Date()}
                    mode="date"
                    display="default"
                    minimumDate={new Date()}
                    onChange={(event, date) => {
                      setShowDatePicker(false);
                      if (date) setDueDate(date);
                    }}
                  />
                )}

                {/* Reminder */}
                <View style={styles.reminderRow}>
                  <View style={styles.reminderInfo}>
                    <Ionicons name="notifications-outline" size={20} color={theme.warning} />
                    <Text style={[styles.reminderLabel, { color: theme.text }]}>Reminder</Text>
                  </View>
                  <Switch
                    value={reminderEnabled}
                    onValueChange={setReminderEnabled}
                    trackColor={{ true: theme.primary, false: theme.inputBg }}
                    thumbColor="#FFF"
                  />
                </View>

                {reminderEnabled && (
                  <View style={styles.reminderOptions}>
                    {[5, 15, 30, 60].map((mins) => (
                      <TouchableOpacity
                        key={mins}
                        style={[
                          styles.reminderPill,
                          {
                            backgroundColor: reminderMinutes === mins ? `${theme.warning}30` : theme.inputBg,
                            borderColor: reminderMinutes === mins ? theme.warning : 'transparent',
                          },
                        ]}
                        onPress={() => setReminderMinutes(mins)}
                      >
                        <Text style={[styles.reminderPillText, { color: reminderMinutes === mins ? theme.warning : theme.textMuted }]}>
                          {mins < 60 ? `${mins}m` : '1h'} before
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </GlassCard>

              {/* Subtasks */}
              <GlassCard variant="solid" style={styles.section}>
                <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>SUBTASKS</Text>
                {subtasks.map((st, i) => (
                  <View key={i} style={styles.subtaskRow}>
                    <Ionicons name="ellipse-outline" size={16} color={theme.textMuted} />
                    <Text style={[styles.subtaskText, { color: theme.text }]}>{st}</Text>
                    <TouchableOpacity onPress={() => setSubtasks(subtasks.filter((_, idx) => idx !== i))}>
                      <Ionicons name="close" size={18} color={theme.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
                <View style={styles.addSubtaskRow}>
                  <GlassInput
                    value={newSubtask}
                    onChangeText={setNewSubtask}
                    placeholder="Add subtask..."
                    style={{ flex: 1, marginBottom: 0, marginRight: 8 }}
                  />
                  <GlassButton title="Add" onPress={addSubtask} variant="glass" size="small" />
                </View>
              </GlassCard>

              {/* Tags */}
              <GlassCard variant="solid" style={styles.section}>
                <GlassInput
                  label="Tags"
                  value={tags}
                  onChangeText={setTags}
                  placeholder="work, important, meeting (comma separated)"
                  icon="pricetag-outline"
                />
              </GlassCard>

              {/* Save Button */}
              <GlassButton
                title="Create Task ✨"
                onPress={handleSave}
                loading={loading}
                fullWidth
                size="large"
                style={styles.saveBtn}
              />
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <IconSelector visible={showIconPicker} onClose={() => setShowIconPicker(false)} onSelect={setEmoji} />
      <EmojiPicker visible={showEmojiPicker} onClose={() => setShowEmojiPicker(false)} onSelect={setEmoji} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 58, paddingBottom: 18,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  section: { marginBottom: 18 },
  emojiTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12 },
  emojiBtn: {
    width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  selectedEmoji: { fontSize: 28 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  optionRow: { flexDirection: 'row', gap: 8 },
  optionPill: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1,
  },
  optionEmoji: { fontSize: 16, marginRight: 6 },
  optionText: { fontSize: 13, fontWeight: '600' },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 12, gap: 6,
  },
  priorityText: { fontSize: 12, fontWeight: '600' },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, gap: 10,
    marginBottom: 12,
  },
  dateBtnText: { flex: 1, fontSize: 15 },
  reminderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  reminderInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reminderLabel: { fontSize: 15, fontWeight: '600' },
  reminderOptions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  reminderPill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1,
  },
  reminderPillText: { fontSize: 13, fontWeight: '600' },
  subtaskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  subtaskText: { flex: 1, fontSize: 14 },
  addSubtaskRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  aiLabel: { fontSize: 15, fontWeight: '600', marginBottom: 16, lineHeight: 22 },
  saveBtn: { marginTop: 8 },
});
