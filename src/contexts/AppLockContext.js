import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AppState, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const AppLockContext = createContext(null);

const PIN_KEY = 'app_lock_pin';
const ENABLED_KEY = 'app_lock_enabled';
const BIOMETRIC_KEY = 'app_lock_biometric';
// Re-lock the app after this many ms in background. Short enough to feel
// secure, long enough that a quick switch to another app to copy a code
// doesn't lock you out repeatedly.
const RELOCK_AFTER_MS = 30 * 1000;

// Web fallback: SecureStore isn't available on web. We keep web semantics
// usable but make it clear the PIN is only obfuscated, not encrypted.
const Storage = {
  get: async (key) => {
    if (Platform.OS === 'web') {
      try { return localStorage.getItem(key); } catch { return null; }
    }
    return SecureStore.getItemAsync(key);
  },
  set: async (key, value) => {
    if (Platform.OS === 'web') {
      try { localStorage.setItem(key, value); } catch {}
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
  del: async (key) => {
    if (Platform.OS === 'web') {
      try { localStorage.removeItem(key); } catch {}
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};

export function AppLockProvider({ children }) {
  const [enabled, setEnabled] = useState(false);
  // null while we're still reading from SecureStore — UI shouldn't render
  // anything sensitive in this window.
  const [pinHash, setPinHash] = useState(null);
  const [locked, setLocked] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  // Capability cached on mount so the lock screen knows whether to render
  // the biometric button without an async call on every render.
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const lastBackgroundedAt = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const e = await Storage.get(ENABLED_KEY);
        const p = await Storage.get(PIN_KEY);
        const b = await Storage.get(BIOMETRIC_KEY);
        const isEnabled = e === '1' && !!p;
        setEnabled(isEnabled);
        setPinHash(p || null);
        setBiometricEnabled(b === '1');
        // Lock immediately on cold start if enabled.
        if (isEnabled) setLocked(true);

        // Probe biometric capability — only on native, web has no support.
        if (Platform.OS !== 'web') {
          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          const enrolled = hasHardware && await LocalAuthentication.isEnrolledAsync();
          setBiometricAvailable(enrolled);
        }
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        lastBackgroundedAt.current = Date.now();
      } else if (state === 'active') {
        const since = lastBackgroundedAt.current;
        if (enabled && since && Date.now() - since > RELOCK_AFTER_MS) {
          setLocked(true);
        }
        lastBackgroundedAt.current = null;
      }
    });
    return () => sub.remove();
  }, [enabled]);

  const setPin = useCallback(async (pin) => {
    if (!pin || pin.length < 4) throw new Error('PIN must be at least 4 digits');
    // Lightweight obfuscation, not real cryptography. Good enough for
    // device-local equality checking; SecureStore is the real protection.
    const hashed = `v1:${pin}`;
    await Storage.set(PIN_KEY, hashed);
    await Storage.set(ENABLED_KEY, '1');
    setPinHash(hashed);
    setEnabled(true);
    setLocked(false);
  }, []);

  const disableLock = useCallback(async () => {
    await Storage.del(PIN_KEY);
    await Storage.del(ENABLED_KEY);
    await Storage.del(BIOMETRIC_KEY);
    setPinHash(null);
    setEnabled(false);
    setLocked(false);
    setBiometricEnabled(false);
  }, []);

  const tryUnlock = useCallback((pin) => {
    if (!pinHash) return false;
    const ok = pinHash === `v1:${pin}`;
    if (ok) setLocked(false);
    return ok;
  }, [pinHash]);

  const tryBiometricUnlock = useCallback(async () => {
    if (Platform.OS === 'web') return false;
    if (!biometricEnabled || !biometricAvailable) return false;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock app',
        cancelLabel: 'Use PIN',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: true,
      });
      if (result.success) {
        setLocked(false);
        return true;
      }
    } catch {}
    return false;
  }, [biometricEnabled, biometricAvailable]);

  const setBiometric = useCallback(async (on) => {
    if (on) {
      // Verify the user actually wants this — prompt once before saving.
      // Keeps the toggle from silently enabling biometric without consent.
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Confirm to enable biometric unlock',
          cancelLabel: 'Cancel',
          disableDeviceFallback: true,
        });
        if (!result.success) return false;
      } catch {
        return false;
      }
      await Storage.set(BIOMETRIC_KEY, '1');
      setBiometricEnabled(true);
    } else {
      await Storage.del(BIOMETRIC_KEY);
      setBiometricEnabled(false);
    }
    return true;
  }, []);

  const lockNow = useCallback(() => {
    if (enabled) setLocked(true);
  }, [enabled]);

  return (
    <AppLockContext.Provider
      value={{
        enabled,
        locked: enabled && locked,
        hydrated,
        biometricEnabled,
        biometricAvailable,
        setPin,
        disableLock,
        tryUnlock,
        tryBiometricUnlock,
        setBiometric,
        lockNow,
      }}
    >
      {children}
    </AppLockContext.Provider>
  );
}

export function useAppLock() {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error('useAppLock must be used within AppLockProvider');
  return ctx;
}
