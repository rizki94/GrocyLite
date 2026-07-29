import { useEffect } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import {
  getMessaging,
  getToken,
  onTokenRefresh,
  onMessage,
  onNotificationOpenedApp,
  getInitialNotification,
  setBackgroundMessageHandler,
  requestPermission,
  AuthorizationStatus,
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import { registerFcmToken } from '../services/chat-api';
import { navigate } from '../lib/navigation';

/**
 * Request notification permission from the OS.
 */
async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    if (Platform.Version >= 33) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Notification Permission',
          message:
            'GrocyLite needs notification access to alert you about new chat messages.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  }

  // iOS
  const messaging = getMessaging();
  const authStatus = await requestPermission(messaging);
  return (
    authStatus === AuthorizationStatus.AUTHORIZED ||
    authStatus === AuthorizationStatus.PROVISIONAL
  );
}

/**
 * Get the FCM token and register it with our backend.
 */
async function registerToken() {
  try {
    const messaging = getMessaging();
    const token = await getToken(messaging);
    if (token) {
      await registerFcmToken(token);
    }
  } catch (_) {
    // Silently fail — user may have denied permission
  }
}

/**
 * Extract conversation ID from FCM payload data and navigate to chat.
 */
function handleNotificationTap(
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
) {
  const conversationId = remoteMessage?.data?.conversationId;
  const title =
    remoteMessage?.notification?.title ||
    remoteMessage?.data?.senderName ||
    'Chat';

  if (conversationId) {
    navigate('ChatDetailScreen', { conversationId, title });
  }
}

/**
 * Main FCM hook — call once at app root after user is authenticated.
 */
export function useFcm(isAuthenticated: boolean) {
  useEffect(() => {
    if (!isAuthenticated) return;

    let unsubscribeForeground: (() => void) | undefined;
    let unsubscribeTokenRefresh: (() => void) | undefined;

    async function setup() {
      const granted = await requestNotificationPermission();
      if (!granted) return;

      await registerToken();

      const messaging = getMessaging();

      // Re-register whenever token rotates
      unsubscribeTokenRefresh = onTokenRefresh(messaging, async newToken => {
        try {
          await registerFcmToken(newToken);
        } catch (_) {}
      });

      // Foreground messages
      unsubscribeForeground = onMessage(messaging, async _msg => {});

      // App in BACKGROUND and user tapped notification
      onNotificationOpenedApp(messaging, remoteMessage => {
        handleNotificationTap(remoteMessage);
      });

      // App KILLED and user tapped notification
      const initialMessage = await getInitialNotification(messaging);
      if (initialMessage) {
        setTimeout(() => handleNotificationTap(initialMessage), 500);
      }
    }

    setup();

    return () => {
      unsubscribeForeground?.();
      unsubscribeTokenRefresh?.();
    };
  }, [isAuthenticated]);
}

/**
 * Background / killed-state FCM handler.
 * MUST be called at module level in index.js.
 */
export function setupBackgroundFcmHandler() {
  const messaging = getMessaging();
  setBackgroundMessageHandler(messaging, async _remoteMessage => {
    // OS automatically handles displaying standard notifications
  });
}
