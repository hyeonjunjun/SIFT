import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Ensure we actually have an event and app_user_id (which maps to the Supabase UI user id)
        if (!body.event || !body.event.app_user_id) {
            return NextResponse.json({ status: 'ignored' }, { status: 200 });
        }

        const userId = body.event.app_user_id;
        const type = body.event.type;

        console.log(`[RC Webhook] Received ${type} for user: ${userId}`);

        let newTier = 'free';

        // Evaluate the event type to determine database action
        // Handle purchases, renewals, and simple checks
        if (
            type === 'INITIAL_PURCHASE' ||
            type === 'RENEWAL' ||
            type === 'UNCANCELLATION' ||
            type === 'NON_RENEWING_PURCHASE'
        ) {
            const productId = body.event.product_id;

            if (productId.includes('unlimited')) {
                newTier = 'unlimited';
            } else if (productId.includes('plus') || productId.includes('pro')) {
                newTier = 'plus';
            }
        } else if (type === 'CANCELLATION' || type === 'EXPIRATION') {
            // Wait for RevenueCat limits to fully expire.
            // On standard cancellation, they keep access until the end of the period.
            // When it physically EXPIRES, we reset to free.
            if (type === 'EXPIRATION') {
                newTier = 'free';
            } else {
                return NextResponse.json({ status: 'ignored - tracking cancellation only' }, { status: 200 });
            }
        } else {
            // Ignore other events like test events, billing issues, etc.
            return NextResponse.json({ status: 'ignored - unhandled type' }, { status: 200 });
        }

        // Update the Supabase Database Profile to the newly calculated tier
        const { error } = await supabaseAdmin
            .from('profiles')
            .update({ tier: newTier })
            .eq('id', userId);

        if (error) {
            console.error('[RC Webhook] Subabase Update Failed', error);
            // We tell RC it was a success so it doesn't retry infinitely on a bad DB config
            return NextResponse.json({ status: 'error', message: 'DB update failed' }, { status: 200 });
        }

        console.log(`[RC Webhook] Successfully updated ${userId} to ${newTier}`);
        return NextResponse.json({ status: 'success' }, { status: 200 });

    } catch (error: any) {
        console.error('[RC Webhook] Critical Error', error);
        return NextResponse.json({ status: 'error' }, { status: 500 });
    }
}
