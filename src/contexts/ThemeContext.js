import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes } from '../themes';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [themeName, setThemeName] = useState('aurora');
  const theme = themes[themeName] || themes.aurora;

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const saved = await AsyncStorage.getItem('app_theme');
      if (saved && themes[saved]) {
        setThemeName(saved);
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

  return (
    <ThemeContext.Provider value={{ theme, themeName, changeTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
