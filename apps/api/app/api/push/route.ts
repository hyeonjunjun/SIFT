import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendPushNotification } from '@/lib/notifications';

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const { receiverId, actorName, type, siftTitle, messageContent, siftId, collectionName, collectionId } = body;

        if (!receiverId || !type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check user's notification preferences
        const prefMap: Record<string, string> = {
            sift_shared: 'sift_shared',
            friend_request: 'friend_requests',
            friend_accepted: 'friend_requests',
            collection_invite: 'collection_activity',
            collection_sift_added: 'collection_activity',
            sift_complete: 'sift_complete',
        };

        const prefKey = prefMap[type];
        if (prefKey) {
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('notification_preferences')
                .eq('id', receiverId)
                .single();

            if (profile?.notification_preferences?.[prefKey] === false) {
                return NextResponse.json({ success: false, reason: 'User disabled this notification type' }, { status: 200 });
            }
        }

        let title = '';
        let notificationBody = '';
        const data: Record<string, string> = {};

        if (siftId) {
            data.siftId = siftId;
        }
        if (collectionId) {
            data.collectionId = collectionId;
        }

        switch (type) {
            case 'sift_shared':
            case 'direct_message_sift':
                title = siftTitle ? `${actorName} sent you a Sift` : `${actorName} shared something`;
                notificationBody = siftTitle || 'Tap to view';
                break;
            case 'direct_message_text':
                title = `${actorName} sent a message`;
                notificationBody = messageContent || 'Tap to reply';
                break;
            case 'friend_request':
                title = `${actorName} sent you a friend request`;
                notificationBody = 'Tap to respond';
                break;
            case 'friend_accepted':
                title = `${actorName} accepted your friend request`;
                notificationBody = 'You are now connected';
                break;
            case 'collection_invite':
                title = `${actorName} added you to a collection`;
                notificationBody = collectionName || 'Tap to view';
                break;
            case 'collection_sift_added':
                title = `${actorName} added a sift to ${collectionName || 'a collection'}`;
                notificationBody = siftTitle || 'Tap to view';
                break;
            case 'sift_complete':
                title = 'Your sift is ready';
                notificationBody = siftTitle || 'Tap to read';
                break;
            default:
                title = `New activity from ${actorName}`;
                notificationBody = 'Tap to open Sift';
        }

        const result = await sendPushNotification(receiverId, title, notificationBody, data);

        if (!result) {
            console.warn(`[Push] Failed to send notification to ${receiverId}`);
            // Return 200 anyway so the client interaction doesn't fail just because of a push error
            return NextResponse.json({ success: false, reason: 'Failed to send via Expo API' }, { status: 200 });
        }

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error: any) {
        console.error('[Push API] Error processing push request:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
