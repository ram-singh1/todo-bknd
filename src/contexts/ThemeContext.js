import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes } from '../themes';

const ThemeContext = createContext();

const CUSTOM_BG_KEY = 'app_custom_background';

// Darken overlay default — keeps text legible over a busy user photo.
const DEFAULT_CUSTOM_OVERLAY = 'rgba(6, 12, 22, 0.44)';
const DEFAULT_CUSTOM_OVERLAY_LIGHT = 'rgba(255, 255, 255, 0.36)';

export function ThemeProvider({ children }) {
  const [themeName, setThemeName] = useState('aurora');
  const [customBackground, setCustomBackgroundState] = useState(null); // { uri, overlay? }

  const baseTheme = themes[themeName] || themes.aurora;

  // When the user has set a custom photo, merge it into whatever palette they
  // picked — so they keep their favourite primary/text colours but the
  // background swaps for their photo. This lets any theme become "image-backed".
  const theme = useMemo(() => {
    if (!customBackground?.uri) return baseTheme;
    const overlay =
      customBackground.overlay ||
      (baseTheme.mode === 'light' ? DEFAULT_CUSTOM_OVERLAY_LIGHT : DEFAULT_CUSTOM_OVERLAY);
    return {
      ...baseTheme,
      backgroundImage: { uri: customBackground.uri },
      overlay,
      // Image backgrounds look best with more translucent cards so the photo shows through.
      glass: baseTheme.glass,
    };
  }, [baseTheme, customBackground]);

  useEffect(() => {
    loadTheme();
    loadCustomBackground();
  }, []);

  const loadTheme = async () => {
    try {
      const saved = await AsyncStorage.getItem('app_theme');
      if (saved && themes[saved]) {
        setThemeName(saved);
      }
    } catch {}
  };

  const loadCustomBackground = async () => {
    try {
      const saved = await AsyncStorage.getItem(CUSTOM_BG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.uri) setCustomBackgroundState(parsed);
      }
    } catch {}
  };

  const changeTheme = async (name) => {
    if (themes[name]) {
      setThemeName(name);
      try {
        await AsyncStorage.setItem('app_theme', name);
      } catch {}
    }
  };

  const setCustomBackground = async (payload) => {
    // payload = { uri, overlay? } | null
    setCustomBackgroundState(payload);
    try {
      if (payload?.uri) {
        await AsyncStorage.setItem(CUSTOM_BG_KEY, JSON.stringify(payload));
      } else {
        await AsyncStorage.removeItem(CUSTOM_BG_KEY);
      }
    } catch {}
  };

  const clearCustomBackground = () => setCustomBackground(null);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeName,
        changeTheme,
        themes,
        customBackground,
        setCustomBackground,
        clearCustomBackground,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
