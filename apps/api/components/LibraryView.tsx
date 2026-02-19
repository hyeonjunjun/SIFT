'use client';

import { useState } from 'react';
import SiftCard from './SiftCard';
import { SquaresFour, List as ListIcon, MagnifyingGlass } from '@phosphor-icons/react';

interface Sift {
    id: string;
    title: string;
    summary: string;
    url: string;
    metadata?: { ogImage?: string };
    cover_image?: string;
    tags?: string[];
    created_at: string;
}

export default function LibraryView({ initialSifts }: { initialSifts: Sift[] }) {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [search, setSearch] = useState('');

    const filtered = initialSifts.filter(s =>
        s.title?.toLowerCase().includes(search.toLowerCase()) ||
        s.summary?.toLowerCase().includes(search.toLowerCase()) ||
        s.url?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 pb-12 h-screen flex flex-col">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div>
                    <h1 className="text-4xl font-serif font-bold text-ink">Your Library</h1>
                    <p className="text-stone mt-2 text-lg">Curate and organize your total collection.</p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* Search Bar */}
                    <div className="relative flex-1 sm:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MagnifyingGlass size={18} className="text-stone" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by title, url..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="block w-full rounded-xl border border-separator bg-paper py-2 pl-10 pr-3 text-sm text-ink placeholder-stone focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                        />
                    </div>

                    {/* Toggle */}
                    <div className="flex items-center bg-paper border border-separator rounded-xl p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-subtle text-ink shadow-sm' : 'text-stone hover:text-ink'}`}
                        >
                            <SquaresFour size={20} weight={viewMode === 'grid' ? 'fill' : 'regular'} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-subtle text-ink shadow-sm' : 'text-stone hover:text-ink'}`}
                        >
                            <ListIcon size={20} weight={viewMode === 'list' ? 'fill' : 'regular'} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto min-h-0">
                {filtered.length === 0 ? (
                    <div className="bg-paper border border-separator rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px]">
                        <h2 className="text-xl font-medium text-ink mb-2">No sifts found</h2>
                        <p className="text-stone text-center max-w-md">
                            {search ? 'Try adjusting your search query.' : 'Your library is empty.'}
                        </p>
                    </div>
                ) : (
                    <div className={
                        viewMode === 'grid'
                            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8"
                            : "flex flex-col gap-4 pb-8"
                    }>
                        {filtered.map((sift) => (
                            viewMode === 'grid' ? (
                                <SiftCard
                                    key={sift.id}
                                    id={sift.id}
                                    title={sift.title}
                                    summary={sift.summary}
                                    url={sift.url}
                                    imageUrl={sift.metadata?.ogImage || sift.cover_image}
                                    tags={sift.tags}
                                    createdAt={sift.created_at}
                                />
                            ) : (
                                <div key={sift.id} className="bg-paper border border-separator rounded-xl p-4 flex items-center gap-4 hover:shadow-medium transition-shadow">
                                    {/* Minimal List View Row */}
                                    {sift.metadata?.ogImage || sift.cover_image ? (
                                        <div className="h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-subtle">
                                            <img src={sift.metadata?.ogImage || sift.cover_image} alt="" className="object-cover w-full h-full" />
                                        </div>
                                    ) : (
                                        <div className="h-16 w-16 shrink-0 rounded-lg bg-subtle flex items-center justify-center border border-separator/50">
                                            <span className="text-xs font-serif italic text-stone">Img</span>
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-ink font-bold truncate text-lg font-serif">{sift.title || 'Untitled'}</h4>
                                        <p className="text-sm text-stone truncate">{sift.summary || sift.url}</p>
                                    </div>
                                </div>
                            )
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
