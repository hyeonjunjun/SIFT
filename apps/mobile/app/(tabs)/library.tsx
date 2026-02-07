import * as React from 'react';
import { useCallback, useState, useMemo, useEffect } from 'react';
import { View, TextInput, ScrollView, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, RefreshControl, Platform, Alert } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS } from 'react-native-reanimated';
import { Image } from 'expo-image';
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
import { FeedLoadingScreen } from '../../components/FeedLoadingScreen';
import { QuickTagEditor } from '../../components/QuickTagEditor';
import { useDebounce } from '../../hooks/useDebounce';
import * as Haptics from 'expo-haptics';

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

import { useQuery, useQueryClient } from '@tanstack/react-query';

const PAGE_SIZE = 20;

export default function LibraryScreen() {
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const router = useRouter();
    const navigation = useNavigation();
    const queryClient = useQueryClient();
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    // Quick Tag Modal State
    const [quickTagModalVisible, setQuickTagModalVisible] = useState(false);
    const [selectedSiftId, setSelectedSiftId] = useState<string | null>(null);
    const [selectedSiftTags, setSelectedSiftTags] = useState<string[]>([]);

    const {
        data: pages = [],
        isLoading: loading,
        fetchStatus,
        refetch
    } = useQuery({
        queryKey: ['pages', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            // console.log(`[Fetch] Fetching all pages for user: ${user.id}`);
            const { data, error } = await supabase
                .from('pages')
                .select('id, title, url, tags, created_at, metadata') // OPTIMIZE: Exclude 'content' and 'summary'
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

    useEffect(() => {
        const subscription = supabase
            .channel('library_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pages' }, async (payload) => {
                // console.log('[Library Realtime] Update received:', payload.eventType);
                queryClient.resetQueries({ queryKey: ['pages', user?.id] });
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [user?.id, queryClient]);

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
            queryClient.resetQueries({ queryKey: ['pages', user?.id] });
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
        await queryClient.resetQueries({ queryKey: ['pages', user?.id] });
        setRefreshing(false);
    };

    const categoryData = useMemo(() => {
        return CATEGORIES.map((cat, index) => {
            const catPages = pages.filter(p =>
                p.tags?.some(t => t.toUpperCase() === cat.name) ||
                p.metadata?.category?.toUpperCase() === cat.name
            );

            const height = 240; // Standard longer uniform height

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
        if (!debouncedSearchQuery.trim()) return true;
        return cat.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
    });

    const swipeGesture = Gesture.Pan()
        .onUpdate((event) => {
            if (activeCategory && event.translationX > 80 && Math.abs(event.translationY) < 30) {
                runOnJS(setActiveCategory)(null);
                runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
            }
        })
        .runOnJS(true);

    if (loading && !refreshing && fetchStatus !== 'paused') {
        return (
            <ScreenWrapper edges={['top']}>
                <View style={[styles.header, { paddingBottom: 0 }]}>
                    <View style={styles.titleGroup}>
                        <Typography variant="label" color="stone" style={styles.smallCapsLabel}>
                            YOUR COLLECTION
                        </Typography>
                        <Typography variant="h1" style={styles.serifTitle}>
                            Library
                        </Typography>
                    </View>
                </View>
                <FeedLoadingScreen message="Loading your collection..." />
            </ScreenWrapper>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
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
                {activeCategory ? (
                    <GestureDetector gesture={swipeGesture}>
                        <View style={{ flex: 1 }}>
                            <SiftFeed
                                pages={activeCategoryPages as any}
                                onEditTags={handleEditTagsTrigger}
                                loading={loading && fetchStatus !== 'paused'}
                                refreshControl={
                                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />
                                }
                                contentContainerStyle={styles.feedContainer}
                            />
                            {(!activeCategoryPages || activeCategoryPages.length === 0) && !loading && (
                                <View style={styles.emptyState}>
                                    <Typography variant="body" color={COLORS.stone}>No sifts in this category yet.</Typography>
                                </View>
                            )}
                        </View>
                    </GestureDetector>
                ) : (
                    <ScrollView
                        contentContainerStyle={styles.gridContainer}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />
                        }
                    >
                        <View style={styles.bentoWrapper}>
                            {filteredCategories.map((cat) => (
                                <Tile key={cat.name} cat={cat} colors={colors} isDark={isDark} onPress={() => setActiveCategory(cat.name)} />
                            ))}

                            {(!filteredCategories || filteredCategories.length === 0) && (
                                <View style={styles.emptyState}>
                                    <Typography variant="body" color="stone">No categories match your search.</Typography>
                                </View>
                            )}
                        </View>
                    </ScrollView>
                )}
                <QuickTagEditor
                    visible={quickTagModalVisible}
                    onClose={() => setQuickTagModalVisible(false)}
                    initialTags={selectedSiftTags}
                    onSave={handleSaveTags}
                />
            </ScreenWrapper>
        </GestureHandlerRootView>
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
    const hasImage = cat.count > 0 && cat.latestImage;

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={onPress}
            style={[
                styles.tile,
                {
                    height: cat.height,
                    backgroundColor: hasImage ? colors.subtle : (isDark ? 'rgba(255,255,255,0.03)' : colors.paper),
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                    borderWidth: hasImage ? 0 : 1.5,
                }
            ]}
        >
            {hasImage ? (
                <>
                    <Image
                        source={{ uri: cat.latestImage }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                        transition={300}
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.4)', isDark ? 'rgba(0,0,0,0.95)' : 'rgba(0,0,0,0.85)']}
                        locations={[0, 0.5, 1]}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.newTag}>
                        <View style={[styles.dot, { backgroundColor: colors.danger }]} />
                        <Typography variant="label" color="white" style={styles.newTagText}>NEW</Typography>
                    </View>
                </>
            ) : (
                <View style={[StyleSheet.absoluteFill, { padding: 16, justifyContent: 'center', alignItems: 'center' }]}>
                    <Typography
                        variant="h1"
                        style={{
                            fontSize: 42,
                            opacity: isDark ? 0.05 : 0.03,
                            position: 'absolute',
                            fontFamily: 'PlayfairDisplay_700Bold'
                        }}
                    >
                        {cat.name.charAt(0)}
                    </Typography>
                </View>
            )}

            <View style={styles.tileContent}>
                <Typography
                    variant="label"
                    color={hasImage ? "white" : colors.ink}
                    style={[styles.anchorLabel, !hasImage && { opacity: 0.8 }]}
                >
                    {cat.name}
                </Typography>
                <Typography
                    variant="caption"
                    color={hasImage ? "rgba(255,255,255,0.7)" : colors.stone}
                    style={styles.issueCount}
                >
                    {cat.count > 0 ? `${cat.count} ISSUES` : 'START SIFTING'}
                </Typography>
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
        borderRadius: RADIUS.l,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        // @ts-ignore
        cornerCurve: 'continuous',
    },
    tileContent: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
    },
    anchorLabel: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 2,
    },
    issueCount: {
        fontSize: 11,
        marginTop: 4,
        letterSpacing: 0.5,
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
        letterSpacing: 1,
    },
    emptyState: {
        width: '100%',
        paddingVertical: 40,
        alignItems: 'center',
    }
});

