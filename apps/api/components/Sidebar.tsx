'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, Books, Users, Gear, Moon, Sun, Plus, X } from '@phosphor-icons/react';
import { useTheme } from 'next-themes';
import { useEffect, useState, useRef } from 'react';

const NAV_ITEMS = [
    { name: 'Home', href: '/', icon: House },
    { name: 'Library', href: '/library', icon: Books },
    { name: 'Social', href: '/social', icon: Users },
    { name: 'Settings', href: '/settings', icon: Gear },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { theme, setTheme, systemTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Close modal on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                setIsModalOpen(false);
            }
        }
        if (isModalOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isModalOpen]);

    const currentTheme = theme === 'system' ? systemTheme : theme;

    const handleAddSift = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!urlInput.trim()) return;

        try {
            setIsSubmitting(true);
            setMessage('Extracting and synthesizing content...');

            // Minimal client check - the API handles user authentication & scraping safely
            const { createClient } = await import('@/utils/supabase/client');
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) throw new Error('Not authenticated');

            const res = await fetch('/api/sift_v2', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: urlInput,
                    user_id: user.id
                })
            });

            const data = await res.json();

            if (data.status === 'success') {
                setMessage('Sift successfully curated!');
                setTimeout(() => {
                    setIsModalOpen(false);
                    setUrlInput('');
                    setMessage('');
                    // Hard refresh to show new data on dashboard
                    window.location.reload();
                }, 1500);
            } else {
                setMessage(`Error: ${data.message || 'Failed to curate'}`);
                setIsSubmitting(false);
            }

        } catch (error) {
            setMessage('An unexpected error occurred.');
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div className="w-64 h-screen bg-canvas border-r border-separator flex flex-col pt-8 pb-6 px-4 shrink-0">
                <div className="flex items-center justify-between px-2 mb-10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-ink rounded-lg flex items-center justify-center">
                            <span className="text-canvas font-serif font-bold text-lg leading-none">S</span>
                        </div>
                        <span className="font-serif text-xl font-bold tracking-tight text-ink">SIFT</span>
                    </div>
                </div>

                {/* Primary Action Button */}
                <div className="mb-6">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="w-full bg-ink text-canvas hover:bg-stone transition-colors font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm"
                    >
                        <Plus size={18} weight="bold" />
                        <span>Add Sift</span>
                    </button>
                </div>

                <nav className="flex-1 space-y-1">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/');
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${isActive
                                    ? 'bg-subtle text-ink font-medium'
                                    : 'text-stone hover:bg-subtle/50 hover:text-ink'
                                    }`}
                            >
                                <Icon size={20} weight={isActive ? 'fill' : 'regular'} />
                                <span className="text-sm">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Theme Toggle Button */}
                <div className="mt-auto pt-4 border-t border-separator">
                    <button
                        onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
                        className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-stone hover:bg-subtle/50 hover:text-ink"
                        aria-label="Toggle Dark Mode"
                    >
                        {mounted ? (
                            currentTheme === 'dark' ? (
                                <Sun size={20} weight="regular" />
                            ) : (
                                <Moon size={20} weight="regular" />
                            )
                        ) : (
                            <div className="w-5 h-5 rounded-full border border-separator" />
                        )}
                        <span className="text-sm">Theme</span>
                    </button>
                </div>
            </div>

            {/* Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        ref={modalRef}
                        className="w-full max-w-md bg-paper border border-separator rounded-3xl p-6 shadow-medium animate-in zoom-in-95 duration-200"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h2 className="text-2xl font-serif font-bold text-ink">Add to Library</h2>
                                <p className="text-stone text-sm mt-1">Paste a URL to extract and synthesize.</p>
                            </div>
                            <button
                                onClick={() => { setIsModalOpen(false); setMessage(''); setUrlInput(''); setIsSubmitting(false); }}
                                className="p-2 text-stone hover:bg-subtle rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAddSift} className="space-y-4">
                            <div>
                                <input
                                    type="url"
                                    placeholder="https://example.com/article"
                                    value={urlInput}
                                    onChange={(e) => setUrlInput(e.target.value)}
                                    disabled={isSubmitting}
                                    required
                                    className="w-full bg-subtle border border-separator rounded-xl px-4 py-3 text-ink placeholder-stone focus:outline-none focus:ring-1 focus:ring-ink focus:border-ink transition-shadow"
                                />
                            </div>

                            {message && (
                                <p className={`text-sm italic ${message.includes('Error') ? 'text-danger' : 'text-stone font-serif'}`}>
                                    {message}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting || !urlInput.trim()}
                                className="w-full bg-ink text-canvas py-3 rounded-xl font-medium transition-colors disabled:opacity-50 hover:bg-ink/90 shadow-sm"
                            >
                                {isSubmitting ? 'Processing...' : 'Sift Content'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
