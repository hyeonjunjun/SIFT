import { View, ScrollView, RefreshControl, TextInput, TouchableOpacity, AppState, DeviceEventEmitter, Keyboard, StyleSheet, Alert, ActivityIndicator, Platform, Pressable } from "react-native";
import { useEffect, useCallback, useRef, useMemo, useState } from "react";
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import Animated, { LinearTransition } from "react-native-reanimated";
import {
    MagnifyingGlass, SquaresFour, Rows, XCircle, X, Archive, Trash, Plus, ImageSquare,
    ClockCounterClockwise, TextAa, Globe, House, User, Books, Fingerprint, FolderOpen
} from 'phosphor-react-native';
import { useRouter, useLocalSearchParams } from "expo-router";
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
import { SiftLimitTracker } from "../../components/SiftLimitTracker";
import { LimitReachedModal } from "../../components/modals/LimitReachedModal";
import { SiftActionSheet } from "../../components/modals/SiftActionSheet";
import { FirstUseTour } from "../../components/FirstUseTour";
import { useToast } from "../../context/ToastContext";
import { usePages, Page } from "../../hooks/usePages";
import { useSiftQueue } from "../../hooks/useSiftQueue";
import { useImageSifter } from "../../hooks/useImageSifter";
import { safeSift } from "../../lib/sift-api";
import { stripMarkdown } from "../../lib/utils";

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://sift-api.vercel.app';
import Constants from 'expo-constants';

export default function HomeScreen() {
    const { user, tier, profile, refreshProfile, loading: authLoading } = useAuth();
    const router = useRouter();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
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
        upgradeUrl,
        setUpgradeUrl
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

    // Clipboard Listener
    useEffect(() => {
        const checkClipboard = async () => {
            const content = await Clipboard.getStringAsync();
            if (content?.startsWith('http') && content !== manualUrl) {
                setManualUrl(content);
            }
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

            <View style={styles.actionRow}>
                <View style={styles.inputWrapper}>
                    <TouchableOpacity onPress={pickAndSift} style={styles.iconButton}>
                        <ImageSquare size={20} color={COLORS.stone} />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.textInput}
                        placeholder="sift a link or image here!"
                        placeholderTextColor={COLORS.stone}
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
                    onPress={() => {
                        triggerHaptic('selection');
                        setViewMode(v => v === 'grid' ? 'list' : 'grid');
                    }}
                    style={styles.viewToggle}
                >
                    {viewMode === 'grid' ? <Rows size={20} color={COLORS.ink} /> : <SquaresFour size={20} color={COLORS.ink} />}
                </TouchableOpacity>
            </View>

            {/* Daily Catch Up */}
            {activeFilter === 'All' && searchQuery === '' && dailySifts.length > 0 && (
                <View style={styles.catchUpContainer}>
                    <Typography variant="label" color="stone" style={styles.sectionLabel}>DAILY CATCH UP</Typography>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catchUpList}>
                        {dailySifts.map((sift) => (
                            <TouchableOpacity
                                key={sift.id}
                                onPress={() => router.push(`/page/${sift.id}?contextType=feed`)}
                                style={styles.catchUpCard}
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

            {activeFilter === 'All' && searchQuery === '' && (
                <Typography variant="label" color="stone" style={[styles.sectionLabel, { marginTop: SPACING.m }]}>RECENTLY SIFTED</Typography>
            )}

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <MagnifyingGlass size={18} color={COLORS.stone} weight="bold" />
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

            {/* Sort Toggle */}
            <View style={styles.sortRow}>
                <TouchableOpacity
                    onPress={() => {
                        triggerHaptic('impact');
                        const modes: ('date' | 'title' | 'domain')[] = ['date', 'title', 'domain'];
                        updateSortBy(modes[(modes.indexOf(sortBy) + 1) % modes.length]);
                    }}
                    activeOpacity={0.7}
                >
                    <Animated.View
                        layout={LinearTransition.springify().damping(18).stiffness(150)}
                        style={styles.sortBadge}
                    >
                        {sortBy === 'date' ? (
                            <ClockCounterClockwise size={14} color={COLORS.stone} weight="bold" />
                        ) : sortBy === 'title' ? (
                            <TextAa size={14} color={COLORS.stone} weight="bold" />
                        ) : (
                            <Globe size={14} color={COLORS.stone} weight="bold" />
                        )}
                        <Typography variant="caption" color="stone" style={styles.sortText}>
                            {sortBy === 'date' ? 'NEWEST' : sortBy === 'title' ? 'A→Z' : 'DOMAIN'}
                        </Typography>
                    </Animated.View>
                </TouchableOpacity>
            </View>

            <SiftLimitTracker />
        </View>
    ), [pages, user, tier, manualUrl, searchQuery, activeFilter, isSiftingImage, dailySifts, sortBy, viewMode, isProcessingQueue]);

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
        paddingBottom: SPACING.s,
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
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionLabel: {
        letterSpacing: 1.5,
        fontSize: 10,
        fontWeight: '700',
        marginBottom: SPACING.xs,
    },
    catchUpContainer: {
        marginTop: SPACING.s,
    },
    catchUpList: {
        gap: 12,
        paddingRight: 20,
    },
    catchUpCard: {
        width: 240,
        backgroundColor: COLORS.paper,
        borderRadius: RADIUS.l,
        padding: SPACING.m,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        ...Theme.shadows.soft
    },
    catchUpTitle: {
        fontWeight: '600',
        marginBottom: 4,
    },
    catchUpSummary: {
        lineHeight: 16,
    },
    searchContainer: {
        marginTop: SPACING.xs,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.paper,
        borderRadius: RADIUS.l,
        paddingHorizontal: SPACING.m,
        height: 52,
        borderWidth: 1,
        borderColor: COLORS.separator,
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
        marginTop: -SPACING.xs,
    },
    sortBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: COLORS.paper,
        borderRadius: RADIUS.pill,
        borderWidth: 1,
        borderColor: COLORS.separator,
        ...Theme.shadows.soft,
    },
    sortText: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.5,
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
