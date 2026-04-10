import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const requestPermissions = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C63FF',
    });
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

export const scheduleReminder = async (title, body, scheduledTime) => {
  const granted = await requestPermissions();
  if (!granted) return null;

  const trigger = new Date(scheduledTime);
  if (trigger <= new Date()) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger,
  });

  return id;
};

export const cancelNotification = async (id) => {
  if (id) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
};
