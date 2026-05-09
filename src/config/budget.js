// Per-category presentation: emoji, label, color. Keep in sync with the
// backend EXPENSE_CATEGORIES enum in models/Expense.js.
export const EXPENSE_CATEGORIES = [
  { id: 'food',          label: 'Food & Dining', emoji: '🍔', color: '#F97316' },
  { id: 'transport',     label: 'Transport',     emoji: '🚗', color: '#0EA5E9' },
  { id: 'shopping',      label: 'Shopping',      emoji: '🛍️', color: '#EC4899' },
  { id: 'bills',         label: 'Bills',         emoji: '📑', color: '#A78BFA' },
  { id: 'entertainment', label: 'Entertainment', emoji: '🎬', color: '#F59E0B' },
  { id: 'health',        label: 'Health',        emoji: '🩺', color: '#10B981' },
  { id: 'education',     label: 'Education',     emoji: '📚', color: '#06B6D4' },
  { id: 'travel',        label: 'Travel',        emoji: '✈️', color: '#3B82F6' },
  { id: 'rent',          label: 'Rent',          emoji: '🏠', color: '#8B5CF6' },
  { id: 'subscriptions', label: 'Subscriptions', emoji: '🔁', color: '#EF4444' },
  { id: 'savings',       label: 'Savings',       emoji: '🏦', color: '#22C55E' },
  { id: 'gifts',         label: 'Gifts',         emoji: '🎁', color: '#F472B6' },
  { id: 'investment',    label: 'Investment',    emoji: '📈', color: '#14B8A6' },
  { id: 'other',         label: 'Other',         emoji: '🔸', color: '#94A3B8' },
];

export const CATEGORY_BY_ID = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.id, c])
);

// Resolve a category id against built-ins first, then a runtime list of
// user-defined categories. Falls back to a generic placeholder so unknown
// slugs (e.g. legacy data) still render.
export function resolveCategory(id, custom = []) {
  return (
    CATEGORY_BY_ID[id]
    || (custom.find((c) => c.id === id))
    || { id, label: titleCase(id || 'Other'), emoji: '🔸', color: '#94A3B8' }
  );
}

function titleCase(s) {
  return String(s).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export const PAYMENT_METHODS = [
  { id: 'cash',   label: 'Cash',   icon: 'cash-outline' },
  { id: 'card',   label: 'Card',   icon: 'card-outline' },
  { id: 'upi',    label: 'UPI',    icon: 'qr-code-outline' },
  { id: 'bank',   label: 'Bank',   icon: 'business-outline' },
  { id: 'wallet', label: 'Wallet', icon: 'wallet-outline' },
  { id: 'other',  label: 'Other',  icon: 'ellipsis-horizontal-outline' },
];

export const CURRENCY_SYMBOLS = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥', AUD: 'A$', CAD: 'C$',
  CNY: '¥', SGD: 'S$', AED: 'د.إ', BRL: 'R$', RUB: '₽',
};

export function fmtMoney(amount, currency = 'USD') {
  const sym = CURRENCY_SYMBOLS[currency] || '';
  const v = Number(amount || 0);
  // Compact for thousands; full precision otherwise
  if (Math.abs(v) >= 100000) return `${sym}${(v / 1000).toFixed(1)}k`;
  if (Math.abs(v) >= 1000)   return `${sym}${v.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  return `${sym}${v.toFixed(2)}`;
}
