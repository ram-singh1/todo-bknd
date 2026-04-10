import * as Speech from 'expo-speech';

export const VOICE_LANGUAGES = [
  { key: 'en', label: 'English', flag: '🇬🇧' },
  { key: 'hi', label: 'Hindi', flag: '🇮🇳' },
];

export const VOICE_SPEEDS = [
  { key: 'slow', label: 'Slow', rate: 0.6 },
  { key: 'normal', label: 'Normal', rate: 0.85 },
  { key: 'fast', label: 'Fast', rate: 1.15 },
];

export const speak = (text, options = {}) => {
  const lang = options.language || 'en';
  const rate = options.rate || 0.85;

  Speech.speak(text, {
    language: lang === 'hi' ? 'hi-IN' : 'en-US',
    pitch: options.pitch || 1.05,
    rate,
    onDone: options.onDone,
    onStopped: options.onStopped,
    onError: options.onError,
    ...options,
  });
};

export const stopSpeaking = () => {
  Speech.stop();
};

export const isSpeakingNow = async () => {
  return await Speech.isSpeakingAsync();
};

export const getAvailableVoices = async () => {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    return voices;
  } catch {
    return [];
  }
};
