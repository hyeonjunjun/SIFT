import { supabase } from './supabase';
import { API_URL } from './config';

type PushType = 'sift_shared' | 'friend_request' | 'friend_accepted' | 'collection_invite' | 'collection_sift_added' | 'sift_complete';

const TYPE_TO_PREF: Record<PushType, string> = {
    sift_shared: 'sift_shared',
    friend_request: 'friend_requests',
    friend_accepted: 'friend_requests',
    collection_invite: 'collection_activity',
    collection_sift_added: 'collection_activity',
    sift_complete: 'sift_complete',
};

interface PushParams {
    receiverId: string;
    actorName: string;
    type: PushType;
    siftTitle?: string;
    siftId?: string;
    messageContent?: string;
    collectionName?: string;
}

/**
 * Send a push notification, checking the receiver's preferences first.
 * Non-blocking — failures are silently ignored.
 */
export async function sendPush(params: PushParams) {
    try {
        // Check receiver's notification preferences
        const { data: profile } = await supabase
            .from('profiles')
            .select('notification_preferences')
            .eq('id', params.receiverId)
            .single();

        const prefs = profile?.notification_preferences;
        const prefKey = TYPE_TO_PREF[params.type];

        // If user has explicitly disabled this notification type, skip
        if (prefs && prefKey && prefs[prefKey] === false) {
            return;
        }

        // Fire non-blocking
        fetch(`${API_URL}/api/push`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        }).catch(() => {});
    } catch {
        // Non-blocking
    }
}
