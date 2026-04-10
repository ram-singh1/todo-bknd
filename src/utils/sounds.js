import * as Haptics from 'expo-haptics';

export const lightImpact = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

export const mediumImpact = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
};

export const heavyImpact = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
};

export const successNotification = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};

export const errorNotification = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
};

export const selectionFeedback = () => {
  Haptics.selectionAsync().catch(() => {});
};
