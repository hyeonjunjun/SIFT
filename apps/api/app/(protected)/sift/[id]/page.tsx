import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import SiftContent from '@/components/SiftContent';
import { ArrowLeft, ShareNetwork } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import Image from 'next/image';

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function SiftPage({ params }: PageProps) {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: sift, error } = await supabase
        .from('pages')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !sift) {
        if (error?.code !== 'PGRST116') console.error('Error fetching sift:', error);
        notFound();
    }

    // Check ownership
    if (sift.user_id !== user.id) {
        notFound(); // Hide existence from unauthorized users
    }

    const imageUrl = sift.metadata?.image_url || sift.cover_image;
    let domain = 'Unknown Source';
    try {
        if (sift.url) domain = new URL(sift.url).hostname.replace('www.', '');
    } catch (e) { }

    return (
        <div className="max-w-3xl mx-auto pb-24 md:pb-12 space-y-8 animate-in fade-in duration-500">
            {/* Top Navigation */}
            <nav className="flex items-center justify-between">
                <Link
                    href="/"
                    className="flex items-center gap-2 text-stone hover:text-ink transition-colors font-medium text-sm"
                >
                    <ArrowLeft size={18} />
                    <span>Back to Library</span>
                </Link>

                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-separator text-stone hover:bg-subtle hover:text-ink transition-colors text-sm">
                        <ShareNetwork size={16} />
                        <span>Share</span>
                    </button>
                </div>
            </nav>

            <article className="bg-paper border border-separator rounded-3xl overflow-hidden shadow-soft">
                {/* Cover Image */}
                {imageUrl && (
                    <div className="w-full h-64 md:h-80 relative bg-subtle border-b border-separator/30">
                        <img
                            src={imageUrl}
                            alt={sift.title || 'Sift Cover'}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                <div className="p-8 md:p-12">
                    {/* Header Metadata */}
                    <div className="flex flex-wrap items-center gap-2 mb-6 text-sm">
                        {sift.tags && sift.tags.length > 0 ? (
                            <span className="bg-subtle px-3 py-1 rounded-full text-ink font-medium tracking-wide uppercase text-xs">
                                {sift.tags[0]}
                            </span>
                        ) : null}
                        <span className="text-stone">•</span>
                        <a
                            href={sift.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-stone hover:text-ink hover:underline truncate max-w-[200px]"
                        >
                            {domain}
                        </a>
                        <span className="text-stone">•</span>
                        <span className="text-stone">
                            {new Date(sift.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                    </div>

                    {/* Title & Summary */}
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-ink leading-tight mb-4">
                        {sift.title || 'Untitled'}
                    </h1>

                    {sift.summary && (
                        <p className="text-lg text-stone leading-relaxed mb-8 border-l-2 border-separator pl-4 italic">
                            {sift.summary}
                        </p>
                    )}

                    <hr className="border-separator my-10" />

                    {/* Markdown Content */}
                    <div className="prose prose-stone max-w-none">
                        <SiftContent content={sift.content || '*No content saved for this Sift.*'} />
                    </div>
                </div>
            </article>
        </div>
    );
}
