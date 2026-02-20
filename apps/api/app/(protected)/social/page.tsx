import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function SocialPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    return (
        <div className="space-y-6 pb-12">
            <header>
                <h1 className="text-4xl font-serif font-bold text-ink">Social</h1>
                <p className="text-stone mt-2 text-lg">Connect and share Sifts with friends.</p>
            </header>

            <div className="bg-paper border border-separator rounded-2xl p-8 flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-16 h-16 bg-subtle rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">👥</span>
                </div>
                <h2 className="text-xl font-medium text-ink mb-2">Coming Soon to Web</h2>
                <p className="text-stone text-center max-w-md">
                    Social features are currently optimized for the mobile experience. Web support for friend management and inbox sharing is on the roadmap!
                </p>
            </div>
        </div>
    );
}
