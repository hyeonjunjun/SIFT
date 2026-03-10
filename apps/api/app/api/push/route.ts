import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendPushNotification } from '@/lib/notifications';

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const { receiverId, actorName, type, siftTitle, messageContent, siftId } = body;

        if (!receiverId || !actorName || !type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        let title = '';
        let notificationBody = '';
        const data: Record<string, string> = {};

        if (siftId) {
            data.siftId = siftId;
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
