import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  collection,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { updateProfile } from './auth';

export interface AppNotification {
  id: string;
  userId: string;
  titre: string;
  message: string;
  data?: Record<string, string>;
  lue: boolean;
  createdAt: Timestamp;
}

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Registers the device for push notifications and saves the token to the user's Firestore document.
 */
export async function registerForPushNotifications(
  userId: string
): Promise<string | null> {
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  // Set up Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('coliway_default', {
      name: 'Coliway',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1B3A5C',
    });
  }

  const tokenData = await Notifications.getDevicePushTokenAsync();
  const token = tokenData.data as string;

  // Save the FCM token to the user's Firestore document
  await updateProfile(userId, { fcmToken: token });

  return token;
}

/**
 * Listens for push token changes and updates Firestore.
 * Returns an event subscription that should be removed on cleanup.
 */
export function listenForTokenRefresh(
  userId: string
): Notifications.EventSubscription {
  return Notifications.addPushTokenListener(async (token) => {
    try {
      await updateProfile(userId, { fcmToken: token.data as string });
    } catch (error) {
      console.error('Failed to update FCM token:', error);
    }
  });
}

/**
 * Sends a local notification immediately.
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<string> {
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: true,
    },
    trigger: null, // Show immediately
  });

  return notificationId;
}

/**
 * Subscribes to real-time updates for a user's notifications from Firestore.
 * Returns an unsubscribe function.
 */
export function getNotifications(
  userId: string,
  callback: (notifications: AppNotification[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const notifications: AppNotification[] = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as AppNotification[];
    callback(notifications);
  });
}

/**
 * Marks a notification as read in Firestore.
 */
export async function markAsRead(notificationId: string): Promise<void> {
  const notifRef = doc(db, 'notifications', notificationId);
  await updateDoc(notifRef, {
    lue: true,
    lueAt: serverTimestamp(),
  });
}

/**
 * Returns the count of unread notifications for a user.
 */
export function subscribeToUnreadCount(
  userId: string,
  callback: (count: number) => void
): Unsubscribe {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    where('lue', '==', false)
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.size);
  });
}
