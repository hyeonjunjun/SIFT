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
        notificationListenerRef.current = Notifications.addNotificationReceivedListener(notification => {
            console.log('[Push] Received:', notification.request.content.title);
        });

        // Listen for notification taps
        responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;
            console.log('[Push] Tapped:', data);

            if (data?.siftId) {
                // Use setTimeout to ensure the app is ready for navigation
                setTimeout(() => {
                    import('expo-router').then(({ router }) => {
                        router.push(`/page/${data.siftId}?contextType=feed`);
                    });
                }, 100);
            }
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
        console.log('[Push] Must use physical device for Push Notifications');
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
            console.log('[Push] Permission not granted');
            return null;
        }

        // Get the Expo push token
        const tokenData = await Notifications.getExpoPushTokenAsync();
        console.log('[Push] Token:', tokenData.data);

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
