import * as React from 'react';
import { useCallback, useState, useMemo, useEffect } from 'react';
import { View, TextInput, ScrollView, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, RefreshControl, Alert, Pressable, ActionSheetIOS, Modal } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter, useNavigation } from 'expo-router';
import { Typography } from '../../components/design-system/Typography';
import { COLORS, SPACING, Theme, RADIUS } from '../../lib/theme';
import { useTheme } from '../../context/ThemeContext';
import { MagnifyingGlass, CaretLeft, DotsThree, SquaresFour, List, Plus, Folder, Rows } from 'phosphor-react-native';
import { supabase } from '../../lib/supabase';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useAuth } from '../../lib/auth';
import { LinearGradient } from 'expo-linear-gradient';
import SiftFeed from '../../components/SiftFeed';
import { FeedLoadingScreen } from '../../components/FeedLoadingScreen';
import { QuickTagEditor } from '../../components/QuickTagEditor';
import { useDebounce } from '../../hooks/useDebounce';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CompactSiftList from '../../components/CompactSiftList';
import { SmartCollectionModal, SmartCollectionData } from '../../components/modals/SmartCollectionModal';
import { ActionSheet } from '../../components/modals/ActionSheet';
import { CollectionModal, CollectionData } from '../../components/modals/CollectionModal';
import { SiftPickerModal } from '../../components/modals/SiftPickerModal';
import { SiftActionSheet } from '../../components/modals/SiftActionSheet';
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
    folder_id?: string;
    is_pinned?: boolean;
    metadata?: {
        image_url?: string;
        category?: string;
    };
}

