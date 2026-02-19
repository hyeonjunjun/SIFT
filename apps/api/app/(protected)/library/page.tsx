import { createClient } from '@/utils/supabase/server';
import LibraryView from '@/components/LibraryView';
import { redirect } from 'next/navigation';

export default async function LibraryPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: sifts, error } = await supabase
        .from('pages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Library fetch error:', error);
    }

    return <LibraryView initialSifts={sifts || []} />;
}
