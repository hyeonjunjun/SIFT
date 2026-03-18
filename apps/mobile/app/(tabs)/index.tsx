import { View, ScrollView, RefreshControl, TextInput, TouchableOpacity, AppState, DeviceEventEmitter, Keyboard, StyleSheet, Alert, ActivityIndicator, Platform } from "react-native";
import { useEffect, useCallback, useRef, useMemo, useState } from "react";
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import Animated, { LinearTransition, FadeIn, FadeOut } from "react-native-reanimated";
import {
    MagnifyingGlass, SquaresFour, Rows, XCircle, X, Archive, Plus, ImageSquare,
    ClockCounterClockwise, TextAa, Globe
} from 'phosphor-react-native';
import { useRouter } from "expo-router";
import { useQueryClient } from '@tanstack/react-query';

import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { Typography } from "../../components/design-system/Typography";
import { COLORS, SPACING, RADIUS, Theme } from "../../lib/theme";
import { FilterBar } from "../../components/home/FilterBar";
import SiftFeed from "../../components/SiftFeed";
import ScreenWrapper from "../../components/ScreenWrapper";
import { QuickTagEditor } from "../../components/QuickTagEditor";
import { EmptyState } from "../../components/design-system/EmptyState";
import { HomeHeader } from "../../components/home/HomeHeader";
import { UsageTracker } from "../../components/UsageTracker";
import { LimitReachedModal } from "../../components/modals/LimitReachedModal";
import { SiftActionSheet } from "../../components/modals/SiftActionSheet";
import { ImagePreviewModal } from "../../components/modals/ImagePreviewModal";
import { FolderPickerModal } from "../../components/modals/FolderPickerModal";
import { FirstUseTour } from "../../components/FirstUseTour";
import { useToast } from "../../context/ToastContext";
import { usePages, Page } from "../../hooks/usePages";
import { useSiftQueue } from "../../hooks/useSiftQueue";
import { useImageSifter } from "../../hooks/useImageSifter";
import { safeSift } from "../../lib/sift-api";
import { stripMarkdown } from "../../lib/utils";
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://sift-api.vercel.app';

