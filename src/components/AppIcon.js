import React from 'react';
import { Ionicons } from '@expo/vector-icons';

export const EMOJI_ICON_MAP = {
  '📝': 'document-text-outline',
  '✅': 'checkmark-circle-outline',
  '📋': 'clipboard-outline',
  '🎯': 'radio-button-on-outline',
  '⚡': 'flash-outline',
  '🔥': 'flame-outline',
  '💡': 'bulb-outline',
  '📌': 'pin-outline',
  '📍': 'location-outline',
  '🚀': 'rocket-outline',
  '💼': 'briefcase-outline',
  '📊': 'stats-chart-outline',
  '📈': 'trending-up-outline',
  '💻': 'laptop-outline',
  '🖥️': 'desktop-outline',
  '📱': 'phone-portrait-outline',
  '🔧': 'construct-outline',
  '⚙️': 'settings-outline',
  '🏢': 'business-outline',
  '📑': 'reader-outline',
  '💪': 'fitness-outline',
  '🏋️': 'barbell-outline',
  '🧘': 'body-outline',
  '🏃': 'walk-outline',
  '🍎': 'nutrition-outline',
  '💊': 'medical-outline',
  '🏥': 'medkit-outline',
  '❤️': 'heart-outline',
  '🌿': 'leaf-outline',
  '🥗': 'restaurant-outline',
  '📚': 'library-outline',
  '📖': 'book-outline',
  '✏️': 'pencil-outline',
  '🎓': 'school-outline',
  '🔬': 'flask-outline',
  '🧪': 'beaker-outline',
  '📐': 'triangle-outline',
  '🗒️': 'newspaper-outline',
  '💭': 'chatbubble-ellipses-outline',
  '💰': 'cash-outline',
  '💳': 'card-outline',
  '📉': 'trending-down-outline',
  '🏦': 'business-outline',
  '💵': 'wallet-outline',
  '🪙': 'ellipse-outline',
  '💹': 'analytics-outline',
  '🏪': 'storefront-outline',
  '🛒': 'cart-outline',
  '👥': 'people-outline',
  '🤝': 'hand-left-outline',
  '💬': 'chatbubble-outline',
  '🥳': 'sparkles-outline',
  '🎉': 'sparkles-outline',
  '🎁': 'gift-outline',
  '👋': 'hand-right-outline',
  '🫂': 'people-circle-outline',
  '🌍': 'earth-outline',
  '✈️': 'airplane-outline',
  '🗺️': 'map-outline',
  '🏖️': 'sunny-outline',
  '🏔️': 'trail-sign-outline',
  '🚗': 'car-outline',
  '🚢': 'boat-outline',
  '🏕️': 'bonfire-outline',
  '🗼': 'navigate-outline',
  '🧳': 'bag-handle-outline',
  '🏠': 'home-outline',
  '🛁': 'water-outline',
  '🛋️': 'albums-outline',
  '🧹': 'brush-outline',
  '🍳': 'egg-outline',
  '🐾': 'paw-outline',
  '🔑': 'key-outline',
  '🛏️': 'bed-outline',
  '👤': 'person-outline',
  '🚨': 'alert-circle-outline',
  '🤩': 'star-outline',
  '😊': 'happy-outline',
  '😐': 'remove-circle-outline',
  '😢': 'sad-outline',
  '😡': 'flame-outline',
  '😰': 'pulse-outline',
  '🙏': 'heart-circle-outline',
  '😴': 'moon-outline',
  '🥰': 'heart-outline',
};

export function iconNameFor(value, fallback = 'ellipse-outline') {
  if (!value) return fallback;
  return EMOJI_ICON_MAP[value] || value;
}

export default function AppIcon({ name, fallback, size = 20, color, style }) {
  return (
    <Ionicons
      name={iconNameFor(name, fallback)}
      size={size}
      color={color}
      style={style}
    />
  );
}
