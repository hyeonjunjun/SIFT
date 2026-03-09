import { supabaseAdmin } from './supabase';

/**
 * Sends a push notification to a user via Expo Push API
 * @param userId - The Supabase user ID
 * @param title - Notification title
 * @param body - Notification body
 * @param data - Optional data payload for deep-linking
 */
export async function sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data: Record<string, any> = {}
) {
    try {
        // 1. Get user's push token from Supabase
        const { data: profile, error } = await supabaseAdmin
            .from('profiles')
            .select('push_token')
            .eq('id', userId)
            .single();

        if (error || !profile?.push_token) {
            console.log(`[Push] No token found for user ${userId}`);
            return null;
        }

        const pushToken = profile.push_token;

        // 2. Prepare the notification payload
        const message = {
            to: pushToken,
            sound: 'default',
            title,
            body,
            data,
        };

        // 3. Send to Expo Push API
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });

        const resData = await response.json();

        if (!response.ok) {
            console.error(`[Push] Expo API Error:`, resData);
            return null;
        }

        console.log(`[Push] Sent successfully to ${userId}: ${title}`);
        return resData;

    } catch (error) {
        console.error(`[Push] Unexpected error:`, error);
        return null;
    }
}
