
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const user_id = searchParams.get('user_id');

        if (!user_id) {
            return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('pages')
            .select('*')
            .eq('user_id', user_id)
            .eq('is_archived', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const { id, action, user_id } = await request.json();

        if (!id || !action || !user_id) {
            return NextResponse.json({ error: 'Missing id, action, or user_id' }, { status: 400 });
        }

        const is_archived = action === 'archive';

        const { data, error } = await supabaseAdmin
            .from('pages')
            .update({ is_archived })
            .eq('id', id)
            .eq('user_id', user_id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const user_id = searchParams.get('user_id');

        if (!id || !user_id) {
            return NextResponse.json({ error: 'Missing id or user_id' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('pages')
            .delete()
            .eq('id', id)
            .eq('user_id', user_id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
