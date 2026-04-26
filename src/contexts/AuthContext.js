import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import api from '../api/client';

// Web-compatible storage: uses localStorage on web, SecureStore on native
const Storage = {
  getItemAsync: async (key) => {
    if (Platform.OS === 'web') {
      try { return localStorage.getItem(key); } catch { return null; }
    }
    return SecureStore.getItemAsync(key);
  },
  setItemAsync: async (key, value) => {
    if (Platform.OS === 'web') {
      try { localStorage.setItem(key, value); } catch {}
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
  deleteItemAsync: async (key) => {
    if (Platform.OS === 'web') {
      try { localStorage.removeItem(key); } catch {}
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const savedToken = await Storage.getItemAsync('auth_token');
      const savedUser = await Storage.getItemAsync('auth_user');
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data;
    await Storage.setItemAsync('auth_token', newToken);
    await Storage.setItemAsync('auth_user', JSON.stringify(newUser));
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(newUser);
    return newUser;
  };

  const signup = async (name, email, password, referralCode) => {
    const res = await api.post('/auth/signup', { name, email, password, referralCode });
    const { token: newToken, user: newUser } = res.data;
    await Storage.setItemAsync('auth_token', newToken);
    await Storage.setItemAsync('auth_user', JSON.stringify(newUser));
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(newUser);
    return newUser;
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      const fresh = res.data.user;
      await Storage.setItemAsync('auth_user', JSON.stringify(fresh));
      setUser(fresh);
      return fresh;
    } catch {
      return null;
    }
  };

  const logout = async () => {
    await Storage.deleteItemAsync('auth_token');
    await Storage.deleteItemAsync('auth_user');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  const updateUser = async (data) => {
    const res = await api.put('/auth/profile', data);
    const updatedUser = res.data.user;
    await Storage.setItemAsync('auth_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    return updatedUser;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
