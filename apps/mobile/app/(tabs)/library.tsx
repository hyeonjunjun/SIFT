import React, { useCallback, useState, useMemo } from 'react';
import { View, TextInput, ScrollView, Image, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Typography } from '../../components/design-system/Typography';
import { COLORS, SPACING, Theme } from '../../lib/theme';
import { MagnifyingGlass } from 'phosphor-react-native';
import { supabase } from '../../lib/supabase';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useAuth } from '../../lib/auth';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const GRID_PADDING = 20;
const GRID_GAP = 15;
const TILE_WIDTH = (width - (GRID_PADDING * 2) - GRID_GAP) / 2;

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

const CATEGORIES = [
    { name: 'FOOD', icon: 'Cooking' },
    { name: 'SKINCARE', icon: 'Aesthetics' },
    { name: 'AESTHETICS', icon: 'Aesthetics' },
    { name: 'INTEL', icon: 'Intel' },
    { name: 'BAKING', icon: 'Baking' },
    { name: 'HEALTH', icon: 'Health' },
];

export default function LibraryScreen() {
    const { user } = useAuth();
    const [pages, setPages] = useState<SiftItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchPages = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('pages')
                .select('*')
                .eq('user_id', user?.id)
                .eq('is_archived', false)
                .order('created_at', { ascending: false });

            if (data) setPages(data || []);
        } catch (error) {
            console.error('Error fetching sifts:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    useFocusEffect(
        useCallback(() => {
            fetchPages();
        }, [fetchPages])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchPages();
    };

    const categoryData = useMemo(() => {
        return CATEGORIES.map((cat, index) => {
            const catPages = pages.filter(p =>
                p.tags?.some(t => t.toUpperCase() === cat.name) ||
                p.metadata?.category?.toUpperCase() === cat.name
            );

            const isTall = Math.floor(index / 2) % 2 === 0; // Row 0 and Row 2 are tall
            const height = isTall ? 220 : 160;

            return {
                ...cat,
                pages: catPages,
                count: catPages.length,
                height,
                latestImage: catPages[0]?.metadata?.image_url
            };
        });
    }, [pages]);

    const filteredCategories = categoryData.filter(cat => {
        if (!searchQuery.trim()) return true;
        return cat.name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    if (loading && !refreshing) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator color={COLORS.ink} />
            </View>
        );
    }

    return (
        <ScreenWrapper edges={['top']}>
            {/* 1. EDITORIAL HEADER */}
            <View style={styles.header}>
                <Typography variant="label" color={COLORS.stone} style={styles.smallCapsLabel}>YOUR COLLECTION</Typography>
                <Typography variant="h1" style={styles.serifTitle}>Library</Typography>
            </View>

            {/* 2. SEARCH INPUT (PAPER FIELD) */}
            <View style={styles.searchContainer}>
                <MagnifyingGlass size={18} color="#999" weight="regular" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search your mind..."
                    placeholderTextColor="#999"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                />
            </View>

            {/* 3. BENTO GRID */}
            <ScrollView
                contentContainerStyle={styles.gridContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.ink} />
                }
            >
                <View style={styles.bentoWrapper}>
                    {filteredCategories.map((cat) => (
                        <Tile key={cat.name} cat={cat} />
                    ))}

                    {filteredCategories.length === 0 && (
                        <View style={styles.emptyState}>
                            <Typography variant="body" color={COLORS.stone}>No categories match your search.</Typography>
                        </View>
                    )}
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}

interface CategoryData {
    name: string;
    icon: string;
    pages: SiftItem[];
    count: number;
    height: number;
    latestImage?: string;
}

const Tile = ({ cat }: { cat: CategoryData }) => {
    const isAnchor = cat.count > 0; // Use count to determine if we show contents

    if (isAnchor) {
        return (
            <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.tile, styles.anchorTile, { height: cat.height }]}
            >
                {cat.latestImage ? (
                    <Image source={{ uri: cat.latestImage }} style={StyleSheet.absoluteFill} />
                ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#EFEFEF' }]} />
                )}
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.newTag}>
                    <View style={styles.dot} />
                    <Typography variant="label" color="white" style={styles.newTagText}>NEW</Typography>
                </View>
                <View style={styles.tileContent}>
                    <Typography variant="label" color="white" style={styles.anchorLabel}>{cat.name}</Typography>
                    <Typography variant="caption" color="rgba(255,255,255,0.7)" style={styles.issueCount}>{cat.count} ISSUES</Typography>
                </View>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.tile, styles.emptyTile, { height: cat.height }]}
        >
            <View style={styles.emptyContent}>
                <Typography variant="label" color={COLORS.stone} style={styles.emptyLabel}>{cat.name}</Typography>
                <Typography variant="body" color="#D1D1D1" style={styles.startSifting}>Start Sifting</Typography>
            </View>
        </TouchableOpacity>
    );
};


const styles = StyleSheet.create({
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.canvas,
    },
    header: {
        paddingHorizontal: 20,
        marginTop: SPACING.m,
        marginBottom: 20,
    },
    smallCapsLabel: {
        color: COLORS.stone,
        marginBottom: 4,
    },
    serifTitle: {
        fontSize: 34,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginBottom: 24,
        paddingHorizontal: 16,
        height: 44, // HIG Standard
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: COLORS.ink,
    },
    gridContainer: {
        paddingHorizontal: 20,
        paddingBottom: 160,
    },
    bentoWrapper: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    tile: {
        width: TILE_WIDTH,
        marginBottom: GRID_GAP,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(0,0,0,0.1)',
        // @ts-ignore
        cornerCurve: 'continuous',
    },
    anchorTile: {
        backgroundColor: COLORS.paper,
    },
    emptyTile: {
        backgroundColor: COLORS.paper,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tileContent: {
        position: 'absolute',
        bottom: 12,
        left: 12,
    },
    anchorLabel: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    issueCount: {
        fontSize: 10,
        marginTop: 2,
    },
    emptyContent: {
        alignItems: 'center',
    },
    emptyLabel: {
        fontSize: 12,
        letterSpacing: 1,
        fontWeight: '700',
    },
    startSifting: {
        fontSize: 12,
        color: COLORS.stone,
        marginTop: 4,
    },
    newTag: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.4)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#FF453A',
        marginRight: 4,
    },
    newTagText: {
        fontSize: 9,
        fontWeight: '700',
    },
    emptyState: {
        width: '100%',
        paddingVertical: 40,
        alignItems: 'center',
    }
});

