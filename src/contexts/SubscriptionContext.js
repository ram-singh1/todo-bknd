import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';

const SubscriptionContext = createContext(null);

// Default limits mirror the backend middleware/premium.js (source of truth is the server).
const DEFAULT_LIMITS = {
  free: {
    exportsPerMonth: 0,
    maxTodos: 50,
    maxDiaryEntries: 30,
    allowedThemes: ['aurora', 'sunset', 'ocean', 'forest', 'midnight', 'rose'],
    advancedAnalytics: false,
    pdfExport: false,
  },
  trial: { allowedThemes: 'all', advancedAnalytics: true, pdfExport: true },
  pro: { allowedThemes: 'all', advancedAnalytics: true, pdfExport: true },
  ultimate: { allowedThemes: 'all', advancedAnalytics: true, pdfExport: true },
};

export function SubscriptionProvider({ children }) {
  const { user, token } = useAuth();
  const [status, setStatus] = useState(null);
  const [plans, setPlans] = useState([]);
  const [paywall, setPaywall] = useState({ visible: false, feature: null, message: null });
  const [loading, setLoading] = useState(false);

  const refreshStatus = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await api.get('/subscription/status');
      setStatus(res.data);
    } catch (e) {
      // ignore — endpoints may not be reachable
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadPlans = useCallback(async () => {
    try {
      const res = await api.get('/subscription/plans');
      setPlans(res.data.plans || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (token) {
      refreshStatus();
      loadPlans();
    } else {
      setStatus(null);
    }
  }, [token, refreshStatus, loadPlans]);

  const plan = status?.subscription?.plan || user?.subscription?.plan || 'free';
  const isPremium = !!(status?.subscription?.isPremium ?? user?.subscription?.isPremium);
  const isTrialing = plan === 'trial';
  const trialUsed = !!(status?.subscription?.trialUsed ?? user?.subscription?.trialUsed);
  const expiresAt = status?.subscription?.expiresAt || user?.subscription?.expiresAt;
  const limits = status?.limits || DEFAULT_LIMITS[plan] || DEFAULT_LIMITS.free;
  const usage = status?.usage || user?.usage || {};

  const daysUntilExpiry = expiresAt
    ? Math.max(0, Math.ceil((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  const showPaywall = (feature = null, message = null) => {
    setPaywall({ visible: true, feature, message });
  };

  const hidePaywall = () => setPaywall({ visible: false, feature: null, message: null });

  const startTrial = async () => {
    const res = await api.post('/subscription/start-trial');
    await refreshStatus();
    return res.data;
  };

  const subscribe = async (planId, billing = 'monthly', provider = 'manual', externalId) => {
    const res = await api.post('/subscription/subscribe', { plan: planId, billing, provider, externalId });
    await refreshStatus();
    return res.data;
  };

  const cancel = async () => {
    const res = await api.post('/subscription/cancel');
    await refreshStatus();
    return res.data;
  };

  const restore = async () => {
    const res = await api.post('/subscription/restore');
    await refreshStatus();
    return res.data;
  };

  const redeem = async (code) => {
    const res = await api.post('/subscription/redeem', { code });
    await refreshStatus();
    return res.data;
  };

  const canUseTheme = (themeName) => {
    if (isPremium) return true;
    if (limits.allowedThemes === 'all') return true;
    if (Array.isArray(limits.allowedThemes)) return limits.allowedThemes.includes(themeName);
    return false;
  };

  const gate = (feature, callback) => {
    if (isPremium) return callback();
    showPaywall(feature);
    return null;
  };

  return (
    <SubscriptionContext.Provider
      value={{
        plan, isPremium, isTrialing, trialUsed, expiresAt, daysUntilExpiry,
        limits, usage, status, plans, loading, paywall,
        refreshStatus, loadPlans, startTrial, subscribe, cancel, restore, redeem,
        showPaywall, hidePaywall, canUseTheme, gate,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error('useSubscription must be used within SubscriptionProvider');
  return context;
}
