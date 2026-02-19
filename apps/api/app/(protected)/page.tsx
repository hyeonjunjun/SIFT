import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import RecentSifts from '@/components/RecentSifts';
import { Suspense } from 'react';

export default async function HomePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    return (
        <div className="space-y-8 pb-12">
            <header>
                <h1 className="text-4xl font-serif font-bold text-ink">Welcome back</h1>
                <p className="text-stone mt-2 text-lg">Here is a quick overview of your digital mind.</p>
            </header>

            <section>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-ink">Recently Saved</h2>
                </div>

                <Suspense fallback={<div className="h-64 flex items-center justify-center text-stone font-serif italic">Loading recent sifts...</div>}>
                    <RecentSifts />
                </Suspense>
            </section>
        </div>
    );
}
