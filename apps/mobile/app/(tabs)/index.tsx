import { View, ScrollView, RefreshControl, TextInput, TouchableOpacity, AppState, DeviceEventEmitter, Keyboard, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useEffect, useCallback, useRef, useMemo, useState } from "react";
import * as Haptics from 'expo-haptics';
import { MagnifyingGlass, SquaresFour, Rows, XCircle, X, Archive, Trash, Plus, ImageSquare } from 'phosphor-react-native';
import { supabase } from "../../lib/supabase";
import { Typography } from "../../components/design-system/Typography";
import { COLORS, SPACING, RADIUS, Theme } from "../../lib/theme";
import { FilterBar } from "../../components/home/FilterBar";
import SiftFeed from "../../components/SiftFeed";
import ScreenWrapper from "../../components/ScreenWrapper";
import { QuickTagEditor } from "../../components/QuickTagEditor";
import { EmptyState } from "../../components/design-system/EmptyState";
import { useRouter } from "expo-router";
import { useAuth } from "../../lib/auth";
import { usePages, Page } from "../../hooks/usePages";
import { useSiftQueue } from "../../hooks/useSiftQueue";
import { HomeHeader } from "../../components/home/HomeHeader";
import { SiftLimitTracker } from "../../components/SiftLimitTracker";
import { LimitReachedModal } from "../../components/modals/LimitReachedModal";
import { ActionSheet } from "../../components/modals/ActionSheet";
import { SiftActionSheet } from "../../components/modals/SiftActionSheet";
import { FirstUseTour } from "../../components/FirstUseTour";
import { useToast } from "../../context/ToastContext";
import { useImageSifter } from "../../hooks/useImageSifter";
import * as Clipboard from 'expo-clipboard';