const DEFAULT_SMART_COLLECTIONS = [
    { name: 'COOKING', icon: 'Cooking', tags: ['COOKING', 'RECIPES', 'FOOD'] },
    { name: 'BAKING', icon: 'Baking', tags: ['BAKING', 'DESSERT', 'BREAD'] },
    { name: 'TECH', icon: 'Tech', tags: ['TECH', 'CODING', 'SOFTWARE'] },
    { name: 'HEALTH', icon: 'Health', tags: ['HEALTH', 'FITNESS', 'WELLNESS'] },
    { name: 'LIFESTYLE', icon: 'Lifestyle', tags: ['LIFESTYLE', 'HOME', 'DECOR'] },
    { name: 'PROFESSIONAL', icon: 'Professional', tags: ['WORK', 'CAREER', 'BUSINESS'] },
];

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
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

    // Quick Tag Modal State
    const [quickTagModalVisible, setQuickTagModalVisible] = useState(false);
    const [selectedSiftId, setSelectedSiftId] = useState<string | null>(null);
    const [selectedSiftTags, setSelectedSiftTags] = useState<string[]>([]);

    // Collection Modal State
    const [collectionModalVisible, setCollectionModalVisible] = useState(false);
    const [editingCollection, setEditingCollection] = useState<CollectionData | null>(null);

    // Smart Collection Modal State
    const [smartCollectionModalVisible, setSmartCollectionModalVisible] = useState(false);
    const [categoryActionSheetVisible, setCategoryActionSheetVisible] = useState(false);
    const [editingSmartCollection, setEditingSmartCollection] = useState<SmartCollectionData | null>(null);
    const [isCategoryEditing, setIsCategoryEditing] = useState(false);
    const [siftPickerVisible, setSiftPickerVisible] = useState(false);

    // Action Sheet State
    const [selectedSift, setSelectedSift] = useState<any | null>(null);
    const [actionSheetVisible, setActionSheetVisible] = useState(false);

    // Load saved view preference
    useEffect(() => {
        AsyncStorage.getItem('library_view_mode').then(saved => {
            if (saved === 'list' || saved === 'grid') setViewMode(saved);
        });
    }, []);

    const toggleViewMode = () => {
        const newMode = viewMode === 'grid' ? 'list' : 'grid';
        setViewMode(newMode);
        AsyncStorage.setItem('library_view_mode', newMode);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const {
        data: pages = [],
        isLoading: loading,
        fetchStatus,
        refetch
    } = useQuery({
        queryKey: ['pages', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const { data, error } = await supabase
                .from('pages')
                .select('id, title, url, tags, created_at, folder_id, metadata')
                .eq('user_id', user.id)
                .eq('is_archived', false)
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching gems:', error);
                throw error;
            }
            return (data || []) as SiftItem[];
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 5, // 5 minutes cache
        retry: 2,
    });

    // Fetch collections
    const {
        data: collections = [],
        refetch: refetchCollections,
    } = useQuery({
        queryKey: ['folders', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            try {
                const { data, error } = await supabase
                    .from('folders')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('is_pinned', { ascending: false })
                    .order('sort_order', { ascending: true });

                if (error) {
                    console.warn('Collections query error:', error.message);
                    return [];
                }
                return (data || []) as CollectionData[];
            } catch (e) {
                console.warn('Collections query failed:', e);
                return [];
            }
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 5, // 5 minutes cache
        retry: 2,
    });

    // Fetch Smart Collections
    const { data: smartCollections = [], refetch: refetchSmartCollections } = useQuery({
        queryKey: ['categories', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];

            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .eq('user_id', user.id)
                .order('sort_order', { ascending: true });

            if (error) {
                console.warn('Smart collections query error:', error.message);
                return [];
            }

            if (!data || data.length === 0) {
                console.log('Seeding default smart collections...');
                const seedData = DEFAULT_SMART_COLLECTIONS.map((cat, index) => ({
                    user_id: user.id,
                    name: cat.name,
                    icon: cat.icon,
                    tags: cat.tags,
                    sort_order: index
                }));

                const { data: seeded, error: seedError } = await supabase
                    .from('categories')
                    .insert(seedData)
                    .select();

                if (seedError) console.error('Seeding failed:', seedError);
                return (seeded || []) as SmartCollectionData[];
            }

            return data as SmartCollectionData[];
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 5, // 5 minutes cache
        retry: 2,
    });

    // Derive unique used tags for suggestions
    const allUsedTags = useMemo(() => {
        const tagSet = new Set<string>();
        pages.forEach(p => p.tags?.forEach(t => tagSet.add(t.toUpperCase())));
        DEFAULT_SMART_COLLECTIONS.forEach(c => c.tags.forEach(t => tagSet.add(t)));
        return Array.from(tagSet).sort();
    }, [pages]);

    // Tab Bar Reset Logic
    React.useEffect(() => {
        const unsubscribe = navigation.addListener('tabPress' as any, (e: any) => {
            if (activeCategoryId) {
                setActiveCategoryId(null);
                setIsCategoryEditing(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
        });
        return unsubscribe;
    }, [navigation, activeCategoryId]);

    useEffect(() => {
        const subscription = supabase
            .channel('library_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pages' }, async (payload) => {
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
            refetchCollections();
            refetchSmartCollections();
        }, [refetch, refetchCollections, refetchSmartCollections])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([
            queryClient.resetQueries({ queryKey: ['pages', user?.id] }),
            queryClient.resetQueries({ queryKey: ['folders', user?.id] }),
            queryClient.resetQueries({ queryKey: ['categories', user?.id] }),
        ]);
        setRefreshing(false);
    };

    const handleArchive = async (id: string) => {
        try {
            const { error } = await supabase
                .from('pages')
                .update({ is_archived: true })
                .eq('id', id);

            if (error) throw error;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            queryClient.setQueryData(['pages', user?.id], (old: SiftItem[] | undefined) =>
                old ? old.filter(p => p.id !== id) : []
            );
        } catch (error: any) {
            console.error("Error archiving gem:", error);
            Alert.alert("Error", "Failed to archive gem");
            queryClient.invalidateQueries({ queryKey: ['pages', user?.id] });
        }
    };

    const handleSaveSmartCollection = async (cat: SmartCollectionData) => {
        try {
            const { error } = await supabase
                .from('categories')
                .upsert({
                    id: cat.id || undefined,
                    name: cat.name,
                    icon: cat.icon,
                    tags: cat.tags,
                    user_id: user?.id,
                    sort_order: cat.sort_order || 999
                })
                .select()
                .single();

            if (error) throw error;

            queryClient.invalidateQueries({ queryKey: ['categories', user?.id] });
            setSmartCollectionModalVisible(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
            console.error("Error saving smart collection:", error);
            Alert.alert("Error", "Failed to save smart collection");
        }
    };

    const handleSaveCollection = async (collection: CollectionData) => {
        if (!user?.id) return;
        if (collection.id) {
            const { error } = await supabase
                .from('folders')
                .update({ name: collection.name, color: collection.color, icon: collection.icon, is_pinned: collection.is_pinned })
                .eq('id', collection.id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('folders')
                .insert({
                    user_id: user.id,
                    name: collection.name,
                    color: collection.color,
                    icon: collection.icon,
                    sort_order: collections.length,
                    is_pinned: collection.is_pinned || false
                });
            if (error) throw error;
        }
        queryClient.invalidateQueries({ queryKey: ['folders', user?.id] });
    };

    const handleDeleteSmartCollection = async (id: string) => {
        if (!id) return;
        if (activeCategoryId === id) setActiveCategoryId(null);
        setSmartCollectionModalVisible(false);

        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting smart collection:', error);
            Alert.alert('Error', 'Failed to delete smart collection');
        }
        queryClient.invalidateQueries({ queryKey: ['categories', user?.id] });
    };

    const handleDeleteCollection = async (collectionId: string) => {
        await supabase
            .from('pages')
            .update({ folder_id: null })
            .eq('folder_id', collectionId);

        const { error } = await supabase
            .from('folders')
            .delete()
            .eq('id', collectionId);

        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['folders', user?.id] });
        queryClient.invalidateQueries({ queryKey: ['pages', user?.id] });
    };

    const handlePinCollection = async (collectionId: string, isPinned: boolean) => {
        const { error } = await supabase
            .from('folders')
            .update({ is_pinned: isPinned })
            .eq('id', collectionId);

        if (error) {
            console.error('Error pinning collection:', error);
            Alert.alert('Error', 'Failed to update pin status');
            queryClient.invalidateQueries({ queryKey: ['folders', user?.id] });
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        queryClient.invalidateQueries({ queryKey: ['folders', user?.id] });
    };

    const handleAddSmartCollectionGems = async (selectedIds: string[]) => {
        const activeCat = smartCollections.find(c => c.id === activeCategoryId);
        if (!activeCat || !user?.id) return;

        try {
            const updates = selectedIds.map(async (id) => {
                const page = pages.find(p => p.id === id);
                if (!page) return;
                const currentTags = (page.tags || []).map(t => t.toUpperCase());
                const categoryTag = activeCat.name.toUpperCase();
                if (!currentTags.includes(categoryTag)) {
                    const newTags = [...(page.tags || []), activeCat.name];
                    await supabase
                        .from('pages')
                        .update({ tags: newTags })
                        .eq('id', id);
                }
            });
            await Promise.all(updates);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            queryClient.invalidateQueries({ queryKey: ['pages', user?.id] });
        } catch (error) {
            console.error('Error adding gems to smart collection:', error);
            Alert.alert('Error', 'Failed to add gems');
        }
    };

    const handleRemoveSmartCollectionGem = async (id: string) => {
        const activeCat = smartCollections.find(c => c.id === activeCategoryId);
        if (!activeCat) return;

        const page = pages.find(p => p.id === id);
        if (!page) return;

        const catNameUpper = activeCat.name.toUpperCase();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        try {
            const currentTags = page.tags || [];
            const newTags = currentTags.filter(t => t.toUpperCase() !== catNameUpper);
            let metadataUpdate = {};
            if (page.metadata?.category?.toUpperCase() === catNameUpper) {
                metadataUpdate = { metadata: { ...page.metadata, category: null } };
            }
            const { error } = await supabase
                .from('pages')
                .update({ tags: newTags, ...metadataUpdate })
                .eq('id', id);
            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['pages', user?.id] });
        } catch (error) {
            console.error('Error removing gem from smart collection:', error);
            Alert.alert('Error', 'Failed to remove gem');
        }
    };

    const handlePin = async (id: string) => {
        try {
            const page = pages.find(p => p.id === id);
            if (!page) return;
            const newPinnedState = !page.is_pinned;
            const { error } = await supabase.from('pages').update({ is_pinned: newPinnedState }).eq('id', id);
            if (error) throw error;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            queryClient.invalidateQueries({ queryKey: ['pages', user?.id] });
        } catch (error) {
            console.error('[Library Pin] Action failed:', error);
        }
    };

    const openCollectionModal = (collection?: CollectionData) => {
        if (collection) {
            setEditingCollection(collection);
        } else {
            setEditingCollection(null);
        }
        setCollectionModalVisible(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const smartCollectionUIData = useMemo(() => {
        return smartCollections.map((cat) => {
            const catPages = pages.filter(p =>
                (cat.tags && cat.tags.length > 0 && p.tags?.some(t => cat.tags.includes(t.toUpperCase())))
            );
            return {
                ...cat,
                pages: catPages,
                count: catPages.length,
                height: 240,
                latestImage: catPages[0]?.metadata?.image_url
            };
        });
    }, [pages, smartCollections]);

    const activeCategoryPages = useMemo(() => {
        const activeCat = smartCollections.find(c => c.id === activeCategoryId);
        if (!activeCat) return [];
        const catTags = (activeCat.tags || []).map(t => t.toUpperCase());
        return pages.filter(p =>
            catTags.some(tag => p.tags?.some(t => t.toUpperCase() === tag))
        );
    }, [pages, activeCategoryId, smartCollections]);

    const filteredSmartCollections = smartCollectionUIData.filter(cat => {
        if (!debouncedSearchQuery.trim()) return true;
        return cat.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
    });

    const swipeGesture = Gesture.Pan()
        .onUpdate((event) => {
            if (activeCategoryId && event.translationX > 80 && Math.abs(event.translationY) < 30) {
                runOnJS(setActiveCategoryId)(null);
                runOnJS(setIsCategoryEditing)(false);
                runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
            }
        })
        .runOnJS(true);

    const isLoadingState = loading && !refreshing && fetchStatus === 'fetching';

    if (isLoadingState) {
        return (
            <ScreenWrapper edges={['top']}>
                <View style={[styles.header, { paddingBottom: 0 }]}>
                    <View style={styles.titleGroup}>
                        <Typography variant="label" color="stone" style={styles.smallCapsLabel}>
                            YOUR MISSION
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
                <View style={styles.header}>
                    {activeCategoryId ? (
                        isCategoryEditing ? (
                            <TouchableOpacity onPress={() => setIsCategoryEditing(false)} style={styles.backButton}>
                                <Typography variant="label" color="ink" style={{ fontWeight: '700', letterSpacing: 1 }}>DONE</Typography>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity onPress={() => setActiveCategoryId(null)} style={styles.backButton}>
                                <CaretLeft size={28} color={colors.ink} />
                            </TouchableOpacity>
                        )
                    ) : null}
                    <View style={[styles.titleGroup, activeCategoryId ? { marginLeft: 12 } : {}]}>
                        <Typography variant="label" color="stone" style={styles.smallCapsLabel}>
                            {activeCategoryId ? (isCategoryEditing ? 'MANAGING' : `SMART COLLECTION • ${smartCollections.find(c => c.id === activeCategoryId)?.name?.toUpperCase() || ''}`) : 'YOUR MISSION'}
                        </Typography>
                        <Typography variant="h1" style={styles.serifTitle}>
                            {activeCategoryId ? (smartCollections.find(c => c.id === activeCategoryId)?.name || '') : 'Library'}
                        </Typography>
                    </View>

                    <View style={styles.headerActions}>
                        {!isCategoryEditing && (
                            <TouchableOpacity style={styles.viewToggle} onPress={toggleViewMode} activeOpacity={0.7}>
                                {viewMode === 'grid' ? (
                                    <Rows size={22} color={colors.ink} weight="bold" />
                                ) : (
                                    <SquaresFour size={22} color={colors.ink} weight="bold" />
                                )}
                            </TouchableOpacity>
                        )}
                        {activeCategoryId && !isCategoryEditing && (
                            <TouchableOpacity
                                style={styles.manageButton}
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    const currentCat = smartCollections.find(c => c.id === activeCategoryId);
                                    if (!currentCat) return;
                                    setEditingSmartCollection(currentCat);
                                    setCategoryActionSheetVisible(true);
                                }}
                            >
                                <DotsThree size={28} color={colors.ink} />
                            </TouchableOpacity>
                        )}
                        {activeCategoryId && isCategoryEditing && (
                            <TouchableOpacity
                                style={styles.manageButton}
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    setSiftPickerVisible(true);
                                }}
                            >
                                <Plus size={24} color={colors.ink} weight="regular" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {!activeCategoryId && (
                    <View style={styles.searchContainer}>
                        <View style={[styles.searchInputWrapper, { backgroundColor: colors.paper, borderColor: colors.separator }]}>
                            <MagnifyingGlass size={18} color={colors.stone} weight="bold" style={{ marginRight: 10 }} />
                            <TextInput
                                style={[styles.searchInput, { color: colors.ink }]}
                                placeholder="Search your gems..."
                                placeholderTextColor={colors.stone}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>
                    </View>
                )}

                {activeCategoryId ? (
                    <GestureDetector gesture={swipeGesture}>
                        <View style={{ flex: 1 }}>
                            <SiftFeed
                                pages={activeCategoryPages as any}
                                onPin={handlePin}
                                onEditTags={handleEditTagsTrigger}
                                onOptions={(item) => {
                                    setSelectedSift(item);
                                    setActionSheetVisible(true);
                                }}
                                loading={loading && fetchStatus === 'fetching'}
                                mode={isCategoryEditing ? 'edit' : 'feed'}
                                onRemove={handleRemoveSmartCollectionGem}
                                refreshControl={
                                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />
                                }
                                contentContainerStyle={styles.feedContainer}
                                viewMode={viewMode}
                            />
                            {(!activeCategoryPages || activeCategoryPages.length === 0) && !loading && (
                                <View style={styles.emptyState}>
                                    <Typography variant="body" color={COLORS.stone}>No gems in this collection yet.</Typography>
                                </View>
                            )}
                        </View>
                    </GestureDetector>
                ) : viewMode === 'list' ? (
                    <CompactSiftList
                        pages={pages as any}
                        onPin={(id) => handlePin(id)}
                        onArchive={(id) => handleArchive(id)}
                        onEditTags={handleEditTagsTrigger}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />
                        }
                        contentContainerStyle={styles.feedContainer}
                    />
                ) : (
                    <ScrollView
                        contentContainerStyle={styles.gridContainer}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />
                        }
                    >
                        {collections.length > 0 && (
                            <>
                                <Typography variant="label" color="stone" style={styles.sectionLabel}>
                                    COLLECTIONS
                                </Typography>
                                <View style={styles.folderRow}>
                                    {collections.map((collection) => (
                                        <Pressable
                                            key={collection.id}
                                            style={({ pressed }) => [
                                                styles.folderTile,
                                                {
                                                    backgroundColor: collection.color,
                                                    opacity: pressed ? 0.8 : 1,
                                                    transform: [{ scale: pressed ? 0.98 : 1 }]
                                                }
                                            ]}
                                            onPress={() => router.push(`/collection/${collection.id}`)}
                                            onLongPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                                openCollectionModal(collection);
                                            }}
                                            delayLongPress={300}
                                        >
                                            <Folder size={24} color="#FFFFFF" weight="fill" />
                                            <Typography variant="caption" style={styles.folderName} numberOfLines={1}>
                                                {collection.name}
                                            </Typography>
                                        </Pressable>
                                    ))}
                                </View>
                                <Typography variant="label" color="stone" style={[styles.sectionLabel, { marginTop: SPACING.l }]}>
                                    SMART COLLECTIONS
                                </Typography>
                            </>
                        )}

                        <View style={styles.bentoWrapper}>
                            {filteredSmartCollections.map((cat) => (
                                <Tile key={cat.id || cat.name} cat={cat as any} colors={colors} isDark={isDark} onPress={() => setActiveCategoryId(cat.id || null)} />
                            ))}
                            {(!filteredSmartCollections || filteredSmartCollections.length === 0) && (
                                <View style={styles.emptyState}>
                                    <Typography variant="body" color="stone">No collections match your search.</Typography>
                                </View>
                            )}
                        </View>
                    </ScrollView>
                )}

                {!activeCategoryId && viewMode === 'grid' && (
                    <TouchableOpacity
                        style={[styles.fab, { backgroundColor: colors.ink }]}
                        onPress={() => openCollectionModal()}
                        activeOpacity={0.8}
                    >
                        <Plus size={24} color={colors.paper} weight="bold" />
                    </TouchableOpacity>
                )}

                <QuickTagEditor
                    visible={quickTagModalVisible}
                    onClose={() => setQuickTagModalVisible(false)}
                    initialTags={selectedSiftTags}
                    onSave={handleSaveTags}
                />

                <SmartCollectionModal
                    visible={smartCollectionModalVisible}
                    onClose={() => setSmartCollectionModalVisible(false)}
                    onSave={handleSaveSmartCollection}
                    onDelete={handleDeleteSmartCollection}
                    existingCategory={editingSmartCollection}
                    suggestedTags={allUsedTags}
                />

                <ActionSheet
                    visible={categoryActionSheetVisible}
                    onClose={() => setCategoryActionSheetVisible(false)}
                    title={smartCollections.find(c => c.id === activeCategoryId)?.name || 'Options'}
                    options={[
                        {
                            label: `Manage ${smartCollections.find(c => c.id === activeCategoryId)?.name || 'Smart Collection'}`,
                            onPress: () => {
                                setIsCategoryEditing(true);
                            }
                        },
                        {
                            label: 'Rename/Icon',
                            onPress: () => {
                                const currentCat = smartCollections.find(c => c.id === activeCategoryId);
                                if (currentCat) {
                                    setEditingSmartCollection(currentCat);
                                    setTimeout(() => setSmartCollectionModalVisible(true), 100);
                                }
                            }
                        },
                        {
                            label: 'Delete Smart Collection',
                            isDestructive: true,
                            onPress: () => {
                                const currentCat = smartCollections.find(c => c.id === activeCategoryId);
                                if (currentCat) {
                                    Alert.alert(
                                        "Delete Smart Collection",
                                        "Are you sure? Gems inside won't be deleted.",
                                        [
                                            { text: 'Cancel', style: 'cancel' },
                                            {
                                                text: 'Delete',
                                                style: 'destructive',
                                                onPress: () => handleDeleteSmartCollection(currentCat.id!)
                                            }
                                        ]
                                    );
                                }
                            }
                        },
                        {
                            label: 'Cancel',
                            isCancel: true,
                            onPress: () => { }
                        }
                    ]}
                />

                <CollectionModal
                    visible={collectionModalVisible}
                    onClose={() => setCollectionModalVisible(false)}
                    onSave={handleSaveCollection}
                    onDelete={handleDeleteCollection}
                    onPin={handlePinCollection}
                    existingFolder={editingCollection}
                />

                <SiftActionSheet
                    visible={actionSheetVisible}
                    onClose={() => setActionSheetVisible(false)}
                    sift={selectedSift}
                    onPin={handlePin}
                    onArchive={handleArchive}
                    onEditTags={handleEditTagsTrigger}
                />

                <SiftPickerModal
                    visible={siftPickerVisible}
                    onClose={() => setSiftPickerVisible(false)}
                    onSelect={handleAddSmartCollectionGems}
                    currentFolderSiftIds={activeCategoryPages.map(p => p.id)}
                />
            </ScreenWrapper>
        </GestureHandlerRootView>
    );
}

