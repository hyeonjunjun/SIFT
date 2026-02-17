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
import {
    Folder,
    Plus,
    Gear,
    Folders,
    SelectionBackground,
    Users,
    CaretRight,
    Trash,
    DotsThreeVertical,
    PushPin as Pin,
    MagnifyingGlass,
    ChatCircleText,
    Check,
    X,
    FolderSimplePlus,
    CaretLeft,
    Rows,
    SquaresFour,
    DotsThree,
    Sparkle
} from 'phosphor-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { supabase } from '../../lib/supabase';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EmptyState } from '../../components/design-system/EmptyState';
import ScreenWrapper from '../../components/ScreenWrapper';

const { width } = Dimensions.get('window');
const GRID_PADDING = 20;
const GRID_GAP = 15;
const TILE_WIDTH = (width - (SPACING.xl * 2) - 15) / 2;

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
    const [selectedGemId, setSelectedGemId] = useState<string | null>(null);
    const [selectedGemTags, setSelectedGemTags] = useState<string[]>([]);

    // Collection Modal State
    const [collectionModalVisible, setCollectionModalVisible] = useState(false);
    const [editingCollection, setEditingCollection] = useState<CollectionData | null>(null);

    // Smart Collection Modal State
    const [smartCollectionModalVisible, setSmartCollectionModalVisible] = useState(false);
    const [categoryActionSheetVisible, setCategoryActionSheetVisible] = useState(false);
    const [editingSmartCollection, setEditingSmartCollection] = useState<SmartCollectionData | null>(null);
    const [isCategoryEditing, setIsCategoryEditing] = useState(false);
    const [gemPickerVisible, setGemPickerVisible] = useState(false);

    // Action Sheet State
    const [selectedGem, setSelectedGem] = useState<any | null>(null);
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
                    sort_order: index,
                }));
                const { data: seeded, error: seedError } = await supabase
                    .from('categories')
                    .insert(seedData)
                    .select();
                return seeded || [];
            }
            return data;
        },
        enabled: !!user?.id,
    });

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([refetch(), refetchCollections(), refetchSmartCollections()]);
        setRefreshing(false);
    }, [refetch, refetchCollections, refetchSmartCollections]);

    // Derived filtering
    const filteredPages = useMemo(() => {
        if (!debouncedSearchQuery) return pages;
        const q = debouncedSearchQuery.toLowerCase();
        return pages.filter(p =>
            p.title.toLowerCase().includes(q) ||
            p.url.toLowerCase().includes(q) ||
            p.tags.some(t => t.toLowerCase().includes(q))
        );
    }, [pages, debouncedSearchQuery]);

    const activeCollection = useMemo(() => {
        if (!activeCategoryId) return null;
        return smartCollections.find(c => c.id === activeCategoryId);
    }, [smartCollections, activeCategoryId]);

    const activeCategoryPages = useMemo(() => {
        if (!activeCollection) return [];
        return pages.filter(p => p.tags.some(t => activeCollection.tags.includes(t.toUpperCase())));
    }, [pages, activeCollection]);

    // Handlers
    const handlePin = async (id: string, isPinned: boolean) => {
        const { error } = await supabase.from('pages').update({ is_pinned: isPinned }).eq('id', id);
        if (!error) queryClient.invalidateQueries({ queryKey: ['pages', user?.id] });
    };

    const handleArchive = async (id: string) => {
        const { error } = await supabase.from('pages').update({ is_archived: true }).eq('id', id);
        if (!error) queryClient.invalidateQueries({ queryKey: ['pages', user?.id] });
    };

    const handleDeleteForever = async (id: string) => {
        const { error } = await supabase.from('pages').delete().eq('id', id);
        if (!error) queryClient.invalidateQueries({ queryKey: ['pages', user?.id] });
    };

    const handleEditTagsTrigger = (id: string, tags: string[]) => {
        setSelectedGemId(id);
        setSelectedGemTags(tags);
        setQuickTagModalVisible(true);
    };

    const handleSaveTags = async (newTags: string[]) => {
        if (!selectedGemId) return;
        const { error } = await supabase.from('pages').update({ tags: newTags }).eq('id', selectedGemId);
        if (!error) {
            queryClient.invalidateQueries({ queryKey: ['pages', user?.id] });
            setQuickTagModalVisible(false);
        }
    };

    const handleGemOptions = (item: any) => {
        setSelectedGem(item);
        setActionSheetVisible(true);
    };

    const handleCreateCollection = () => {
        setEditingCollection(null);
        setCollectionModalVisible(true);
    };

    const openCollectionModal = (collection: CollectionData) => {
        setEditingCollection(collection);
        setCollectionModalVisible(true);
    };

    const handleSaveCollection = async (data: Partial<CollectionData>) => {
        if (editingCollection) {
            await supabase.from('folders').update(data).eq('id', editingCollection.id);
        } else {
            await supabase.from('folders').insert({ ...data, user_id: user?.id });
        }
        queryClient.invalidateQueries({ queryKey: ['folders', user?.id] });
        setCollectionModalVisible(false);
    };

    const handlePinCollection = async (id: string, isPinned: boolean) => {
        await supabase.from('folders').update({ is_pinned: isPinned }).eq('id', id);
        queryClient.invalidateQueries({ queryKey: ['folders', user?.id] });
    };

    const handleDeleteCollection = async (collectionId: string) => {
        Alert.alert(
            "Delete Collection",
            "Are you sure? The gems inside will remain in your library but will be uncollected.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        await supabase.from('pages').update({ folder_id: null }).eq('folder_id', collectionId);
                        await supabase.from('folders').delete().eq('id', collectionId);
                        queryClient.invalidateQueries({ queryKey: ['folders', user?.id] });
                        setCollectionModalVisible(false);
                    }
                }
            ]
        );
    };

    const handleLongPressCollection = (item: any) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        openCollectionModal(item);
    };

    const handleLongPressSmartCollection = (item: any) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setEditingSmartCollection(item);
        setSmartCollectionModalVisible(true);
    };

    const getIcon = (name: string, size: number, color: string) => {
        switch (name) {
            case 'Cooking': return <SelectionBackground size={size} color={color} weight="fill" />;
            case 'Baking': return <SelectionBackground size={size} color={color} weight="fill" />;
            case 'Tech': return <SelectionBackground size={size} color={color} weight="fill" />;
            case 'Health': return <SelectionBackground size={size} color={color} weight="fill" />;
            case 'Lifestyle': return <SelectionBackground size={size} color={color} weight="fill" />;
            case 'Professional': return <SelectionBackground size={size} color={color} weight="fill" />;
            default: return <Folder size={size} color={color} weight="fill" />;
        }
    };

    const getSmartCollectionCover = (targetTags: string[]) => {
        if (!pages || pages.length === 0) return null;
        const matchingGem = pages.find(p =>
            p.tags && p.tags.some(t => targetTags.includes(t.toUpperCase())) &&
            p.metadata?.image_url
        );
        return matchingGem?.metadata?.image_url;
    };

    const handleAddSmartCollectionGems = async (selectedIds: string[]) => {
        if (!editingSmartCollection) return;
        const targetTags = editingSmartCollection.tags;

        for (const id of selectedIds) {
            const page = pages.find(p => p.id === id);
            if (page) {
                const newTags = [...new Set([...page.tags, ...targetTags])];
                await supabase.from('pages').update({ tags: newTags }).eq('id', id);
            }
        }

        queryClient.invalidateQueries({ queryKey: ['pages', user?.id] });
        setGemPickerVisible(false);
    };

    if (activeCategoryId && activeCollection) {
        return (
            <ScreenWrapper edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => setActiveCategoryId(null)} style={styles.backButton}>
                        <CaretLeft size={24} color={colors.ink} />
                    </TouchableOpacity>
                    <Typography variant="h2">{activeCollection.name}</Typography>
                </View>

                <SiftFeed
                    pages={activeCategoryPages as any}
                    onPin={(id) => handlePin(id, true)}
                    onArchive={handleArchive}
                    onDeleteForever={handleDeleteForever}
                    onEditTags={handleEditTagsTrigger}
                    onOptions={handleGemOptions}
                    loading={false}
                    viewMode={viewMode}
                    ListHeaderComponent={() => (
                        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
                            <TouchableOpacity
                                style={[styles.addGemsButton, { backgroundColor: colors.paper, borderColor: colors.separator }]}
                                onPress={() => setGemPickerVisible(true)}
                            >
                                <Plus size={20} color={colors.ink} />
                                <Typography variant="body" style={{ marginLeft: 8 }}>Add Gems to this Collection</Typography>
                            </TouchableOpacity>
                        </View>
                    )}
                />

                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: COLORS.ink }]}
                    onPress={() => setGemPickerVisible(true)}
                >
                    <Plus size={28} color="white" weight="bold" />
                </TouchableOpacity>

                <SiftPickerModal
                    visible={gemPickerVisible}
                    onClose={() => setGemPickerVisible(false)}
                    onSelect={handleAddSmartCollectionGems}
                    currentFolderSiftIds={activeCategoryPages.map(p => p.id)}
                />
            </ScreenWrapper>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ScreenWrapper edges={['top']}>
                <View style={styles.header}>
                    <Typography variant="h1" style={{ fontFamily: 'PlayfairDisplay_700Bold' }}>Library</Typography>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity onPress={toggleViewMode}>
                            {viewMode === 'grid' ? <Rows size={24} color={colors.ink} /> : <SquaresFour size={24} color={colors.ink} />}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/settings')}>
                            <Gear size={24} color={colors.ink} />
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />}
                    contentContainerStyle={{ paddingBottom: 100 }}
                >
                    <View style={styles.searchContainer}>
                        <View style={[styles.searchInputWrapper, { backgroundColor: colors.paper }]}>
                            <MagnifyingGlass size={20} color={colors.stone} weight="bold" />
                            <TextInput
                                style={[styles.searchInput, { color: colors.ink }]}
                                placeholder="Search your collections..."
                                placeholderTextColor={colors.stone}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>
                    </View>

                    <View style={{ paddingHorizontal: 20 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.m }}>
                            <Typography variant="label" color="stone" style={{ letterSpacing: 1.5 }}>COLLECTIONS</Typography>
                            <TouchableOpacity onPress={handleCreateCollection}>
                                <Plus size={20} color={colors.ink} />
                            </TouchableOpacity>
                        </View>

                        {collections.length > 0 ? (
                            viewMode === 'grid' ? (
                                <View style={styles.collectionRow}>
                                    {collections.map((item: any, index: number) => (
                                        <MotiView
                                            key={item.id}
                                            from={{ opacity: 0, scale: 0.9, translateY: 10 }}
                                            animate={{ opacity: 1, scale: 1, translateY: 0 }}
                                            transition={{ type: 'timing', duration: 400, delay: index * 50 }}
                                            style={[
                                                styles.collectionTile,
                                                { width: TILE_WIDTH, marginLeft: index % 2 !== 0 ? 15 : 0 }
                                            ]}
                                        >
                                            <TouchableOpacity
                                                activeOpacity={0.7}
                                                style={{ alignItems: 'center', width: '100%' }}
                                                onPress={() => router.push(`/collection/${item.id}`)}
                                                onLongPress={() => handleLongPressCollection(item)}
                                            >
                                                <View style={styles.iconStackContainer}>
                                                    <View style={[styles.stackBack, { backgroundColor: item.color || colors.subtle, transform: [{ rotate: '-3deg' }, { translateX: -2 }] }]} />
                                                    <View style={[styles.stackMid, { backgroundColor: item.color || colors.subtle, transform: [{ rotate: '2deg' }, { translateX: 2 }] }]} />

                                                    <View style={[styles.iconContainer, { backgroundColor: item.color || colors.subtle }]}>
                                                        {getIcon(item.icon, 24, '#FFFFFF')}
                                                        {item.is_pinned && (
                                                            <View style={styles.pinIndicator}>
                                                                <Pin size={10} color={colors.ink} weight="fill" />
                                                            </View>
                                                        )}
                                                    </View>
                                                </View>
                                                <Typography variant="caption" style={styles.collectionName} numberOfLines={1}>
                                                    {item.name}
                                                </Typography>
                                            </TouchableOpacity>
                                        </MotiView>
                                    ))}
                                </View>
                            ) : (
                                <View style={styles.listContainer}>
                                    {collections.map((item: any, index: number) => (
                                        <MotiView
                                            key={item.id}
                                            from={{ opacity: 0, translateX: -10 }}
                                            animate={{ opacity: 1, translateX: 0 }}
                                            transition={{ type: 'timing', duration: 300, delay: index * 30 }}
                                        >
                                            <TouchableOpacity
                                                activeOpacity={0.7}
                                                style={[styles.listItem, { borderBottomColor: colors.separator }]}
                                                onPress={() => router.push(`/collection/${item.id}`)}
                                                onLongPress={() => handleLongPressCollection(item)}
                                            >
                                                <View style={[styles.listIconWrapper, { backgroundColor: item.color || colors.subtle }]}>
                                                    {getIcon(item.icon, 18, '#FFFFFF')}
                                                </View>
                                                <View style={styles.listItemText}>
                                                    <Typography variant="body" weight="600">{item.name}</Typography>
                                                    {item.is_pinned && <Pin size={12} color={colors.stone} weight="fill" />}
                                                </View>
                                                <CaretRight size={16} color={colors.stone} />
                                            </TouchableOpacity>
                                        </MotiView>
                                    ))}
                                </View>
                            )
                        ) : (
                            <EmptyState
                                type="no-collections"
                                title="No Collections"
                                description="Organize your gems into bespoke collections."
                                actionLabel="New Collection"
                                onAction={handleCreateCollection}
                            />
                        )}

                        <Typography variant="label" color="stone" style={[styles.sectionLabel, { marginTop: SPACING.l }]}>
                            SMART COLLECTIONS
                        </Typography>
                        <View style={viewMode === 'grid' ? styles.collectionRow : styles.listContainer}>
                            {smartCollections.map((item: any, index: number) => (
                                viewMode === 'grid' ? (
                                    <MotiView
                                        key={item.id}
                                        from={{ opacity: 0, scale: 0.9, translateY: 10 }}
                                        animate={{ opacity: 1, scale: 1, translateY: 0 }}
                                        transition={{ type: 'timing', duration: 400, delay: index * 50 + 200 }}
                                        style={[
                                            styles.collectionTile,
                                            { width: TILE_WIDTH, marginLeft: index % 2 !== 0 ? 15 : 0 }
                                        ]}
                                    >
                                        <TouchableOpacity
                                            activeOpacity={0.7}
                                            style={{ alignItems: 'center', width: '100%' }}
                                            onPress={() => setActiveCategoryId(item.id)}
                                            onLongPress={() => handleLongPressSmartCollection(item)}
                                        >
                                            <View style={styles.iconStackContainer}>
                                                <View style={[styles.stackBack, { backgroundColor: colors.subtle, opacity: 0.5 }]} />
                                                <View style={[styles.iconContainer, {
                                                    backgroundColor: colors.subtle,
                                                    borderStyle: 'dotted',
                                                    borderWidth: 1,
                                                    borderColor: colors.ink,
                                                    overflow: 'hidden'
                                                }]}>
                                                    {getSmartCollectionCover(item.tags) ? (
                                                        <>
                                                            <Image
                                                                source={{ uri: getSmartCollectionCover(item.tags) }}
                                                                style={StyleSheet.absoluteFill}
                                                                contentFit="cover"
                                                            />
                                                            <LinearGradient
                                                                colors={['transparent', 'rgba(0,0,0,0.5)']}
                                                                style={StyleSheet.absoluteFill}
                                                            />
                                                            {getIcon(item.icon, 20, '#FFFFFF')}
                                                        </>
                                                    ) : (
                                                        getIcon(item.icon, 24, colors.ink)
                                                    )}
                                                    <View style={styles.smartBadge}>
                                                        <Sparkle size={8} color={colors.paper} weight="fill" />
                                                    </View>
                                                </View>
                                            </View>
                                            <Typography variant="caption" style={styles.collectionName} numberOfLines={1}>
                                                {item.name}
                                            </Typography>
                                        </TouchableOpacity>
                                    </MotiView>
                                ) : (
                                    <MotiView
                                        key={item.id}
                                        from={{ opacity: 0, translateX: -10 }}
                                        animate={{ opacity: 1, translateX: 0 }}
                                        transition={{ type: 'timing', duration: 300, delay: index * 30 }}
                                    >
                                        <TouchableOpacity
                                            activeOpacity={0.7}
                                            style={[styles.listItem, { borderBottomColor: colors.separator }]}
                                            onPress={() => setActiveCategoryId(item.id)}
                                            onLongPress={() => handleLongPressSmartCollection(item)}
                                        >
                                            <View style={[styles.listIconWrapper, { backgroundColor: colors.subtle, borderStyle: 'dotted', borderWidth: 1, borderColor: colors.ink }]}>
                                                {getSmartCollectionCover(item.tags) ? (
                                                    <Image
                                                        source={{ uri: getSmartCollectionCover(item.tags) }}
                                                        style={StyleSheet.absoluteFill}
                                                        contentFit="cover"
                                                    />
                                                ) : (
                                                    getIcon(item.icon, 18, colors.ink)
                                                )}
                                                <View style={styles.smartBadgeList}>
                                                    <Sparkle size={6} color={colors.paper} weight="fill" />
                                                </View>
                                            </View>
                                            <View style={styles.listItemText}>
                                                <Typography variant="body" weight="600">{item.name}</Typography>
                                                <Typography variant="caption" color="stone">Smart Collection</Typography>
                                            </View>
                                            <CaretRight size={16} color={colors.stone} />
                                        </TouchableOpacity>
                                    </MotiView>
                                )
                            ))}
                        </View>
                    </View>
                </ScrollView>

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
                    sift={selectedGem}
                    onPin={(id) => handlePin(id, true)}
                    onArchive={handleArchive}
                    onEditTags={handleEditTagsTrigger}
                />

                <QuickTagEditor
                    visible={quickTagModalVisible}
                    onClose={() => setQuickTagModalVisible(false)}
                    onSave={handleSaveTags}
                    initialTags={selectedGemTags}
                />
            </ScreenWrapper>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
    },
    backButton: {
        marginRight: 16,
    },
    searchContainer: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 48,
        borderRadius: RADIUS.m,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
    },
    sectionLabel: {
        marginBottom: 12,
    },
    collectionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 20,
    },
    collectionTile: {
        marginBottom: 20,
        alignItems: 'center',
    },
    iconContainer: {
        width: TILE_WIDTH,
        height: TILE_WIDTH,
        borderRadius: RADIUS.l,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    collectionName: {
        marginTop: 8,
        fontSize: 12,
        fontWeight: '500',
    },
    pinIndicator: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(255,255,255,0.9)',
        padding: 4,
        borderRadius: 10,
        ...Theme.shadows.sharp,
    },
    iconStackContainer: {
        width: TILE_WIDTH,
        height: TILE_WIDTH,
        position: 'relative',
        justifyContent: 'center',
    },
    smartCollectionColumn: {
        width: '100%',
        gap: 16,
        marginBottom: 24,
    },
    listContainer: {
        width: '100%',
        marginBottom: 32,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    listIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.m,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        overflow: 'hidden',
    },
    listItemText: {
        flex: 1,
        gap: 2,
    },
    smartBadgeList: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        backgroundColor: COLORS.ink,
        padding: 2,
        borderRadius: 6,
        ...Theme.shadows.sharp,
    },
    heroName: {
        fontSize: 20,
        fontFamily: 'PlayfairDisplay_700Bold',
    },
    stackBack: {
        position: 'absolute',
        width: TILE_WIDTH * 0.9,
        height: TILE_WIDTH * 0.9,
        borderRadius: RADIUS.l,
        opacity: 0.3,
    },
    stackMid: {
        position: 'absolute',
        width: TILE_WIDTH * 0.95,
        height: TILE_WIDTH * 0.95,
        borderRadius: RADIUS.l,
        opacity: 0.5,
    },
    smartBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        backgroundColor: COLORS.ink,
        padding: 4,
        borderRadius: 10,
        ...Theme.shadows.soft,
    },
    addGemsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: RADIUS.m,
        borderWidth: 1,
        borderStyle: 'dashed',
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
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
});
