import React, { useState } from 'react';
import {
  StyleSheet, View, Text, Modal, TouchableOpacity, ScrollView, Image, ImageBackground, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { themes } from '../themes';

const MODE_TABS = [
  { key: 'all', label: 'All', icon: 'apps' },
  { key: 'dark', label: 'Dark', icon: 'moon' },
  { key: 'light', label: 'Light', icon: 'sunny' },
];

export default function ThemeSelector({ visible, onClose, onSelect, currentTheme }) {
  const { theme, customBackground, setCustomBackground, clearCustomBackground } = useTheme();
  const { canUseTheme, showPaywall } = useSubscription();
  const [mode, setMode] = useState('all');

  // Missing `mode` field = dark (back-compat for all original themes).
  const getMode = (t) => t.mode || 'dark';

  const classicKeys = ['aurora', 'sunset', 'ocean', 'forest', 'lavender', 'midnight', 'rose', 'cosmic'];
  const relaxKeys = ['zen', 'rainyDay', 'sakura', 'northern', 'warmCandle', 'deepSea', 'dreamyPastel', 'starryNight'];
  const sceneKeys = [
    'sunriseScene', 'galaxyScene', 'twilightScene', 'emeraldScene', 'coralScene',
    'cherryBloomScene', 'tropicalBeachScene', 'lavenderFieldsScene',
    'mistyMountainScene', 'velvetNightScene',
  ];
  const imageKeys = [
    'mountainGlass', 'cityGlass', 'lakeSunriseGlass', 'rainGardenGlass',
    'auroraOceanGlass', 'desertMoonGlass', 'forestGlass', 'spaceGlass', 'desertGlass',
  ];
  const lightKeys = Object.keys(themes).filter((k) => getMode(themes[k]) === 'light');

  const filterByMode = (keys) => {
    if (mode === 'all') return keys;
    return keys.filter((k) => themes[k] && getMode(themes[k]) === mode);
  };

  const handleSelect = (key) => {
    if (!canUseTheme(key)) {
      onClose();
      showPaywall('theme', `The ${themes[key].name} theme is Pro-only.`);
      return;
    }
    onSelect(key);
    onClose();
  };

  const handlePickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Enable photo access in Settings to use a custom background.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
        exif: false,
      });
      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri;
      if (!uri) return;
      await Haptics.selectionAsync();
      await setCustomBackground({ uri });
      onClose();
    } catch (e) {
      Alert.alert('Could not set photo', e?.message || 'Try picking a different image.');
    }
  };

  const handleClearPhoto = async () => {
    await Haptics.selectionAsync();
    clearCustomBackground();
  };

  const renderGrid = (keys) => {
    const filtered = keys.filter((k) => themes[k]);
    if (filtered.length === 0) return null;
    return (
      <View style={styles.grid}>
        {filtered.map((key) => {
          const t = themes[key];
          const locked = !canUseTheme(key);
          const active = currentTheme === key;
          const isLight = getMode(t) === 'light';
          const previewContent = (
            <>
              {!t.backgroundImage && <Text style={styles.themeEmoji}>{t.emoji}</Text>}
              <View style={styles.themeColorRow}>
                <View style={[styles.colorDot, { backgroundColor: t.primary }]} />
                <View style={[styles.colorDot, { backgroundColor: t.secondary }]} />
                <View style={[styles.colorDot, { backgroundColor: t.accent }]} />
              </View>

              <View style={styles.topBadges}>
                <View style={[styles.modeBadge, { backgroundColor: isLight ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.45)' }]}>
                  <Ionicons
                    name={isLight ? 'sunny' : 'moon'}
                    size={10}
                    color={isLight ? '#0F172A' : '#fff'}
                  />
                </View>
              </View>

              {locked && (
                <View style={styles.lockOverlay}>
                  <View style={styles.lockBadge}>
                    <Ionicons name="lock-closed" size={12} color="#fff" />
                    <Text style={styles.lockText}>PRO</Text>
                  </View>
                </View>
              )}
            </>
          );
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.themeCard,
                active && { borderColor: t.primary, borderWidth: 2 },
              ]}
              onPress={() => handleSelect(key)}
              activeOpacity={0.8}
            >
              {t.backgroundImage ? (
                <ImageBackground source={t.backgroundImage} resizeMode="cover" style={styles.themePreview}>
                  <View
                    pointerEvents="none"
                    style={[StyleSheet.absoluteFill, { backgroundColor: t.overlay || 'rgba(0,0,0,0.32)' }]}
                  />
                  {previewContent}
                </ImageBackground>
              ) : (
                <LinearGradient colors={t.colors} style={styles.themePreview}>
                  {previewContent}
                </LinearGradient>
              )}
              <View style={[styles.themeInfo, { backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.3)' }]}>
                <Text style={[styles.themeName, { color: theme.text }]} numberOfLines={1}>{t.name}</Text>
                {active ? (
                  <Text style={[styles.activeLabel, { color: t.primary }]}>Active</Text>
                ) : locked ? (
                  <Text style={[styles.activeLabel, { color: theme.textMuted }]}>Locked</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderCustomPhotoSection = () => (
    <View style={styles.grid}>
      <TouchableOpacity
        style={[
          styles.themeCard,
          customBackground?.uri && { borderColor: theme.primary, borderWidth: 2 },
        ]}
        activeOpacity={0.85}
        onPress={handlePickPhoto}
      >
        {customBackground?.uri ? (
          <View style={styles.photoPreviewWrap}>
            <Image source={{ uri: customBackground.uri }} style={styles.photoPreview} />
            <View style={styles.photoOverlay}>
              <Ionicons name="image" size={20} color="#fff" />
              <Text style={styles.photoOverlayText}>Tap to change</Text>
            </View>
          </View>
        ) : (
          <LinearGradient
            colors={[`${theme.primary}55`, `${theme.secondary}33`, 'transparent']}
            style={[styles.themePreview, { justifyContent: 'center' }]}
          >
            <Ionicons name="image-outline" size={32} color={theme.text} />
            <Text style={[styles.photoAddText, { color: theme.text }]}>Pick photo</Text>
          </LinearGradient>
        )}
        <View style={[styles.themeInfo, { backgroundColor: theme.mode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.3)' }]}>
          <Text style={[styles.themeName, { color: theme.text }]}>Your Photo</Text>
          {customBackground?.uri ? (
            <Text style={[styles.activeLabel, { color: theme.primary }]}>Active</Text>
          ) : (
            <Text style={[styles.activeLabel, { color: theme.textMuted }]}>Tap to set</Text>
          )}
        </View>
      </TouchableOpacity>

      {customBackground?.uri && (
        <TouchableOpacity
          style={[styles.themeCard, { borderColor: theme.glassBorder, borderWidth: 1 }]}
          activeOpacity={0.85}
          onPress={handleClearPhoto}
        >
          <View style={[styles.themePreview, { backgroundColor: theme.inputBg, justifyContent: 'center' }]}>
            <Ionicons name="close-circle-outline" size={32} color={theme.danger} />
            <Text style={[styles.photoAddText, { color: theme.danger, marginTop: 4 }]}>Remove</Text>
          </View>
          <View style={[styles.themeInfo, { backgroundColor: theme.mode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.3)' }]}>
            <Text style={[styles.themeName, { color: theme.text }]}>Clear photo</Text>
            <Text style={[styles.activeLabel, { color: theme.textMuted }]}>Use gradient</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );

  // The Choose-Theme list scrolls inside an opaque sheet pinned to the
  // bottom; the backdrop above it dims the page behind so the user is
  // not distracted by Settings rows showing through.
  const isLightMode = theme.mode === 'light';
  const sheetBg = isLightMode ? '#FFFFFF' : (theme.background || '#0F172A');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <BlurView
            intensity={70}
            tint={isLightMode ? 'light' : 'dark'}
            style={StyleSheet.absoluteFill}
          />
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
          />
        </TouchableOpacity>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: sheetBg,
              borderTopColor: theme.glassBorder,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: isLightMode ? 'rgba(15,23,42,0.2)' : 'rgba(255,255,255,0.25)' }]} />
          <Text style={[styles.title, { color: theme.text }]}>Choose Theme</Text>

        {/* Mode tabs */}
        <View style={[styles.tabs, { backgroundColor: theme.inputBg, borderColor: theme.glassBorder }]}>
          {MODE_TABS.map((m) => {
            const active = mode === m.key;
            return (
              <TouchableOpacity
                key={m.key}
                onPress={() => setMode(m.key)}
                style={[styles.tab, active && { backgroundColor: theme.primary }]}
              >
                <Ionicons
                  name={m.icon}
                  size={14}
                  color={active ? '#fff' : theme.textSecondary}
                />
                <Text style={[styles.tabText, { color: active ? '#fff' : theme.textSecondary }]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={[styles.categoryLabel, { color: theme.textSecondary }]}>📷 YOUR PHOTO</Text>
          {renderCustomPhotoSection()}

          {mode !== 'light' && (
            <>
              <Text style={[styles.categoryLabel, { color: theme.textSecondary, marginTop: 16 }]}>🌄 SCENES</Text>
              {renderGrid(filterByMode(sceneKeys))}
              <Text style={[styles.categoryLabel, { color: theme.textSecondary, marginTop: 16 }]}>✨ CLASSIC</Text>
              {renderGrid(filterByMode(classicKeys))}
              <Text style={[styles.categoryLabel, { color: theme.textSecondary, marginTop: 16 }]}>🧘 MIND RELAXING</Text>
              {renderGrid(filterByMode(relaxKeys))}
              <Text style={[styles.categoryLabel, { color: theme.textSecondary, marginTop: 16 }]}>🖼️ IMAGE BACKGROUNDS</Text>
              {renderGrid(filterByMode(imageKeys))}
            </>
          )}
          {mode !== 'dark' && lightKeys.length > 0 && (
            <>
              <Text style={[styles.categoryLabel, { color: theme.textSecondary, marginTop: 16 }]}>
                ☀️ LIGHT
              </Text>
              {renderGrid(lightKeys)}
            </>
          )}
          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Close button - aligned with modal design */}
        <TouchableOpacity
          onPress={onClose}
          style={[
            styles.cancelBtn,
            { backgroundColor: theme.inputBg, borderColor: theme.glassBorder },
          ]}
          activeOpacity={0.75}
        >
          <Ionicons name="close" size={18} color={theme.textSecondary} />
          <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Close</Text>
        </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '84%',
    // ensure the sheet always paints above the dim layer
    zIndex: 2,
    elevation: 12,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 14, textAlign: 'center' },
  tabs: {
    flexDirection: 'row', padding: 4, borderRadius: 999,
    borderWidth: 1, alignSelf: 'center', marginBottom: 16, gap: 2,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999,
  },
  tabText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  categoryLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 4 },
  themeCard: {
    width: '46%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  themePreview: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    overflow: 'hidden',
  },
  themeEmoji: { fontSize: 28, marginBottom: 6 },
  themeColorRow: { flexDirection: 'row', gap: 4 },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  themeInfo: { paddingVertical: 8, paddingHorizontal: 10 },
  themeName: { fontSize: 13, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  activeLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  topBadges: { position: 'absolute', top: 6, right: 6 },
  modeBadge: {
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999,
  },
  lockText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  photoPreviewWrap: { height: 80, width: '100%' },
  photoPreview: { height: 80, width: '100%' },
  photoOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingVertical: 6, paddingHorizontal: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  photoOverlayText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  photoAddText: { fontSize: 12, fontWeight: '700', marginTop: 6 },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700' },
});