interface CategoryUI extends SmartCollectionData {
    pages: SiftItem[];
    count: number;
    height: number;
    latestImage?: string;
}

const Tile = ({ cat, colors, isDark, onPress }: { cat: CategoryUI, colors: any, isDark: boolean, onPress: () => void }) => {
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
                    {cat.count > 0 ? `${cat.count} GEMS` : 'START COLLECTING'}
                </Typography>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
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
        letterSpacing: 2,
        fontWeight: '700',
    },
    serifTitle: {
        fontSize: 36,
        fontFamily: 'PlayfairDisplay_700Bold',
        color: COLORS.ink,
    },
    titleGroup: {
        flex: 1,
    },
    manageButton: {
        padding: 4,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    viewToggle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchContainer: {
        marginHorizontal: 20,
        marginBottom: SPACING.l
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 52,
        borderRadius: RADIUS.l,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(0,0,0,0.08)',
        // @ts-ignore
        cornerCurve: 'continuous',
        ...Theme.shadows.soft,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'System',
        paddingVertical: 0,
        textAlignVertical: 'center',
    },
    gridContainer: {
        paddingHorizontal: 20,
        paddingBottom: 160,
    },
    feedContainer: {
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
        alignItems: 'center',
        paddingVertical: 40,
    },
    sectionLabel: {
        width: '100%',
        marginBottom: SPACING.s,
        letterSpacing: 1.5,
        fontWeight: '700',
    },
    folderRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        width: '100%',
        marginBottom: SPACING.m,
    },
    folderTile: {
        width: 80,
        height: 80,
        borderRadius: RADIUS.l,
        justifyContent: 'center',
        alignItems: 'center',
        ...Theme.shadows.soft,
    },
    folderName: {
        color: '#FFFFFF',
        marginTop: 6,
        fontWeight: '600',
        textAlign: 'center',
        maxWidth: 70,
        fontSize: 11,
    },
    fab: {
        position: 'absolute',
        bottom: 40,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        ...Theme.shadows.medium,
    },
});
