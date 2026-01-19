
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';


const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: Request) {
    console.log(`[ARCHIVE] GET Request received`);
    try {
        const { searchParams } = new URL(request.url);
        const user_id = searchParams.get('user_id');
        console.log(`[ARCHIVE] Fetching archived for user: ${user_id}`);

        if (!user_id) {
            return NextResponse.json({ error: 'Missing user_id' }, { status: 400, headers: corsHeaders });
        }

        const { data, error } = await supabaseAdmin
            .from('pages')
            .select('*')
            .eq('user_id', user_id)
            .eq('is_archived', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json(data, { headers: corsHeaders });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }
}

export async function PUT(request: Request) {
    console.log(`[ARCHIVE] PUT Request received`);
    try {
        const { id, action, user_id } = await request.json();
        console.log(`[ARCHIVE] ${action} on item: ${id} for user: ${user_id}`);

        if (!id || !action || !user_id) {
            return NextResponse.json({ error: 'Missing id, action, or user_id' }, { status: 400, headers: corsHeaders });
        }

        const is_archived = action === 'archive';

        const { data, error } = await supabaseAdmin
            .from('pages')
            .update({ is_archived })
            .eq('id', id)
            .eq('user_id', user_id)
            .select();

        if (error) throw error;
        if (!data || data.length === 0) {
            return NextResponse.json({ error: 'Item not found or access denied' }, { status: 404, headers: corsHeaders });
        }
        return NextResponse.json(data[0], { headers: corsHeaders });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }
}

export async function DELETE(request: Request) {
    console.log(`[ARCHIVE] DELETE Request received`);
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const user_id = searchParams.get('user_id');
        console.log(`[ARCHIVE] Deleting forever item: ${id} for user: ${user_id}`);

        if (!id || !user_id) {
            return NextResponse.json({ error: 'Missing id or user_id' }, { status: 400, headers: corsHeaders });
        }

        const { error } = await supabaseAdmin
            .from('pages')
            .delete()
            .eq('id', id)
            .eq('user_id', user_id);

        if (error) throw error;
        return NextResponse.json({ success: true }, { headers: corsHeaders });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }
}

