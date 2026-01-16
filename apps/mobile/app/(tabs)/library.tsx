import React, { useCallback, useState } from 'react';
import { View, TextInput, ScrollView, Image, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Typography } from '../../components/design-system/Typography';
import { COLORS, SPACING, Theme, RADIUS } from '../../lib/theme';
import { TEXT } from '../../lib/typography';
import { MagnifyingGlass, Sliders, ArrowUpRight } from 'phosphor-react-native';
import { supabase } from '../../lib/supabase';
import ScreenWrapper from '../../components/ScreenWrapper';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - (SPACING.l * 2) - 15) / 2;

interface SiftItem {
    id: string;
    title: string;
    url: string;
    tags: string[];
    created_at: string;
    metadata?: {
        image_url?: string;
        category?: string;
    };
}

export default function SiftScreen() {
    const [pages, setPages] = useState<SiftItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchPages = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('pages')
                .select('*')
                .eq('is_archived', false)
                .order('created_at', { ascending: false });

            if (data) setPages(data || []);
        } catch (error) {
            console.error('Error fetching sifts:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchPages();
        }, [fetchPages])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchPages();
    };

    const filteredPages = pages.filter(p => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            p.title?.toLowerCase().includes(q) ||
            p.url?.toLowerCase().includes(q) ||
            p.tags?.some(t => t.toLowerCase().includes(q))
        );
    });

    if (loading && !refreshing) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator color={COLORS.sage} />
            </View>
        );
    }

    return (
        <ScreenWrapper edges={['top']}>
            {/* 1. EDITORIAL HEADER */}
            <View style={styles.header}>
                <View>
                    <Typography variant="label" color={COLORS.stone}>Your Collection</Typography>
                    <Typography variant="h1">Library</Typography>
                </View>
                <TouchableOpacity style={styles.filterButton}>
                    <Sliders size={20} color={COLORS.ink} />
                </TouchableOpacity>
            </View>

            {/* 2. SEARCH BAR */}
            <View style={styles.searchContainer}>
                <MagnifyingGlass size={18} color={COLORS.stone} style={styles.searchIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="Search sifts..."
                    placeholderTextColor={COLORS.stone}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                />
            </View>

            {/* 3. MASONRY GRID (29CM Editorial Style) */}
            <ScrollView
                contentContainerStyle={styles.gridContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.ink} />
                }
            >
                <View style={styles.column}>
                    {filteredPages.filter((_, i) => i % 2 === 0).map((item) => (
                        <Card key={item.id} item={item} />
                    ))}
                </View>
                <View style={styles.column}>
                    {filteredPages.filter((_, i) => i % 2 !== 0).map((item) => (
                        <Card key={item.id} item={item} />
                    ))}
                </View>

                {filteredPages.length === 0 && (
                    <View style={styles.emptyState}>
                        <Typography variant="body" color={COLORS.stone}>No sifts yet.</Typography>
                    </View>
                )}
            </ScrollView>
        </ScreenWrapper>
    );
}

const Card = ({ item }: { item: SiftItem }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.9}>
        <Image
            source={{ uri: item.metadata?.image_url || 'https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?q=80&w=400' }}
            style={styles.cardImage}
        />
        <View style={styles.cardInfo}>
            <Typography variant="bodyMedium" numberOfLines={2} style={styles.cardTitle}>{item.title}</Typography>
            <Typography variant="label" style={styles.cardTag} color={COLORS.stone}>
                {item.tags?.[0] || item.metadata?.category || 'Sifted'}
            </Typography>
        </View>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.canvas,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: SPACING.l,
        marginTop: SPACING.m,
        marginBottom: SPACING.l,
    },
    filterButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.paper,
        justifyContent: 'center',
        alignItems: 'center',
        ...Theme.shadows.soft,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: SPACING.l,
        marginBottom: SPACING.xl,
        paddingHorizontal: SPACING.m,
        height: 48,
        backgroundColor: COLORS.vapor,
        borderRadius: RADIUS.m,
    },
    searchIcon: {
        marginRight: 10
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: COLORS.ink,
        fontFamily: 'Inter_400Regular',
    },
    gridContainer: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.l,
        paddingBottom: 160
    },
    column: {
        width: COLUMN_WIDTH,
        gap: 15
    },
    card: {
        borderRadius: RADIUS.l,
        backgroundColor: COLORS.paper,
        overflow: 'hidden',
        marginBottom: 15,
        ...Theme.shadows.soft,
        shadowOpacity: 0.04,
        shadowRadius: 20,
    },
    cardImage: {
        width: '100%',
        height: 180,
        resizeMode: 'cover'
    },
    cardInfo: {
        padding: SPACING.m,
    },
    cardTitle: {
        fontSize: 14,
        lineHeight: 18,
        marginBottom: 6,
    },
    cardTag: {
        fontSize: 9,
        letterSpacing: 1.5,
    },
    emptyState: {
        width: width - (SPACING.l * 2),
        padding: 40,
        alignItems: 'center',
    }
});

