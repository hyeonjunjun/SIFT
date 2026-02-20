'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, Books, Users, Gear, Moon, Sun } from '@phosphor-icons/react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

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

    useEffect(() => {
        setMounted(true);
    }, []);

    const currentTheme = theme === 'system' ? systemTheme : theme;

    return (
        <div className="w-64 h-screen bg-canvas border-r border-separator flex flex-col pt-8 pb-6 px-4">
            <div className="flex items-center gap-3 px-2 mb-10">
                <div className="w-8 h-8 bg-ink rounded-lg flex items-center justify-center">
                    <span className="text-canvas font-serif font-bold text-lg leading-none">S</span>
                </div>
                <span className="font-serif text-xl font-bold tracking-tight text-ink">SIFT</span>
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
    );
}
