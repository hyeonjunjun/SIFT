import { useState, useMemo, useEffect, useCallback } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useDebounce } from './useDebounce';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Page {
    id: string;
    title: string;
    summary: string;
    tags: string[];
    created_at: string;
    url: string;
    is_pinned?: boolean;
    metadata?: {
        image_url?: string;
        status?: string;
        source?: string;
        smart_data?: {
            cuisine?: string;
            difficulty?: string;
            dietary_tags?: string[];
            cook_time?: string;
            preparation_time?: string;
            total_time?: string;
            servings?: number;
        };
    };
}

const PAGE_SIZE = 20;

export function usePages() {
    const { user, tier } = useAuth();
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const [activeFilter, setActiveFilter] = useState("All");
    const [activeSmartFilter, setActiveSmartFilter] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'date' | 'title' | 'domain'>('date');

    // Load sort preference
    useEffect(() => {
        AsyncStorage.getItem('dashboard_sort').then(saved => {
            if (saved === 'date' || saved === 'title' || saved === 'domain') setSortBy(saved);
        });
    }, []);

    const updateSortBy = useCallback((newSort: 'date' | 'title' | 'domain') => {
        setSortBy(newSort);
        AsyncStorage.setItem('dashboard_sort', newSort);
    }, []);

    const {
        data,
        isLoading,
        refetch,
        isFetchingNextPage,
        fetchNextPage,
        hasNextPage
    } = useInfiniteQuery({
        queryKey: ['pages', user?.id, tier],
        queryFn: async ({ pageParam = 0 }) => {
            if (!user) return [];

            const from = (pageParam as number) * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;

            const { data, error } = await supabase
                .from('pages')
                .select('id, title, summary, tags, created_at, url, is_pinned, metadata')
                .eq('user_id', user.id)
                .or('is_archived.is.null,is_archived.eq.false')
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;
            return (data || []) as Page[];
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            return lastPage.length === PAGE_SIZE ? allPages.length : undefined;
        },
        enabled: !!user,
        staleTime: 1000 * 30, // 30s — shorter to catch realtime gaps
        refetchOnWindowFocus: true,
    });

    const pages = useMemo(() => {
        return data?.pages.flat() || [];
    }, [data]);

    // Server-side search results
    const { data: searchResults, isLoading: isSearching } = useQuery({
        queryKey: ['search', user?.id, debouncedSearchQuery],
        queryFn: async () => {
            if (!user?.id || !debouncedSearchQuery.trim()) return null;
            const q = debouncedSearchQuery.trim();

            const { data, error } = await supabase
                .from('pages')
                .select('*')
                .eq('user_id', user.id)
                .or('is_archived.is.null,is_archived.eq.false')
                .or(`title.ilike.%${q}%,summary.ilike.%${q}%`)
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(30);

            if (error) throw error;
            return data || [];
        },
        enabled: !!user?.id && !!debouncedSearchQuery.trim(),
    });

    const filteredPages = useMemo(() => {
        let results = (debouncedSearchQuery.trim() && searchResults) ? searchResults : pages;

        if (activeFilter !== 'All') {
            results = results.filter(p => p.tags?.some((t: string) => t && t.toLowerCase() === activeFilter.toLowerCase()));
        }

        if (activeSmartFilter) {
            const sf = activeSmartFilter.toLowerCase();
            results = results.filter(p => {
                const sd = p.metadata?.smart_data;
                if (!sd) return false;
                if (sd.cuisine?.toLowerCase() === sf) return true;
                if (sd.difficulty?.toLowerCase() === sf) return true;
                if (sd.dietary_tags?.some(dt => dt.toLowerCase() === sf)) return true;
                return false;
            });
        }

        return [...results].sort((a, b) => {
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;

            if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
            if (sortBy === 'domain') {
                const domA = (() => { try { return a.url ? new URL(a.url).hostname : ''; } catch { return ''; } })();
                const domB = (() => { try { return b.url ? new URL(b.url).hostname : ''; } catch { return ''; } })();
                return domA.localeCompare(domB);
            }
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    }, [pages, debouncedSearchQuery, activeFilter, activeSmartFilter, searchResults, sortBy]);

    const dynamicTags = useMemo(() => {
        const tagCounts: Record<string, number> = {};
        for (const p of pages) {
            for (const t of (p.tags || [])) {
                if (t) tagCounts[t] = (tagCounts[t] || 0) + 1;
            }
        }
        return Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([tag]) => tag);
    }, [pages]);

    // Smart filters extracted from smart_data
    const smartFilters = useMemo(() => {
        const cuisineCounts: Record<string, number> = {};
        const difficultyCounts: Record<string, number> = {};
        const dietaryCounts: Record<string, number> = {};

        for (const p of pages) {
            const sd = p.metadata?.smart_data;
            if (!sd) continue;
            if (sd.cuisine) cuisineCounts[sd.cuisine] = (cuisineCounts[sd.cuisine] || 0) + 1;
            if (sd.difficulty) difficultyCounts[sd.difficulty] = (difficultyCounts[sd.difficulty] || 0) + 1;
            for (const dt of (sd.dietary_tags || [])) {
                if (dt) dietaryCounts[dt] = (dietaryCounts[dt] || 0) + 1;
            }
        }

        const topCuisines = Object.entries(cuisineCounts)
            .sort((a, b) => b[1] - a[1]).slice(0, 6).map(([c]) => c);
        const difficulties = Object.entries(difficultyCounts)
            .sort((a, b) => b[1] - a[1]).map(([d]) => d);
        const topDietary = Object.entries(dietaryCounts)
            .sort((a, b) => b[1] - a[1]).slice(0, 8).map(([d]) => d);

        return { cuisines: topCuisines, difficulties, dietary: topDietary };
    }, [pages]);

    return {
        pages,
        filteredPages,
        dynamicTags,
        smartFilters,
        isLoading: isLoading || (!!debouncedSearchQuery && isSearching),
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
        refetch,
        searchQuery,
        setSearchQuery,
        activeFilter,
        setActiveFilter,
        activeSmartFilter,
        setActiveSmartFilter,
        sortBy,
        updateSortBy
    };
}
