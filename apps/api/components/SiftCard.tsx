import Link from 'next/link';

interface SiftCardProps {
    id: string;
    title: string;
    summary: string;
    url: string;
    imageUrl?: string;
    tags?: string[];
    createdAt: string;
}

export default function SiftCard({ id, title, summary, url, imageUrl, tags, createdAt }: SiftCardProps) {
    let domain = 'Unknown Source';
    try {
        if (url) domain = new URL(url).hostname.replace('www.', '');
    } catch (e) {
        // leave as Unknown Source if invalid URL
    }

    return (
        <Link href={`/sift/${id}`} className="block group h-full">
            <div className="bg-paper border border-separator rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-medium hover:-translate-y-1 h-full flex flex-col">
                {imageUrl ? (
                    <div className="h-48 w-full relative bg-subtle shrink-0">
                        {/* Using standard img tag to avoid next/image domain configuration issues for arbitrary URLs */}
                        <img src={imageUrl} alt={title || 'Sift Cover'} className="object-cover w-full h-full" />
                    </div>
                ) : (
                    <div className="h-48 w-full bg-subtle flex items-center justify-center border-b border-separator/50 shrink-0">
                        <span className="text-stone font-serif text-lg italic">No Image</span>
                    </div>
                )}

                <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-stone uppercase tracking-wider">
                            {tags && tags.length > 0 ? tags[0] : 'Uncategorized'} • {domain}
                        </span>
                    </div>
                    <h3 className="font-serif text-xl font-bold text-ink leading-tight mb-2 line-clamp-2 group-hover:text-accent transition-colors">
                        {title || 'Untitled'}
                    </h3>
                    <p className="text-sm text-stone line-clamp-3">
                        {summary || 'No summary available.'}
                    </p>
                </div>
            </div>
        </Link>
    );
}