export default function HomeScreen() {
    const { user, tier, profile, refreshProfile, loading: authLoading } = useAuth();
    const router = useRouter();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const [refreshing, setRefreshing] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const scrollViewRef = useRef<ScrollView>(null);

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
        upgradeUrl,
        setUpgradeUrl
    } = useSiftQueue();

    // Image Sifting
    const {
        pickImages,
        selectedImages,
        previewVisible,
        removeImage,
        dismissPreview,
        confirmAndSift,
        loading: isSiftingImage
    } = useImageSifter(() => refetch());

    // Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const isSelectMode = selectedIds.size > 0;

    // Modals & Sheets
    const [quickTagModalVisible, setQuickTagModalVisible] = useState(false);
    const [selectedSiftId, setSelectedSiftId] = useState<string | null>(null);
    const [selectedSiftTags, setSelectedSiftTags] = useState<string[]>([]);
    const [siftActionSheetVisible, setSiftActionSheetVisible] = useState(false);
    const [selectedSift, setSelectedSift] = useState<any>(null);
    const [folderPickerVisible, setFolderPickerVisible] = useState(false);
    const [moveToCollectionSiftId, setMoveToCollectionSiftId] = useState<string | null>(null);

    // Haptic Helper
    const triggerHaptic = (type: 'impact' | 'notification' | 'selection', styleOrType?: any) => {
        if (type === 'impact') Haptics.impactAsync(styleOrType || Haptics.ImpactFeedbackStyle.Light);
        else if (type === 'notification') Haptics.notificationAsync(styleOrType || Haptics.NotificationFeedbackType.Success);
        else Haptics.selectionAsync();
    };

    // Scroll to Top Listener
    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('scrollToTopDashboard', () => {
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
            triggerHaptic('selection');
        });
        return () => sub.remove();
    }, []);

    // Clipboard Auto-Detect Banner
    const [clipboardUrl, setClipboardUrl] = useState<string | null>(null);
    const dismissedClipboardUrls = useRef<Set<string>>(new Set());

    useEffect(() => {
        const checkClipboard = async () => {
            try {
                const content = await Clipboard.getStringAsync();
                if (
                    content?.startsWith('http') &&
                    content !== manualUrl &&
                    !dismissedClipboardUrls.current.has(content)
                ) {
                    setClipboardUrl(content);
                } else {
                    setClipboardUrl(null);
                }
            } catch {}
        };
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') checkClipboard();
        });
        checkClipboard();
        return () => sub.remove();
    }, [manualUrl]);

    // Realtime Subscription
    useEffect(() => {
        if (!user?.id) return;

        const subscription = supabase
            .channel('public:pages')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pages' }, async (payload) => {
                const newRecord = payload.new as any;
                const oldRecord = payload.old as any;

                if (payload.eventType === 'INSERT') {
                    if (newRecord.user_id !== user.id) return;
                    queryClient.invalidateQueries({ queryKey: ['pages'] });
                    triggerHaptic('notification');
                    setManualUrl(prev => prev.trim() === newRecord.url?.trim() ? "" : prev);
                } else if (payload.eventType === 'UPDATE') {
                    if (newRecord.user_id !== user.id) return;

                    const statusChanged = newRecord.metadata?.status === 'completed' && oldRecord.metadata?.status !== 'completed';
                    if (statusChanged) {
                        queryClient.invalidateQueries({ queryKey: ['pages'] });
                        triggerHaptic('notification');
                    }
                } else if (payload.eventType === 'DELETE') {
                    queryClient.invalidateQueries({ queryKey: ['pages'] });
                }
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [user?.id]);

    // Refresh Handler
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        triggerHaptic('impact', Haptics.ImpactFeedbackStyle.Medium);
        await Promise.all([refetch(), refreshProfile()]);
        setRefreshing(false);
        triggerHaptic('notification');
    }, [refetch, refreshProfile]);

    const handleRetry = async (id: string, url: string) => {
        if (!user) return;
        triggerHaptic('impact');
        showToast({ message: "Retrying..." });

        await supabase.from('pages').update({ metadata: { status: 'pending' } }).eq('id', id);
        queryClient.invalidateQueries({ queryKey: ['pages'] });

        try {
            await safeSift(url, user.id, id, tier);
        } catch (apiError: any) {
            if (apiError.status === 'limit_reached') {
                setUpgradeUrl(apiError.upgrade_url);
                setLimitReachedVisible(true);
                triggerHaptic('notification', Haptics.NotificationFeedbackType.Error);
            } else {
                await supabase.from('pages').update({
                    metadata: { status: 'failed', error: apiError.message }
                }).eq('id', id);
                queryClient.invalidateQueries({ queryKey: ['pages'] });
            }
        }
    };

    const handleArchive = async (id: string) => {
        if (!user?.id) return;
        triggerHaptic('impact');

        try {
            // Optimistic
            queryClient.setQueryData(['pages'], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((group: Page[]) => group.filter(p => p.id !== id))
                };
            });

            await supabase.from('pages').update({ is_archived: true }).eq('id', id);
            showToast({ message: "Moved to Archive" });
            triggerHaptic('notification');
        } catch (e) {
            queryClient.invalidateQueries({ queryKey: ['pages'] });
        }
    };

    const handleDeleteForever = async (id: string) => {
        if (!user?.id) return;
        triggerHaptic('impact');

        try {
            queryClient.setQueryData(['pages'], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((group: Page[]) => group.filter(p => p.id !== id))
                };
            });

            await supabase.from('pages').delete().eq('id', id);
            showToast({ message: "Permanently Deleted" });
            triggerHaptic('notification');
        } catch (e) {
            queryClient.invalidateQueries({ queryKey: ['pages'] });
        }
    };

    const handlePin = async (id: string) => {
        const page = pages.find(p => p.id === id);
        if (!page) return;
        triggerHaptic('selection');
        await supabase.from('pages').update({ is_pinned: !page.is_pinned }).eq('id', id);
        refetch();
    };

    const handleMoveToCollection = async (folderId: string) => {
        if (!moveToCollectionSiftId) return;
        try {
            await supabase.from('pages').update({ folder_id: folderId }).eq('id', moveToCollectionSiftId);
            showToast({ message: "Moved to collection" });
            triggerHaptic('notification');
            refetch();
            queryClient.invalidateQueries({ queryKey: ['folder-pages', folderId] });
        } catch {
            showToast({ message: "Failed to move sift", type: 'error' });
        }
        setMoveToCollectionSiftId(null);
    };

    const handleSiftOptions = (item: any) => {
        setSelectedSift(item);
        setSiftActionSheetVisible(true);
    };

    // Daily Catch Up Logic (Last 24h completed sifts)
    const dailySifts = useMemo(() => {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return pages
            .filter(p => p.metadata?.status === 'completed' && new Date(p.created_at) > yesterday)
            .slice(0, 5);
    }, [pages]);

    const ListHeader = useMemo(() => (
        <View style={styles.headerContainer}>
            <HomeHeader user={user} tier={tier} pagesCount={pages.length} />

            {/* Omni-Action Hero Card */}
            <View style={styles.omniActionCard}>
                <View style={styles.inputWrapper}>
                    <TouchableOpacity onPress={pickImages} style={styles.iconButton}>
                        <ImageSquare size={22} color={COLORS.stone} />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Paste a link to sift..."
                        placeholderTextColor={COLORS.stone}
                        value={manualUrl}
                        onChangeText={setManualUrl}
                        onSubmitEditing={handleSubmitUrl}
                        returnKeyType="go"
                    />
                    <TouchableOpacity
                        onPress={handleSubmitUrl}
                        style={[styles.submitButton, manualUrl.length > 0 ? styles.submitButtonActive : null]}
                    >
                        {isProcessingQueue || isSiftingImage ? (
                            <ActivityIndicator size="small" color={manualUrl.length > 0 ? '#FFF' : COLORS.ink} />
                        ) : (
                            <Plus size={20} color={manualUrl.length > 0 ? '#FFF' : COLORS.ink} weight="bold" />
                        )}
                    </TouchableOpacity>
                </View>
                <UsageTracker variant="compact" showUpgradeButton={false} />
            </View>

            {/* Clipboard Auto-Detect Banner */}
            {clipboardUrl && (
                <Animated.View
                    entering={FadeIn.duration(300)}
                    exiting={FadeOut.duration(200)}
                    style={styles.clipboardBanner}
                >
                    <View style={styles.clipboardContent}>
                        <Globe size={16} color={COLORS.accent} />
                        <Typography variant="caption" color="stone" numberOfLines={1} style={styles.clipboardUrl}>
                            {clipboardUrl.replace(/^https?:\/\/(www\.)?/, '')}
                        </Typography>
                    </View>
                    <View style={styles.clipboardActions}>
                        <TouchableOpacity
                            onPress={() => {
                                dismissedClipboardUrls.current.add(clipboardUrl);
                                setClipboardUrl(null);
                            }}
                            hitSlop={8}
                        >
                            <X size={16} color={COLORS.stone} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                triggerHaptic('impact');
                                addToQueue(clipboardUrl);
                                dismissedClipboardUrls.current.add(clipboardUrl);
                                setClipboardUrl(null);
                            }}
                            style={styles.clipboardSiftButton}
                        >
                            <Typography variant="label" style={{ color: '#FFF', fontSize: 12 }}>Sift</Typography>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            )}

            {/* Daily Catch Up */}
            {searchQuery === '' && dailySifts.length > 0 && (
                <View style={[styles.catchUpSection, { marginHorizontal: -SPACING.m }]}>
                    <Typography
                        variant="caption"
                        color="stone"
                        style={[styles.editorialLabel, { paddingHorizontal: SPACING.m }]}
                    >
                        DAILY CATCH UP
                    </Typography>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={[styles.catchUpList, { paddingHorizontal: SPACING.m }]}
                        snapToInterval={260 + SPACING.s} // card width + gap
                        decelerationRate="fast"
                    >
                        {dailySifts.map((sift) => (
                            <TouchableOpacity
                                key={sift.id}
                                onPress={() => router.push(`/page/${sift.id}?contextType=feed`)}
                                style={styles.catchUpCard}
                                activeOpacity={0.8}
                            >
                                <Typography variant="body" style={styles.catchUpTitle} numberOfLines={2}>
                                    {sift.title}
                                </Typography>
                                <Typography variant="caption" color="stone" numberOfLines={2} style={styles.catchUpSummary}>
                                    {stripMarkdown(sift.summary) || "No summary available."}
                                </Typography>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Unified Control Center */}
            <View style={styles.controlCenter}>
                {activeFilter === 'All' && searchQuery === '' && (
                    <Typography
                        variant="caption"
                        color="stone"
                        style={[styles.editorialLabel, { marginBottom: SPACING.m }]}
                    >
                        LIBRARY
                    </Typography>
                )}

                {/* Search, Sort & View Controls Row */}
                <View style={styles.searchRow}>
                    <View style={styles.searchBar}>
                        <MagnifyingGlass size={18} color={COLORS.stone} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search everything..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor={COLORS.stone}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery("")}>
                                <XCircle size={18} color={COLORS.stone} weight="fill" />
                            </TouchableOpacity>
                        )}
                    </View>
                    <TouchableOpacity
                        onPress={() => {
                            triggerHaptic('impact');
                            const modes: ('date' | 'title' | 'domain')[] = ['date', 'title', 'domain'];
                            updateSortBy(modes[(modes.indexOf(sortBy) + 1) % modes.length]);
                        }}
                        activeOpacity={0.7}
                        style={styles.sortButton}
                    >
                        <Animated.View layout={LinearTransition.springify().damping(18).stiffness(150)}>
                            {sortBy === 'date' ? (
                                <ClockCounterClockwise size={18} color={COLORS.ink} weight="bold" />
                            ) : sortBy === 'title' ? (
                                <TextAa size={18} color={COLORS.ink} weight="bold" />
                            ) : (
                                <Globe size={18} color={COLORS.ink} weight="bold" />
                            )}
                        </Animated.View>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            triggerHaptic('selection');
                            setViewMode(v => v === 'grid' ? 'list' : 'grid');
                        }}
                        style={styles.viewToggle}
                    >
                        {viewMode === 'grid' ? <Rows size={18} color={COLORS.ink} /> : <SquaresFour size={18} color={COLORS.ink} />}
                    </TouchableOpacity>
                </View>

                {/* Filters Row */}
                <FilterBar
                    filters={[{ id: 'All', text: 'All' }, ...dynamicTags.map(t => ({ id: t, text: t }))]}
                    activeFilter={activeFilter}
                    onSelect={setActiveFilter}
                />
            </View>

        </View>
    ), [pages, user, tier, manualUrl, searchQuery, activeFilter, isSiftingImage, dailySifts, sortBy, viewMode, isProcessingQueue, clipboardUrl]);

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
                onRetry={handleRetry}
                loading={isLoading}
                ListHeaderComponent={ListHeader}
                ListEmptyComponent={
                    <View style={{ paddingTop: 40 }}>
                        <EmptyState
                            type={searchQuery ? 'no-results' : 'no-sifts'}
                            title={searchQuery ? "No sifts found" : "Your library is empty"}
                            description={searchQuery ? `We couldn't find "${searchQuery}"` : "Paste a link or scan a photo to start sifting."}
                        />
                    </View>
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
                onEnterSelectMode={(id) => {
                    triggerHaptic('impact', Haptics.ImpactFeedbackStyle.Heavy);
                    setSelectedIds(new Set([id]));
                }}
            />

            {/* Batch Toolbar */}
            {isSelectMode && (
                <View style={[styles.batchToolbar, { backgroundColor: COLORS.ink }]}>
                    <TouchableOpacity onPress={() => setSelectedIds(new Set())}>
                        <X size={20} color="#FFF" weight="bold" />
                    </TouchableOpacity>
                    <Typography variant="label" style={{ color: '#FFF', marginLeft: SPACING.s }}>
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
                        triggerHaptic('notification');
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
                onEditTags={(id, tags) => {
                    setSelectedSiftId(id);
                    setSelectedSiftTags(tags);
                    setQuickTagModalVisible(true);
                }}
                onMoveToCollection={(id) => {
                    setMoveToCollectionSiftId(id);
                    setFolderPickerVisible(true);
                }}
                onSelectMultiple={(id) => {
                    triggerHaptic('impact', Haptics.ImpactFeedbackStyle.Heavy);
                    setSelectedIds(new Set([id]));
                }}
            />

            <FolderPickerModal
                visible={folderPickerVisible}
                onClose={() => setFolderPickerVisible(false)}
                onSelect={handleMoveToCollection}
            />

            <LimitReachedModal
                visible={limitReachedVisible}
                onClose={() => setLimitReachedVisible(false)}
                upgradeUrl={upgradeUrl}
            />

            <ImagePreviewModal
                visible={previewVisible}
                images={selectedImages}
                onRemove={removeImage}
                onDismiss={dismissPreview}
                onConfirm={confirmAndSift}
            />

            <FirstUseTour />
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    headerContainer: {
        // No paddingHorizontal - FlashList contentContainerStyle provides 20pt padding
        paddingBottom: SPACING.xs,
        gap: SPACING.m, // Reduced gap to tighten hierarchy
    },
    omniActionCard: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.l,
        padding: SPACING.xs,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...Theme.shadows.soft, // Softer shadow to reduce prominence
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 48, // Reduced height to be less prominent
        paddingHorizontal: SPACING.s,
    },
    iconButton: {
        padding: SPACING.xs,
        marginRight: 4,
    },
    textInput: {
        flex: 1,
        fontFamily: 'Satoshi-Medium',
        fontSize: 15, // Matches bodyMedium from typography scale
        color: COLORS.text,
        paddingHorizontal: SPACING.xs,
    },
    submitButton: {
        padding: SPACING.s,
        borderRadius: RADIUS.m,
        backgroundColor: COLORS.paper,
        borderWidth: 1,
        borderColor: COLORS.separator,
    },
    submitButtonActive: {
        backgroundColor: COLORS.ink,
        borderColor: COLORS.ink,
    },
    editorialLabel: {
        fontFamily: 'GeistMono_400Regular',
        letterSpacing: 2,
        fontSize: 10, // Intentionally small for editorial caps
        opacity: 0.6,
        marginBottom: SPACING.s,
    },
    catchUpSection: {
        // Removed marginTop, leaning on parent gap: SPACING.l
    },
    catchUpList: {
        gap: SPACING.s,
        paddingBottom: SPACING.s, // Padding for shadow drop
    },
    catchUpCard: {
        width: 260,
        minHeight: 110, // Let height flow automatically
        backgroundColor: COLORS.paper,
        borderRadius: RADIUS.l,
        padding: SPACING.m,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
        justifyContent: 'center',
        ...Theme.shadows.soft
    },
    catchUpTitle: {
        fontFamily: 'Satoshi-Bold',
        fontSize: 15, // Matches bodyMedium base size
        marginBottom: SPACING.xs,
        color: COLORS.ink,
    },
    catchUpSummary: {
        lineHeight: 18,
        opacity: 0.8,
    },
    controlCenter: {
        // Removed marginTop, relying on parent padding/gap
        paddingBottom: SPACING.s,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.s,
        marginBottom: SPACING.m,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.m,
        paddingHorizontal: SPACING.m,
        height: 48,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    searchInput: {
        flex: 1,
        fontFamily: 'Satoshi-Medium',
        fontSize: 15, // Matches bodyMedium
        color: COLORS.text,
        marginLeft: SPACING.s,
    },
    sortButton: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.m,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    viewToggle: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.m,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
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
    },
    clipboardBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.m,
        paddingVertical: SPACING.s,
        paddingHorizontal: SPACING.m,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...Theme.shadows.soft,
    },
    clipboardContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.s,
        marginRight: SPACING.s,
    },
    clipboardUrl: {
        flex: 1,
        fontFamily: 'Satoshi-Medium',
        fontSize: 13,
    },
    clipboardActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.m,
    },
    clipboardSiftButton: {
        backgroundColor: COLORS.ink,
        paddingHorizontal: SPACING.m,
        paddingVertical: 6,
        borderRadius: RADIUS.pill,
    },
});
