import * as React from 'react';
import { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, SectionList, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { CaretLeft, MagnifyingGlass, X, ClockCounterClockwise } from 'phosphor-react-native';
import { Image } from 'expo-image';
import { Typography } from '../../components/design-system/Typography';
import { COLORS, SPACING, RADIUS, Theme } from '../../lib/theme';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '../../hooks/useDebounce';
import * as Haptics from 'expo-haptics';

interface SiftItem {
    id: string;
    title: string;
    url: string;
    tags?: string[];
    created_at: string;
    metadata?: {
        image_url?: string;
        category?: string;
    };
}

// Helper to extract domain
const getDomain = (url: string): string => {
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch {
        return url;
    }
};

// Helper to format date for section headers
const getDateSection = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const dayMs = 24 * 60 * 60 * 1000;

    if (diff < dayMs && date.getDate() === now.getDate()) {
        return 'Today';
    }
    if (diff < 7 * dayMs) {
        return 'This Week';
    }
    if (diff < 30 * dayMs) {
        return 'This Month';
    }
    return 'Older';
};

// Group items by date section
const groupByDate = (items: SiftItem[]): { title: string; data: SiftItem[] }[] => {
    const groups: Record<string, SiftItem[]> = {};
    const order = ['Today', 'This Week', 'This Month', 'Older'];

    items.forEach(item => {
        const section = getDateSection(item.created_at);
        if (!groups[section]) groups[section] = [];
        groups[section].push(item);
    });

    return order
        .filter(key => groups[key]?.length > 0)
        .map(key => ({ title: key, data: groups[key] }));
};

export default function HistoryScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);

    // Fetch all sifts
    const { data: allPages = [], isLoading } = useQuery({
        queryKey: ['history-pages', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const { data, error } = await supabase
                .from('pages')
                .select('id, title, url, tags, created_at, metadata')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return (data || []) as SiftItem[];
        },
        enabled: !!user?.id,
    });

    // Filter by search
    const filteredPages = useMemo(() => {
        if (!debouncedSearch.trim()) return allPages;

        const q = debouncedSearch.toLowerCase();
        return allPages.filter(page =>
            page.title?.toLowerCase().includes(q) ||
            page.url?.toLowerCase().includes(q) ||
            page.tags?.some(tag => tag.toLowerCase().includes(q)) ||
            page.metadata?.category?.toLowerCase().includes(q)
        );
    }, [allPages, debouncedSearch]);

    // Group by date
    const sections = useMemo(() => groupByDate(filteredPages), [filteredPages]);

    const handlePress = useCallback((item: SiftItem) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/page/${item.id}`);
    }, [router]);

    const renderItem = ({ item }: { item: SiftItem }) => (
        <Pressable
            onPress={() => handlePress(item)}
            style={({ pressed }) => [styles.row, { backgroundColor: colors.paper, borderColor: colors.separator }, pressed && { opacity: 0.7 }]}
        >
            {/* Thumbnail */}
            <View style={[styles.thumbnail, { backgroundColor: colors.subtle }]}>
                {item.metadata?.image_url ? (
                    <Image
                        source={{ uri: item.metadata.image_url }}
                        style={styles.thumbnailImage}
                        contentFit="cover"
                        transition={200}
                    />
                ) : (
                    <Typography variant="h2" style={{ color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }}>
                        {(item.title || 'S').charAt(0).toUpperCase()}
                    </Typography>
                )}
            </View>

            {/* Content */}
            <View style={styles.content}>
                <Typography variant="body" numberOfLines={1} style={[styles.title, { color: colors.ink }]}>
                    {item.title || 'Untitled'}
                </Typography>
                <Typography variant="caption" numberOfLines={1} style={{ color: colors.stone }}>
                    {getDomain(item.url)} {item.metadata?.category ? `· ${item.metadata.category.toUpperCase()}` : ''}
                </Typography>
            </View>
        </Pressable>
    );

    const renderSectionHeader = ({ section }: { section: { title: string } }) => (
        <View style={[styles.sectionHeader, { backgroundColor: colors.canvas }]}>
            <Typography variant="label" color="stone" style={styles.sectionTitle}>
                {section.title.toUpperCase()}
            </Typography>
        </View>
    );

    return (
        <ScreenWrapper edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <CaretLeft size={28} color={colors.ink} />
                </TouchableOpacity>
                <Typography variant="h3">History</Typography>
                <View style={{ width: 28 }} />
            </View>

            {/* Search Bar */}
            <View style={[styles.searchContainer, { backgroundColor: colors.paper, borderColor: colors.separator }]}>
                <MagnifyingGlass size={18} color={colors.stone} />
                <TextInput
                    style={[styles.searchInput, { color: colors.ink }]}
                    placeholder="Search by title, URL, or tag..."
                    placeholderTextColor={colors.stone}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                        <X size={16} color={colors.stone} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Results */}
            <SectionList
                sections={sections}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                contentContainerStyle={styles.listContent}
                stickySectionHeadersEnabled={true}
                ListEmptyComponent={() => (
                    <View style={styles.emptyState}>
                        <ClockCounterClockwise size={48} color={COLORS.stone} weight="thin" />
                        <Typography variant="body" color="stone" style={{ marginTop: SPACING.m }}>
                            {isLoading ? 'Loading...' : (searchQuery ? 'No results found.' : 'No sifts yet.')}
                        </Typography>
                    </View>
                )}
            />
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    backButton: {
        padding: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        paddingHorizontal: 16,
        height: 48,
        borderRadius: RADIUS.m,
        borderWidth: StyleSheet.hairlineWidth,
        marginBottom: SPACING.m,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
    },
    clearButton: {
        padding: 4,
    },
    listContent: {
        paddingBottom: 100,
    },
    sectionHeader: {
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    sectionTitle: {
        letterSpacing: 1,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginBottom: 8,
        padding: 12,
        borderRadius: RADIUS.m,
        borderWidth: StyleSheet.hairlineWidth,
    },
    thumbnail: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.s,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
    },
    content: {
        flex: 1,
        marginLeft: 12,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    emptyState: {
        marginTop: 100,
        alignItems: 'center',
    },
});
