import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

// Configure notification handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export function usePushNotifications() {
    const { user } = useAuth();
    const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
    const notificationListenerRef = useRef<Notifications.EventSubscription | null>(null);
    const responseListenerRef = useRef<Notifications.EventSubscription | null>(null);

    useEffect(() => {
        if (!user?.id) return;

        registerForPushNotifications().then(token => {
            if (token) {
                setExpoPushToken(token);
                // Save token to Supabase profile
                supabase.from('profiles').update({
                    push_token: token,
                    push_token_updated_at: new Date().toISOString(),
                }).eq('id', user.id).then();
            }
        });

        // Listen for incoming notifications while app is foregrounded
        notificationListenerRef.current = Notifications.addNotificationReceivedListener(() => {});

        // Listen for notification taps
        responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;

            setTimeout(() => {
                import('expo-router').then(({ router }) => {
                    if (data?.siftId) {
                        router.push(`/page/${data.siftId}?contextType=feed`);
                    } else if (data?.type === 'friend_request' || data?.type === 'friend_accepted') {
                        router.push('/(tabs)/social');
                    } else if (data?.type === 'collection_invite' || data?.type === 'collection_sift_added') {
                        router.push('/(tabs)/notifications');
                    } else {
                        router.push('/(tabs)/notifications');
                    }
                });
            }, 100);
        });

        return () => {
            notificationListenerRef.current?.remove();
            responseListenerRef.current?.remove();
        };
    }, [user?.id]);

    return { expoPushToken };
}

async function registerForPushNotifications(): Promise<string | null> {
    if (Platform.OS === 'web') return null;
    if (!Device.isDevice) {
        return null;
    }

    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            return null;
        }

        // Get the Expo push token
        const tokenData = await Notifications.getExpoPushTokenAsync();

        // Configure Android notification channel
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'Default',
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#C47F65',
            });
        }

        return tokenData.data;
    } catch (error) {
        console.error('[Push] Registration error:', error);
        return null;
    }
}
