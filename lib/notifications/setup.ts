import * as Notifications from 'expo-notifications';
import type { NotificationBehavior } from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Set notification handler
Notifications.setNotificationHandler({
  handleNotification: async (): Promise<NotificationBehavior> => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    alert('Must use physical device for Push Notifications');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    alert('Failed to get push token for push notification!');
    return;
  }

  try {
    const token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
      })
    ).data;

    // Store token for later use
    await AsyncStorage.setItem('expoPushToken', token);
    return token;
  } catch (e) {
    console.error('Failed to get push token:', e);
  }
}

export async function scheduleDailyReminder() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Don't forget your chores!",
      body: 'Check the app to see today\'s tasks.',
      sound: 'default',
      badge: 1,
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour: 8,
      minute: 0,
    },
  });
}

export async function sendNotification(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
    },
    trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1 },
  });
}

export async function clearAllNotifications() {
  await Notifications.dismissAllNotificationsAsync();
}
