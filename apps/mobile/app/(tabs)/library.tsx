import * as React from 'react';
import { useCallback, useState, useMemo } from 'react';
import { View, TextInput, ScrollView, Image, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, RefreshControl, Platform, Alert } from 'react-native';
import { useFocusEffect, useRouter, useNavigation } from 'expo-router';
import { Typography } from '../../components/design-system/Typography';
import { COLORS, SPACING, Theme, RADIUS } from '../../lib/theme';
import { useTheme } from '../../context/ThemeContext';
import { MagnifyingGlass, CaretLeft, DotsThree } from 'phosphor-react-native';
import { supabase } from '../../lib/supabase';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useAuth } from '../../lib/auth';
import { LinearGradient } from 'expo-linear-gradient';
import SiftFeed from '../../components/SiftFeed';
import { QuickTagEditor } from '../../components/QuickTagEditor';
import * as Haptics from 'expo-haptics';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
    { name: 'COOKING', icon: 'Cooking' },
    { name: 'BAKING', icon: 'Baking' },
    { name: 'TECH', icon: 'Tech' },
    { name: 'HEALTH', icon: 'Health' },
    { name: 'LIFESTYLE', icon: 'Lifestyle' },
    { name: 'PROFESSIONAL', icon: 'Professional' },
];

export default function LibraryScreen() {
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const router = useRouter();
    const navigation = useNavigation();
    const queryClient = useQueryClient();
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    // Quick Tag Modal State
    const [quickTagModalVisible, setQuickTagModalVisible] = useState(false);
    const [selectedSiftId, setSelectedSiftId] = useState<string | null>(null);
    const [selectedSiftTags, setSelectedSiftTags] = useState<string[]>([]);

    const { data: pages = [], isLoading: loading, refetch } = useQuery({
        queryKey: ['pages', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            console.log(`[Fetch] Fetching pages for user: ${user.id}`);
            const { data, error } = await supabase
                .from('pages')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_archived', false)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching sifts:', error);
                throw error;
            }
            return (data || []) as SiftItem[];
        },
        enabled: !!user?.id,
    });

    // Tab Bar Reset Logic
    React.useEffect(() => {
        const unsubscribe = navigation.addListener('tabPress' as any, (e: any) => {
            if (activeCategory) {
                // If in a category, reset to main catalog
                setActiveCategory(null);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
        });

        return unsubscribe;
    }, [navigation, activeCategory]);

    const handleEditTagsTrigger = (id: string, currentTags: string[]) => {
        setSelectedSiftId(id);
        setSelectedSiftTags(currentTags);
        setQuickTagModalVisible(true);
    };

    const handleSaveTags = async (newTags: string[]) => {
        if (!selectedSiftId) return;

        // Optimistic update could be added here
        try {
            const { error } = await supabase
                .from('pages')
                .update({ tags: newTags })
                .eq('id', selectedSiftId);

            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['pages', user?.id] });
        } catch (error: any) {
            console.error("Error updating tags:", error);
            Alert.alert("Error", "Failed to update tags");
        }
    };

    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await queryClient.invalidateQueries({ queryKey: ['pages', user?.id] });
        setRefreshing(false);
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

    const activeCategoryPages = useMemo(() => {
        if (!activeCategory) return [];
        return pages.filter(p =>
            p.tags?.some(t => t.toUpperCase() === activeCategory) ||
            p.metadata?.category?.toUpperCase() === activeCategory
        );
    }, [pages, activeCategory]);

    const filteredCategories = categoryData.filter(cat => {
        if (!searchQuery.trim()) return true;
        return cat.name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    if (loading && !refreshing) {
        return (
            <View style={[styles.loaderContainer, { backgroundColor: colors.canvas }]}>
                <ActivityIndicator color={colors.ink} />
            </View>
        );
    }

    return (
        <ScreenWrapper edges={['top']}>
            {/* 1. EDITORIAL HEADER */}
            <View style={styles.header}>
                {activeCategory ? (
                    <TouchableOpacity
                        onPress={() => setActiveCategory(null)}
                        style={styles.backButton}
                    >
                        <CaretLeft size={28} color={colors.ink} />
                    </TouchableOpacity>
                ) : null}
                <View style={[styles.titleGroup, activeCategory ? { marginLeft: 12 } : {}]}>
                    <Typography variant="label" color="stone" style={styles.smallCapsLabel}>
                        {activeCategory ? `CATEGORY / ${activeCategory}` : 'YOUR COLLECTION'}
                    </Typography>
                    <Typography variant="h1" style={styles.serifTitle}>
                        {activeCategory ? activeCategory.charAt(0) + activeCategory.slice(1).toLowerCase() : 'Library'}
                    </Typography>
                </View>
                {activeCategory && (
                    <TouchableOpacity
                        style={styles.manageButton}
                        onPress={() => Alert.alert("Manage Category", `Options for ${activeCategory} will go here.`)}
                    >
                        <DotsThree size={28} color={colors.ink} />
                    </TouchableOpacity>
                )}
            </View>

            {/* 2. SEARCH INPUT (Only in main view) */}
            {!activeCategory && (
                <View style={[styles.searchContainer, { backgroundColor: colors.paper, borderColor: colors.separator }]}>
                    <MagnifyingGlass size={18} color={colors.stone} weight="regular" />
                    <TextInput
                        style={[styles.searchInput, { color: colors.ink }]}
                        placeholder="Search your mind..."
                        placeholderTextColor={colors.stone}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                    />
                </View>
            )}

            {/* 3. BENTO GRID or SIFT FEED */}
            <ScrollView
                contentContainerStyle={activeCategory ? styles.feedContainer : styles.gridContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />
                }
            >
                {activeCategory ? (
                    <View style={styles.feedWrapper}>
                        <SiftFeed
                            pages={activeCategoryPages as any}
                            onEditTags={handleEditTagsTrigger}
                            loading={loading}
                        />
                        {activeCategoryPages.length === 0 && (
                            <View style={styles.emptyState}>
                                <Typography variant="body" color={COLORS.stone}>No sifts in this category yet.</Typography>
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={styles.bentoWrapper}>
                        {filteredCategories.map((cat) => (
                            <Tile key={cat.name} cat={cat} colors={colors} isDark={isDark} onPress={() => setActiveCategory(cat.name)} />
                        ))}

                        {filteredCategories.length === 0 && (
                            <View style={styles.emptyState}>
                                <Typography variant="body" color="stone">No categories match your search.</Typography>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
            <QuickTagEditor
                visible={quickTagModalVisible}
                onClose={() => setQuickTagModalVisible(false)}
                initialTags={selectedSiftTags}
                onSave={handleSaveTags}
            />
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

const Tile = ({ cat, colors, isDark, onPress }: { cat: CategoryData, colors: any, isDark: boolean, onPress: () => void }) => {
    const isAnchor = cat.count > 0; // Use count to determine if we show contents

    if (isAnchor) {
        return (
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={onPress}
                style={[
                    styles.tile,
                    {
                        height: cat.height,
                        backgroundColor: colors.paper,
                        borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)'
                    }
                ]}
            >
                {cat.latestImage ? (
                    <Image source={{ uri: cat.latestImage }} style={StyleSheet.absoluteFill} />
                ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.subtle }]} />
                )}
                <LinearGradient
                    colors={['transparent', isDark ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.8)']}
                    style={StyleSheet.absoluteFill}
                />
                <View style={[styles.newTag, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.4)' }]}>
                    <View style={[styles.dot, { backgroundColor: colors.danger }]} />
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
            onPress={onPress}
            style={[
                styles.tile,
                {
                    height: cat.height,
                    backgroundColor: colors.paper,
                    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)'
                }
            ]}
        >
            <View style={styles.emptyContent}>
                <Typography variant="label" color="stone" style={styles.emptyLabel}>{cat.name}</Typography>
                <Typography variant="body" color="stone" style={[styles.startSifting, { opacity: 0.5 }]}>Start Sifting</Typography>
            </View>
        </TouchableOpacity>
    );
};


const styles = StyleSheet.create({
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginTop: SPACING.m,
        marginBottom: 20,
        alignItems: 'center',
    },
    backButton: {
        padding: 4,
    },
    smallCapsLabel: {
        marginBottom: 4,
    },
    serifTitle: {
        fontSize: 34,
    },
    titleGroup: {
        flex: 1,
    },
    manageButton: {
        padding: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginBottom: 24,
        paddingHorizontal: 16,
        height: 48, // Slightly taller
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
    },
    gridContainer: {
        paddingHorizontal: 20,
        paddingBottom: 160,
    },
    feedContainer: {
        paddingBottom: 160,
    },
    feedWrapper: {
        flex: 1,
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
        // @ts-ignore
        cornerCurve: 'continuous',
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
        marginTop: 4,
    },
    newTag: {
        position: 'absolute',
        top: 10,
        right: 10,
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

