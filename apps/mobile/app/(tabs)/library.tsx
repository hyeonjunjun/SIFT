import * as React from 'react';
import { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import { View, TextInput, ScrollView, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, RefreshControl, Alert, Pressable, ActionSheetIOS, Modal, Platform } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
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
    Sparkle,
    ListDashes,
    FolderOpen,
    FolderStar,
    Heart,
    Star,
    BookmarkSimple,
    Lightning,
    Fire,
    Coffee,
    GameController,
    MusicNote,
    Camera,
    Palette,
    Book,
    Briefcase,
    GraduationCap,
    Trophy,
    Target,
    Lightbulb,
    Rocket,
    CookingPot,
    Leaf,
    Monitor,
    Barbell,
    Airplane,
    Martini
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
import { useToast } from '../../context/ToastContext';
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

// Assuming CollectionData is defined in CollectionModal.tsx,
// but for the purpose of this file, we'll extend its properties here
// based on the instruction.
declare module '../../components/modals/CollectionModal' {
    interface CollectionData {
        image_url?: string;
    }
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
    const { showToast } = useToast();
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [activeView, setActiveView] = useState<'personal' | 'shared'>('personal');
    const [isReordering, setIsReordering] = useState(false);
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
    const [localCollections, setLocalCollections] = useState<CollectionData[]>([]);

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
                console.error('Error fetching sifts:', error);
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
        data: collectionsData,
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

    const collections = collectionsData || [];

    // Fetch Shared Collections
    const {
        data: sharedFoldersData,
        refetch: refetchSharedFolders,
    } = useQuery({
        queryKey: ['shared_folders', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            try {
                const { data, error } = await supabase
                    .from('folder_members')
                    .select('folder:folder_id(*)')
                    .eq('user_id', user.id);

                if (error) {
                    console.warn('Shared folders query error:', error.message);
                    return [];
                }

                // Extract folder objects and filter out those owned by the user
                const mapped = data.map((d: any) => d.folder).filter(Boolean) as CollectionData[];
                return mapped.filter((f: any) => f.user_id !== user.id);
            } catch (e) {
                console.warn('Shared collections query failed:', e);
                return [];
            }
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 5,
        retry: 2,
    });

    const sharedFolders = sharedFoldersData || [];

    // Sync local collections with query data
    useEffect(() => {
        if (collectionsData) {
            setLocalCollections(collectionsData);
        }
    }, [collectionsData]);

    // Update sort order mutation
    const updateSortOrderMutation = useMutation({
        mutationFn: async (updatedFolders: CollectionData[]) => {
            const updates = updatedFolders.map((folder, index) => ({
                ...folder,
                sort_order: index,
            }));

            const { error } = await supabase
                .from('folders')
                .upsert(updates, { onConflict: 'id' });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['folders', user?.id] });
        },
        onError: (error: any) => {
            console.error('Error updating sort order:', error);
            showToast('Failed to save order');
        }
    });

    const onDragEnd = async ({ data }: { data: CollectionData[] }) => {
        setLocalCollections(data);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        updateSortOrderMutation.mutate(data);
    };

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
        await Promise.all([refetch(), refetchCollections(), refetchSmartCollections(), refetchSharedFolders()]);
        setRefreshing(false);
    }, [refetch, refetchCollections, refetchSmartCollections, refetchSharedFolders]);

    const displayCollections = activeView === 'personal' ? localCollections : sharedFolders;

    // Derived filtering
    const filteredPages = useMemo(() => {
        if (!debouncedSearchQuery) return pages;
        const q = debouncedSearchQuery.trim();
        const lowerQ = q.toLowerCase();

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
        if (isUuid) {
            const exactMatch = pages.find(p => p.id === q);
            if (exactMatch) return [exactMatch];
        }

        return pages.filter(p =>
            p.title.toLowerCase().includes(lowerQ) ||
            p.url.toLowerCase().includes(lowerQ) ||
            (p.tags && p.tags.some(t => t.toLowerCase().includes(lowerQ)))
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
        setSelectedSiftId(id);
        setSelectedSiftTags(tags);
        setQuickTagModalVisible(true);
    };

    const handleSaveTags = async (newTags: string[]) => {
        if (!selectedSiftId) return;
        const { error } = await supabase.from('pages').update({ tags: newTags }).eq('id', selectedSiftId);
        if (!error) {
            queryClient.invalidateQueries({ queryKey: ['pages', user?.id] });
            setQuickTagModalVisible(false);
            showToast("Tags updated successfully!");
        } else {
            showToast({ message: "Failed to update tags.", type: 'error' });
        }
    };

    const handleSiftOptions = (item: any) => {
        setSelectedSift(item);
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
        const { id, ...updateData } = data;
        if (editingCollection) {
            const { error } = await supabase
                .from('folders')
                .update({ ...updateData, image_url: data.image_url || null })
                .eq('id', editingCollection.id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('folders')
                .insert({ ...updateData, user_id: user?.id, image_url: data.image_url || null });
            if (error) throw error;
        }
        queryClient.invalidateQueries({ queryKey: ['folders', user?.id] });
        setEditingCollection(null);
        setCollectionModalVisible(false);
    };

    const handlePinCollection = async (id: string, isPinned: boolean) => {
        await supabase.from('folders').update({ is_pinned: isPinned }).eq('id', id);
        queryClient.invalidateQueries({ queryKey: ['folders', user?.id] });
    };

    const handleDeleteCollection = async (collectionId: string) => {
        Alert.alert(
            "Delete Collection",
            "Are you sure? The sifts inside will remain in your library but will be uncollected.",
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
                        showToast("Collection deleted");
                    }
                }
            ]
        );
    };

    const handleLongPressCollection = (item: any) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setEditingCollection(item);
        setCategoryActionSheetVisible(true);
    };

    const handleLongPressSmartCollection = (item: any) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setEditingSmartCollection(item);
        setSmartCollectionModalVisible(true);
    };

    const handleSaveSmartCollection = async (data: SmartCollectionData) => {
        const { id, ...updateData } = data;
        if (id) {
            const { error } = await supabase
                .from('categories')
                .update(updateData)
                .eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('categories')
                .insert({ ...updateData, user_id: user?.id });
            if (error) throw error;
        }
        queryClient.invalidateQueries({ queryKey: ['categories', user?.id] });
        setEditingSmartCollection(null);
        setSmartCollectionModalVisible(false);
    };

    const handleDeleteSmartCollection = async (id: string) => {
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['categories', user?.id] });
    };

    const iconMap: Record<string, any> = {
        Folder, FolderOpen, FolderStar, Heart, Star, BookmarkSimple,
        Lightning, Fire, Sparkle, Coffee, GameController, MusicNote,
        Camera, Palette, Book, Briefcase, GraduationCap, Trophy,
        Target, Lightbulb, Rocket, CookingPot, Leaf, Monitor, Barbell, Airplane, Martini
    };

    const getIcon = (name: string, size: number, color: string) => {
        const IconComponent = iconMap[name] || Folder;
        return <IconComponent size={size} color={color} weight="fill" />;
    };

    const getSmartCollectionCover = (item: any) => {
        if (item.image_url) return item.image_url;
        if (!pages || pages.length === 0) return null;
        const matchingSift = pages.find(p =>
            p.tags && p.tags.some(t => item.tags.includes(t.toUpperCase())) &&
            p.metadata?.image_url
        );
        return matchingSift?.metadata?.image_url;
    };

    const handleAddSmartCollectionSifts = async (selectedIds: string[]) => {
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
        setSiftPickerVisible(false);
    };



    const ListEmptyComponent = useMemo(() => {
        if (searchQuery) return <EmptyState type="no-results" title="No results found" description={`We couldn't find any sifts matching "${searchQuery}"`} />;

        if (activeCategoryId) {
            return <EmptyState
                type="no-sifts"
                title="Empty Collection"
                description="No sifts found in this collection."
                actionLabel="Add Sift"
                onAction={() => router.push('/')}
            />;
        }

        return <EmptyState
            type="no-sifts"
            title="Start Sifting"
            description="Your library is empty. Sift content to see it here."
            actionLabel="Start Sifting"
            onAction={() => router.push('/')}
        />;
    }, [searchQuery, activeCategoryId]);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ScreenWrapper edges={['top']}>
                {activeCategoryId && activeCollection ? (
                    <>
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
                            onOptions={handleSiftOptions}
                            loading={false}
                            viewMode={viewMode}
                            ListHeaderComponent={() => (
                                <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
                                    <TouchableOpacity
                                        style={[styles.addSiftsButton, { backgroundColor: colors.paper, borderColor: colors.separator }]}
                                        onPress={() => setSiftPickerVisible(true)}
                                    >
                                        <Plus size={20} color={colors.ink} />
                                        <Typography variant="body" style={{ marginLeft: 8 }}>Add Sifts to this Collection</Typography>
                                    </TouchableOpacity>
                                </View>
                            )}
                        />

                        <TouchableOpacity
                            style={[styles.fab, { backgroundColor: COLORS.ink }]}
                            onPress={() => setSiftPickerVisible(true)}
                        >
                            <Plus size={28} color="white" weight="bold" />
                        </TouchableOpacity>

                        <SiftPickerModal
                            visible={siftPickerVisible}
                            onClose={() => setSiftPickerVisible(false)}
                            onSelect={handleAddSmartCollectionSifts}
                            currentCollectionSiftIds={activeCategoryPages.map(p => p.id)}
                        />
                    </>
                ) : (
                    <>
                        <View style={styles.header}>
                            <Typography variant="h1" style={{ fontFamily: 'PlayfairDisplay_700Bold', fontSize: 36 }}>Library</Typography>
                            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                                {isReordering ? (
                                    <TouchableOpacity onPress={() => setIsReordering(false)}>
                                        <Typography variant="label" color="ink" style={{ fontWeight: '700', letterSpacing: 1 }}>DONE</Typography>
                                    </TouchableOpacity>
                                ) : (
                                    <>
                                        {activeView === 'personal' && (
                                            <TouchableOpacity onPress={() => { setIsReordering(true); setViewMode('list'); }}>
                                                <ListDashes size={24} color={colors.ink} />
                                            </TouchableOpacity>
                                        )}
                                        <TouchableOpacity onPress={toggleViewMode}>
                                            {viewMode === 'grid' ? <Rows size={24} color={colors.ink} /> : <SquaresFour size={24} color={colors.ink} />}
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => router.push('/settings')}>
                                            <Gear size={24} color={colors.ink} />
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                        </View>
                        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderRadius: RADIUS.pill, padding: 4, alignSelf: 'flex-start' }}>
                                <TouchableOpacity
                                    style={[{ paddingHorizontal: 16, paddingVertical: 6, borderRadius: RADIUS.pill }, activeView === 'personal' && { backgroundColor: colors.paper, ...Theme.shadows.soft }]}
                                    onPress={() => { setActiveView('personal'); Haptics.selectionAsync(); }}
                                >
                                    <Typography variant="caption" style={{ fontSize: 13, color: activeView === 'personal' ? colors.ink : colors.stone, fontWeight: activeView === 'personal' ? '600' : '400' }}>Personal</Typography>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[{ paddingHorizontal: 16, paddingVertical: 6, borderRadius: RADIUS.pill }, activeView === 'shared' && { backgroundColor: colors.paper, ...Theme.shadows.soft }]}
                                    onPress={() => { setActiveView('shared'); Haptics.selectionAsync(); }}
                                >
                                    <Typography variant="caption" style={{ fontSize: 13, color: activeView === 'shared' ? colors.ink : colors.stone, fontWeight: activeView === 'shared' ? '600' : '400' }}>Shared</Typography>
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
                                    <Typography variant="label" color="stone" style={{ letterSpacing: 1.5 }}>
                                        {activeView === 'shared' ? 'SHARED WITH ME' : 'COLLECTIONS'}
                                    </Typography>
                                    <TouchableOpacity onPress={handleCreateCollection} style={{ opacity: activeView === 'shared' ? 0 : 1 }} disabled={activeView === 'shared'}>
                                        <Plus size={20} color={colors.ink} />
                                    </TouchableOpacity>
                                </View>

                                {displayCollections.length > 0 ? (
                                    viewMode === 'grid' ? (
                                        <View style={styles.collectionRow}>
                                            {displayCollections.map((item: any, index: number) => (
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
                                                            <View style={[styles.stackBack, { backgroundColor: item.color || colors.stone, transform: [{ rotate: '-3deg' }, { translateX: -2 }] }]} />
                                                            <View style={[styles.stackMid, { backgroundColor: item.color || colors.stone, transform: [{ rotate: '2deg' }, { translateX: 2 }] }]} />

                                                            <View style={[styles.iconContainer, { backgroundColor: item.color || colors.stone, overflow: 'hidden' }]}>
                                                                {item.image_url ? (
                                                                    <>
                                                                        <Image
                                                                            source={{ uri: item.image_url }}
                                                                            style={StyleSheet.absoluteFill}
                                                                            contentFit="cover"
                                                                        />
                                                                        <LinearGradient
                                                                            colors={['transparent', 'rgba(0,0,0,0.5)']}
                                                                            style={StyleSheet.absoluteFill}
                                                                        />
                                                                        <View style={{ position: 'absolute' }}>
                                                                            {getIcon(item.icon, 20, '#FFFFFF')}
                                                                        </View>
                                                                    </>
                                                                ) : (
                                                                    getIcon(item.icon, 24, '#FFFFFF')
                                                                )}
                                                                {item.is_pinned && (
                                                                    <View style={styles.pinIndicator}>
                                                                        <Pin size={10} color={colors.ink} weight="fill" />
                                                                    </View>
                                                                )}
                                                            </View>

                                                            {activeView === 'personal' && (
                                                                <TouchableOpacity
                                                                    style={styles.gridSettingsButton}
                                                                    onPress={(e) => {
                                                                        e.stopPropagation();
                                                                        handleLongPressCollection(item);
                                                                    }}
                                                                    hitSlop={8}
                                                                >
                                                                    <DotsThree size={20} color="#FFFFFF" weight="bold" />
                                                                </TouchableOpacity>
                                                            )}
                                                        </View>
                                                        <Typography variant="caption" style={styles.collectionName} numberOfLines={1}>
                                                            {item.name}
                                                        </Typography>
                                                    </TouchableOpacity>
                                                </MotiView>
                                            ))}
                                        </View>
                                    ) : (
                                        <View style={{ height: displayCollections.length * 64, marginHorizontal: -20 }}>
                                            <DraggableFlatList
                                                data={displayCollections}
                                                onDragEnd={onDragEnd}
                                                keyExtractor={(item) => item.id}
                                                scrollEnabled={false}
                                                renderItem={({ item, drag, isActive }: RenderItemParams<CollectionData>) => (
                                                    <ScaleDecorator>
                                                        <TouchableOpacity
                                                            activeOpacity={0.7}
                                                            onLongPress={drag}
                                                            disabled={isActive}
                                                            style={[
                                                                styles.listItem,
                                                                {
                                                                    borderBottomColor: colors.separator,
                                                                    backgroundColor: isActive ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)') : 'transparent',
                                                                    paddingHorizontal: 20,
                                                                }
                                                            ]}
                                                            onPress={() => router.push(`/collection/${item.id}`)}
                                                        >
                                                            <View style={[styles.listIconWrapper, { backgroundColor: item.color || colors.stone }]}>
                                                                {item.image_url ? (
                                                                    <>
                                                                        <Image
                                                                            source={{ uri: item.image_url }}
                                                                            style={StyleSheet.absoluteFill}
                                                                            contentFit="cover"
                                                                        />
                                                                        <LinearGradient
                                                                            colors={['transparent', 'rgba(0,0,0,0.3)']}
                                                                            style={StyleSheet.absoluteFill}
                                                                        />
                                                                    </>
                                                                ) : (
                                                                    getIcon(item.icon, 18, '#FFFFFF')
                                                                )}
                                                            </View>
                                                            <View style={styles.listItemText}>
                                                                <Typography variant="body" weight="600">{item.name}</Typography>
                                                                {item.is_pinned && <Pin size={12} color={colors.stone} weight="fill" />}
                                                            </View>
                                                            {activeView === 'personal' && (
                                                                <TouchableOpacity
                                                                    onPress={(e) => {
                                                                        e.stopPropagation();
                                                                        handleLongPressCollection(item);
                                                                    }}
                                                                    style={{ padding: 8 }}
                                                                >
                                                                    <DotsThreeVertical size={16} color={colors.stone} weight="bold" />
                                                                </TouchableOpacity>
                                                            )}
                                                        </TouchableOpacity>
                                                    </ScaleDecorator>
                                                )}
                                            />
                                        </View>
                                    )
                                ) : (
                                    <EmptyState
                                        type="no-collections"
                                        title={activeView === 'shared' ? "No Shared Collections" : "No Collections"}
                                        description={activeView === 'shared' ? "Collections your friends share with you will appear here." : "Organize your sifts into bespoke collections."}
                                        actionLabel={activeView === 'shared' ? undefined : "New Collection"}
                                        onAction={activeView === 'shared' ? undefined : handleCreateCollection}
                                    />
                                )}
                            </View>

                            {activeView === 'personal' && (
                                <View style={{ marginTop: SPACING.xl, paddingHorizontal: 20 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.m }}>
                                        <Typography variant="label" color="stone" style={{ letterSpacing: 1.5 }}>
                                            SMART COLLECTIONS
                                        </Typography>
                                        <TouchableOpacity onPress={() => { setEditingSmartCollection(null); setSmartCollectionModalVisible(true); }}>
                                            <Plus size={20} color={colors.ink} />
                                        </TouchableOpacity>
                                    </View>
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
                                                            <View style={[
                                                                styles.iconContainer,
                                                                {
                                                                    backgroundColor: item.color || colors.subtle,
                                                                    overflow: 'hidden'
                                                                }
                                                            ]}>
                                                                {getSmartCollectionCover(item) ? (
                                                                    <>
                                                                        <Image
                                                                            source={{ uri: getSmartCollectionCover(item) }}
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
                                                                    getIcon(item.icon, 24, item.color ? '#FFFFFF' : colors.ink)
                                                                )}
                                                                <View style={styles.smartBadge}>
                                                                    <Sparkle size={8} color={colors.paper} weight="fill" />
                                                                </View>
                                                            </View>

                                                            <TouchableOpacity
                                                                style={styles.gridSettingsButton}
                                                                onPress={(e) => {
                                                                    e.stopPropagation();
                                                                    handleLongPressSmartCollection(item);
                                                                }}
                                                                hitSlop={8}
                                                            >
                                                                <DotsThree size={20} color="#FFFFFF" weight="bold" />
                                                            </TouchableOpacity>
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
                                                        style={[
                                                            styles.listItem,
                                                            {
                                                                borderBottomColor: colors.separator,
                                                                paddingHorizontal: 0,
                                                            }
                                                        ]}
                                                        onPress={() => setActiveCategoryId(item.id)}
                                                    >
                                                        <View style={[styles.listIconWrapper, { backgroundColor: item.color || colors.subtle, borderStyle: item.color ? 'solid' : 'dotted', borderWidth: 1, borderColor: item.color || colors.ink }]}>
                                                            {getSmartCollectionCover(item) ? (
                                                                <>
                                                                    <Image
                                                                        source={{ uri: getSmartCollectionCover(item) }}
                                                                        style={StyleSheet.absoluteFill}
                                                                        contentFit="cover"
                                                                    />
                                                                    <LinearGradient
                                                                        colors={['transparent', 'rgba(0,0,0,0.5)']}
                                                                        style={StyleSheet.absoluteFill}
                                                                    />
                                                                    {getIcon(item.icon, 18, '#FFFFFF')}
                                                                </>
                                                            ) : (
                                                                getIcon(item.icon, 18, item.color ? '#FFFFFF' : colors.ink)
                                                            )}
                                                            <View style={styles.smartBadgeList}>
                                                                <Sparkle size={8} color={colors.paper} weight="fill" />
                                                            </View>
                                                        </View>
                                                        <View style={styles.listItemText}>
                                                            <Typography variant="body" weight="600">{item.name}</Typography>
                                                            <Typography variant="caption" color="stone">Smart Collection</Typography>
                                                        </View>
                                                        <TouchableOpacity
                                                            onPress={(e) => {
                                                                e.stopPropagation();
                                                                handleLongPressSmartCollection(item);
                                                            }}
                                                            style={{ padding: 8 }}
                                                        >
                                                            <DotsThreeVertical size={16} color={colors.stone} weight="bold" />
                                                        </TouchableOpacity>
                                                    </TouchableOpacity>
                                                </MotiView>
                                            )
                                        ))}
                                    </View>
                                </View>
                            )}
                        </ScrollView>
                    </>
                )}

                <CollectionModal
                    visible={collectionModalVisible}
                    onClose={() => {
                        setCollectionModalVisible(false);
                        setEditingCollection(null);
                    }}
                    onSave={handleSaveCollection}
                    onDelete={handleDeleteCollection}
                    onPin={handlePinCollection}
                    existingCollection={editingCollection}
                />

                <SmartCollectionModal
                    visible={smartCollectionModalVisible}
                    onClose={() => setSmartCollectionModalVisible(false)}
                    onSave={handleSaveSmartCollection}
                    onDelete={handleDeleteSmartCollection}
                    existingCollection={editingSmartCollection}
                />

                <SiftActionSheet
                    visible={actionSheetVisible}
                    onClose={() => setActionSheetVisible(false)}
                    sift={selectedSift}
                    onPin={(id) => handlePin(id, true)}
                    onArchive={handleArchive}
                    onDeleteForever={handleDeleteForever}
                    onEditTags={handleEditTagsTrigger}
                />

                <ActionSheet
                    visible={categoryActionSheetVisible}
                    onClose={() => setCategoryActionSheetVisible(false)}
                    title={editingCollection?.name || "Collection Options"}
                    options={[
                        {
                            label: 'Edit Details',
                            onPress: () => {
                                setTimeout(() => {
                                    setCollectionModalVisible(true);
                                }, 200);
                            }
                        },
                        {
                            label: editingCollection?.is_pinned ? 'Unpin Collection' : 'Pin Collection',
                            onPress: () => {
                                if (editingCollection) handlePinCollection(editingCollection.id, !editingCollection.is_pinned);
                            }
                        },
                        {
                            label: 'Delete Collection',
                            isDestructive: true,
                            onPress: () => {
                                if (editingCollection) handleDeleteCollection(editingCollection.id);
                            }
                        },
                        {
                            label: 'Cancel',
                            isCancel: true,
                            onPress: () => { }
                        }
                    ]}
                />

                <QuickTagEditor
                    visible={quickTagModalVisible}
                    onClose={() => setQuickTagModalVisible(false)}
                    onSave={handleSaveTags}
                    initialTags={selectedSiftTags}
                />
            </ScreenWrapper >
        </GestureHandlerRootView >
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
        left: 8,
        backgroundColor: 'rgba(255,255,255,0.9)',
        padding: 4,
        borderRadius: 10,
        ...Theme.shadows.sharp,
    },
    gridSettingsButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
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
    addSiftsButton: {
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