export default function HomeScreen() {
    const { user, tier, profile, refreshProfile, loading: authLoading } = useAuth();
    const router = useRouter();
    const { showToast } = useToast();
    const [refreshing, setRefreshing] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const scrollViewRef = useRef<ScrollView>(null);
    const inputRef = useRef<TextInput>(null);

    // Modular Hooks
    const {
        pages,
        filteredPages,
        dynamicTags,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
        refetch,
        searchQuery,
        setSearchQuery,
        activeFilter,
        setActiveFilter,
        sortBy,
        updateSortBy
    } = usePages();

    const {
        addToQueue,
        manualUrl,
        setManualUrl,
        handleSubmitUrl,
        isProcessingQueue,
        limitReachedVisible,
        setLimitReachedVisible,
        upgradeUrl
    } = useSiftQueue();

    // Image Sifting
    const { pickAndSift, loading: isSiftingImage } = useImageSifter(() => refetch());

    // Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const isSelectMode = selectedIds.size > 0;

    // Modals & Sheets
    const [quickTagModalVisible, setQuickTagModalVisible] = useState(false);
    const [selectedSiftId, setSelectedSiftId] = useState<string | null>(null);
    const [selectedSiftTags, setSelectedSiftTags] = useState<string[]>([]);
    const [siftActionSheetVisible, setSiftActionSheetVisible] = useState(false);
    const [selectedSift, setSelectedSift] = useState<any>(null);
    const [addMenuVisible, setAddMenuVisible] = useState(false);

    // Sync state
    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('scrollToTopDashboard', () => {
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
            Haptics.selectionAsync();
        });
        return () => sub.remove();
    }, []);

    // Clipboard Listener
    useEffect(() => {
        const checkClipboard = async () => {
            const content = await Clipboard.getStringAsync();
            if (content?.startsWith('http') && content !== manualUrl) {
                // We'll just set it in the box for the user, not auto-sift
                setManualUrl(content);
            }
        };
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') checkClipboard();
        });
        checkClipboard();
        return () => sub.remove();
    }, [manualUrl, setManualUrl]);

    // Refresh Handler
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await Promise.all([refetch(), refreshProfile()]);
        setRefreshing(false);
    }, [refetch, refreshProfile]);

    // Actions
    const handlePin = async (id: string) => {
        try {
            const page = pages.find(p => p.id === id);
            if (!page) return;
            const { error } = await supabase.from('pages').update({ is_pinned: !page.is_pinned }).eq('id', id);
            if (error) throw error;
            refetch();
        } catch (e) {
            showToast({ message: "Action failed" });
        }
    };

    const handleArchive = async (id: string) => {
        const { error } = await supabase.from('pages').update({ is_archived: true }).eq('id', id);
        if (!error) {
            refetch();
            showToast("Moved to Archive");
        }
    };

    const handleDeleteForever = async (id: string) => {
        const { error } = await supabase.from('pages').delete().eq('id', id);
        if (!error) {
            refetch();
            showToast("Permanently Deleted");
        }
    };

    const handleSiftOptions = (item: any) => {
        setSelectedSift(item);
        setSiftActionSheetVisible(true);
    };

    // Render Helpers
    const ListHeader = useMemo(() => (
        <View style={styles.headerContainer}>
            <HomeHeader user={user} tier={tier} pagesCount={pages.length} />

            <View style={styles.actionRow}>
                <View style={styles.inputWrapper}>
                    <TouchableOpacity onPress={pickAndSift} style={styles.iconButton}>
                        <ImageSquare size={20} color={COLORS.stone} />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.textInput}
                        placeholder="paste a link to sift..."
                        value={manualUrl}
                        onChangeText={setManualUrl}
                        onSubmitEditing={handleSubmitUrl}
                    />
                    <TouchableOpacity onPress={handleSubmitUrl} style={styles.submitButton}>
                        {isProcessingQueue || isSiftingImage ? (
                            <ActivityIndicator size="small" color={COLORS.ink} />
                        ) : (
                            <Plus size={20} color={COLORS.ink} weight="bold" />
                        )}
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    onPress={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
                    style={styles.viewToggle}
                >
                    {viewMode === 'grid' ? <Rows size={20} color={COLORS.ink} /> : <SquaresFour size={20} color={COLORS.ink} />}
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <MagnifyingGlass size={18} color={COLORS.stone} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search your library..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery("")}>
                            <XCircle size={18} color={COLORS.stone} weight="fill" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <FilterBar
                filters={[{ id: 'All', text: 'All' }, ...dynamicTags.map(t => ({ id: t, text: t }))]}
                activeFilter={activeFilter}
                onSelect={setActiveFilter}
            />

            <View style={styles.sortRow}>
                <TouchableOpacity
                    onPress={() => {
                        const modes: ('date' | 'title' | 'domain')[] = ['date', 'title', 'domain'];
                        updateSortBy(modes[(modes.indexOf(sortBy) + 1) % modes.length]);
                    }}
                    style={styles.sortBadge}
                >
                    <Typography variant="caption" color="stone" style={styles.sortText}>
                        {sortBy === 'date' ? '↓ NEWEST' : sortBy === 'title' ? 'A→Z' : '🌐 DOMAIN'}
                    </Typography>
                </TouchableOpacity>
            </View>

            <SiftLimitTracker />
        </View>
    ), [user, tier, pages.length, manualUrl, searchQuery, activeFilter, sortBy, dynamicTags, viewMode, isProcessingQueue, isSiftingImage]);

    return (
        <ScreenWrapper edges={['top']}>
            <SiftFeed
                pages={filteredPages as any}
                onPin={handlePin}
                onArchive={handleArchive}
                onDeleteForever={handleDeleteForever}
                onEditTags={(id, tags) => {
                    setSelectedSiftId(id);
                    setSelectedSiftTags(tags);
                    setQuickTagModalVisible(true);
                }}
                onOptions={handleSiftOptions}
                loading={isLoading}
                ListHeaderComponent={ListHeader}
                ListEmptyComponent={
                    <EmptyState
                        type={searchQuery ? 'no-results' : 'no-sifts'}
                        title={searchQuery ? "No sifts found" : "Your library is empty"}
                        description={searchQuery ? `We couldn't find "${searchQuery}"` : "Paste a link or scan a photo to start sifting."}
                    />
                }
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                viewMode={viewMode}
                onEndReached={() => hasNextPage && fetchNextPage()}
                isSelectMode={isSelectMode}
                selectedIds={selectedIds}
                onToggleSelect={(id) => {
                    setSelectedIds(prev => {
                        const next = new Set(prev);
                        if (next.has(id)) next.delete(id);
                        else next.add(id);
                        return next;
                    });
                }}
                onEnterSelectMode={(id) => setSelectedIds(new Set([id]))}
            />

            {/* Batch Toolbar */}
            {isSelectMode && (
                <View style={[styles.batchToolbar, { backgroundColor: COLORS.ink }]}>
                    <TouchableOpacity onPress={() => setSelectedIds(new Set())}>
                        <X size={20} color="#FFF" weight="bold" />
                    </TouchableOpacity>
                    <Typography variant="label" style={{ color: '#FFF', marginLeft: 12 }}>
                        {selectedIds.size} selected
                    </Typography>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity onPress={async () => {
                        for (const id of Array.from(selectedIds)) await handleArchive(id);
                        setSelectedIds(new Set());
                    }} style={styles.batchAction}>
                        <Archive size={18} color="#FFF" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Modals */}
            <QuickTagEditor
                visible={quickTagModalVisible}
                onClose={() => setQuickTagModalVisible(false)}
                onSave={async (tags) => {
                    if (selectedSiftId) {
                        await supabase.from('pages').update({ tags }).eq('id', selectedSiftId);
                        refetch();
                        setQuickTagModalVisible(false);
                    }
                }}
                initialTags={selectedSiftTags}
            />

            <SiftActionSheet
                visible={siftActionSheetVisible}
                onClose={() => setSiftActionSheetVisible(false)}
                sift={selectedSift}
                onPin={handlePin}
                onArchive={handleArchive}
                onDeleteForever={handleDeleteForever}
            />

            <LimitReachedModal
                visible={limitReachedVisible}
                onClose={() => setLimitReachedVisible(false)}
                upgradeUrl={upgradeUrl}
            />

            <FirstUseTour />
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    headerContainer: {
        paddingHorizontal: SPACING.m,
        gap: SPACING.m,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.s,
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.m,
        paddingHorizontal: SPACING.s,
        height: 52,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    iconButton: {
        padding: SPACING.xs,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        color: COLORS.text,
        paddingHorizontal: SPACING.xs,
    },
    submitButton: {
        padding: SPACING.s,
    },
    viewToggle: {
        width: 52,
        height: 52,
        borderRadius: RADIUS.m,
        backgroundColor: COLORS.subtle,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        marginTop: SPACING.xs,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: RADIUS.l,
        paddingHorizontal: SPACING.m,
        height: 52,
        ...Theme.shadows.soft,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: COLORS.text,
        marginLeft: SPACING.s,
    },
    sortRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: -SPACING.s,
    },
    sortBadge: {
        backgroundColor: COLORS.subtle,
        paddingHorizontal: SPACING.s,
        paddingVertical: 4,
        borderRadius: RADIUS.pill,
    },
    sortText: {
        fontSize: 10,
        fontWeight: '700',
    },
    batchToolbar: {
        position: 'absolute',
        bottom: 40,
        left: SPACING.m,
        right: SPACING.m,
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.m,
        borderRadius: RADIUS.m,
        ...Theme.shadows.medium,
    },
    batchAction: {
        padding: SPACING.s,
    }
});
