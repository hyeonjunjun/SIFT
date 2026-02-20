import { createClient } from '@/utils/supabase/server';
import SiftCard from './SiftCard';

export default async function RecentSifts() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: sifts, error } = await supabase
        .from('pages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6);

    if (error) {
        console.error('Error fetching recent sifts:', error);
        return <p className="text-danger p-4 bg-danger/10 rounded-xl">Failed to load recent sifts.</p>;
    }

    if (!sifts || sifts.length === 0) {
        return (
            <div className="bg-paper border border-separator rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px]">
                <h2 className="text-xl font-medium text-ink mb-2">No recent sifts</h2>
                <p className="text-stone text-center max-w-md">
                    Your dashboard is empty. Use the mobile app or browser extension to start curating content.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sifts.map((sift) => (
                <SiftCard
                    key={sift.id}
                    id={sift.id}
                    title={sift.title}
                    summary={sift.summary}
                    url={sift.url}
                    imageUrl={sift.metadata?.image_url || sift.cover_image} // Fallback to cover_image if image_url isn't in metadata
                    tags={sift.tags}
                    createdAt={sift.created_at}
                />
            ))}
        </div>
    );
}
