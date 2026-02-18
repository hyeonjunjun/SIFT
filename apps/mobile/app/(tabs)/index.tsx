import { Platform, View, ScrollView, RefreshControl, TextInput, TouchableOpacity, AppState, DeviceEventEmitter, Pressable, Keyboard, StyleSheet, Alert, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Archive, Plus, House, User, MagnifyingGlass, SquaresFour, Rows, Books, Fingerprint, ImageSquare, XCircle, Trash } from 'phosphor-react-native';
import { supabase } from "../../lib/supabase";
import { Toast } from "../../components/Toast";
import { Typography } from "../../components/design-system/Typography";
import { COLORS, SPACING, Theme, RADIUS } from "../../lib/theme";
import { API_URL } from "../../lib/config";
import { HeroCarousel } from "../../components/home/HeroCarousel";
import { FilterBar } from "../../components/home/FilterBar";
import SiftFeed from "../../components/SiftFeed";
import ScreenWrapper from "../../components/ScreenWrapper";
import { QuickTagEditor } from "../../components/QuickTagEditor";
import { EmptyState } from "../../components/design-system/EmptyState";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useShareIntent } from 'expo-share-intent';
import { safeSift } from "../../lib/sift-api";
import { getDomain } from "../../lib/utils";
import { useImageSifter } from "../../hooks/useImageSifter";
import Fuse from "fuse.js";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { SiftLimitTracker } from "../../components/SiftLimitTracker";
import { LimitReachedModal } from "../../components/modals/LimitReachedModal";
import { ActionSheet } from "../../components/modals/ActionSheet";
import { SiftActionSheet } from "../../components/modals/SiftActionSheet";
import { useToast } from "../../context/ToastContext";
import { useIsFocused } from '@react-navigation/native';

interface Page {
    id: string;
    title: string;
    summary: string;
    tags: string[];
    created_at: string;
    url: string;
    is_pinned?: boolean;
    metadata?: {
        image_url?: string;
    };
}

const ALLOWED_TAGS = ["Cooking", "Baking", "Tech", "Health", "Lifestyle", "Professional"];

import { useAuth } from "../../lib/auth";
import { useDebounce } from "../../hooks/useDebounce";
import { useSubscription } from "../../hooks/useSubscription";

export default function HomeScreen() {
    const { user, tier, profile, loading: authLoading, refreshProfile } = useAuth(); // Get authenticated user
    const { isOverLimit } = useSubscription();
    const queryClient = useQueryClient();
    const isFocused = useIsFocused();
    const { showToast } = useToast();
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    const PAGE_SIZE = 20;

    const {
        data,
        isLoading,
        fetchStatus,
        refetch,
        isFetchingNextPage,
        fetchNextPage,
        hasNextPage
    } = useInfiniteQuery({
        queryKey: ['pages', user?.id, tier],
        queryFn: async ({ pageParam = 0 }) => {
            if (!user) return [];

            const from = pageParam * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;

            // console.log(`[Fetch] Fetching pages ${from}-${to} for user: ${user.id}`);

            const { data, error } = await supabase
                .from('pages')
                .select('id, title, summary, tags, created_at, url, is_pinned, metadata')
                .eq('user_id', user.id)
                .neq('is_archived', true)
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;
            return (data || []) as Page[];
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            if (!lastPage || !Array.isArray(lastPage)) return undefined;
            if (!allPages || !Array.isArray(allPages)) return undefined;
            return lastPage.length === PAGE_SIZE ? allPages.length : undefined;
        },
        enabled: !!user,
        staleTime: 1000 * 60, // 1 minute
        retry: 2,
    });

    const pages = useMemo(() => {
        if (!data || !data.pages || !Array.isArray(data.pages)) return [];
        try {
            return data.pages.flat() || [];
        } catch {
            return [];
        }
    }, [data]);

    const loading = isLoading; // Map to existing variable for compatibility


    // Quick Tag Modal State
    const [quickTagModalVisible, setQuickTagModalVisible] = useState(false);
    const [selectedSiftId, setSelectedSiftId] = useState<string | null>(null);
    const [selectedSiftTags, setSelectedSiftTags] = useState<string[]>([]);

    const [manualUrl, setManualUrl] = useState("");
    const lastCheckedUrl = useRef<string | null>(null);
    const processingUrls = useRef<Set<string>>(new Set());
    const inputRef = useRef<TextInput>(null);
    const scrollViewRef = useRef<ScrollView>(null);

    const { hasShareIntent, shareIntent: intent, resetShareIntent } = useShareIntent();
    const [activeFilter, setActiveFilter] = useState("All");
    const [queue, setQueue] = useState<string[]>([]);
    const [isProcessingQueue, setIsProcessingQueue] = useState(false);
    const router = useRouter();
    const params = useLocalSearchParams();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Visual Sifter Hook
    const { pickAndSift, loading: isSiftingImage } = useImageSifter(() => {
        onRefresh(); // Refresh feed after successful upload
    });

    // Local Settings Cache
    const [hapticsEnabled, setHapticsEnabled] = useState(true);
    const [autoClipboardEnabled, setAutoClipboardEnabled] = useState(true);

    const loadSettings = useCallback(async () => {
        try {
            const h = await AsyncStorage.getItem('settings_haptics');
            const c = await AsyncStorage.getItem('settings_clipboard');
            if (h !== null) setHapticsEnabled(h === 'true');
            if (c !== null) setAutoClipboardEnabled(c === 'true');
        } catch (e) { }
    }, []);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    // Haptic Helper
    const triggerHaptic = useCallback((type: 'selection' | 'impact' | 'notification', style?: Haptics.ImpactFeedbackStyle | Haptics.NotificationFeedbackType) => {
        if (!hapticsEnabled) return;
        if (type === 'selection') Haptics.selectionAsync();
        else if (type === 'impact') Haptics.impactAsync(style as Haptics.ImpactFeedbackStyle || Haptics.ImpactFeedbackStyle.Light);
        else if (type === 'notification') Haptics.notificationAsync(style as Haptics.NotificationFeedbackType || Haptics.NotificationFeedbackType.Success);
    }, [hapticsEnabled]);

    const [limitReachedVisible, setLimitReachedVisible] = useState(false);
    const [upgradeUrl, setUpgradeUrl] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (params.siftUrl) {
            const url = decodeURIComponent(params.siftUrl as string);
            addToQueue(url);
            router.setParams({ siftUrl: undefined });
        }
    }, [params.siftUrl]);

    // Fuse.js Fuzzy Search Setup
    const fuse = useMemo(() => {
        return new Fuse(pages, {
            keys: ['title', 'summary', 'tags', 'url'],
            threshold: 0.35,
            ignoreLocation: true
        });
    }, [pages]);

    const filteredPages = useMemo(() => {
        let results = pages;

        // 1. Apply Search Filter
        if (debouncedSearchQuery.trim()) {
            const q = debouncedSearchQuery.trim();
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);

            if (isUuid) {
                const exactMatch = pages.find(p => p.id === q);
                if (exactMatch) return [exactMatch];
            }

            results = fuse.search(q).map(r => r.item);
        }

        // 2. Apply Category Filter
        if (activeFilter !== 'All') {
            results = results.filter(p => p.tags?.some(t => t && t.toLowerCase() === activeFilter.toLowerCase()));
        }

        // 3. Sort (Pinned first, then date)
        return [...results].sort((a, b) => {
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;
            const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return timeB - timeA;
        });
    }, [pages, debouncedSearchQuery, activeFilter, fuse]);


    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "good morning";
        if (hour < 18) return "good afternoon";
        return "good evening";
    };

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('scrollToTopDashboard', () => {
            if (scrollViewRef.current) {
                scrollViewRef.current.scrollTo({ y: 0, animated: true });
                triggerHaptic('selection');
            }
        });
        return () => sub.remove();
    }, []);





    const addToQueue = useCallback((urlOrText: string) => {
        if (!urlOrText || typeof urlOrText !== 'string') return;

        // Handle potential multi-line paste
        const lines = urlOrText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);

        for (const url of lines) {
            const cleanUrl = url.trim();
            // 1. Proactive check if already sifting this url in this session
            if (processingUrls.current.has(cleanUrl)) {
                // console.log(`[QUEUE] Skipping duplicate: ${cleanUrl}`);
                continue;
            }

            const currentUserId = user?.id;
            // console.log(`[QUEUE] Adding URL: ${cleanUrl} (User: ${currentUserId || 'GUEST'})`);
            setQueue(prev => [...prev, cleanUrl]);
            lastCheckedUrl.current = cleanUrl;
        }
    }, [user?.id]);

    const checkClipboard = useCallback(async () => {
        if (!autoClipboardEnabled) return; // RESPECT SETTING

        try {
            // ONLY check clipboard when explicitly focused or fresh launch
            // We rely on AppState change for this.

            // Check if we have permission first (implied by just calling it, but we handle error)
            const content = await Clipboard.getStringAsync();
            if (!content) return;

            const isUrl = content.startsWith('http://') || content.startsWith('https://');

            // STRICT DUPLICATE CHECK: 
            // 1. Must be a URL
            // 2. Must not be the same as the last one we automatically grabbed
            // 3. Must not be currently processing
            if (isUrl && content !== lastCheckedUrl.current && !processingUrls.current.has(content)) {
                // console.log(`[Clipboard] Auto-detected URL: ${content}`);
                lastCheckedUrl.current = content;

                // UX FIX: Simply fill the input, do NOT auto-submit immediately to avoid "double popup" fatigue
                // unless it is a deep link. 
                // Wait, user asked to simplify "pasting process". 
                // Let's Auto-Sift but silently, without the extra toast if possible, 
                // OR just pre-fill it.

                // User said: "simplify the pasting process so the user is not dealing with 2 popups"
                // The iOS "Allow Paste" popup is unavoidable if we access clipboard automatically.
                // The second popup is our "Processing..." toast.
                // Solution: We will keep auto-sift but remove our Toast since the UI updates optimistically anyway.

                // UX FIX: Simply fill the input, do NOT auto-submit.
                // User explicitly requested: "only when i press the sift button"

                setManualUrl(content);
                // addToQueue(content); <-- REMOVED

                // Optional: distinct feedback that we found a link but didn't sift it yet?
                // Haptics.selectionAsync(); 
            }
        } catch (e) {
            // Silently fail if clipboard permission denied
        }
    }, [addToQueue]);


    useEffect(() => {
        if (queue.length > 0 && !isProcessingQueue) {
            processQueue();
        }
    }, [queue, isProcessingQueue]);

    const processQueue = useCallback(async () => {
        if (queue.length === 0 || isProcessingQueue) return;
        setIsProcessingQueue(true);

        const urlsToProcess = [...queue];
        setQueue([]);

        const count = urlsToProcess.length;
        if (count > 1) {
            showToast({ message: `Sifting ${count} sifts...`, duration: 2000 });
        } else {
            showToast({ message: "Sifting...", duration: 1500 });
        }


        // PHASE 1: Optimistic Inserts (Parallel)
        const tasks = await Promise.all(urlsToProcess.map(async (url) => {
            if (processingUrls.current.has(url)) return null;
            processingUrls.current.add(url);

            try {
                const domain = getDomain(url);
                const { data: pendingData, error } = await supabase
                    .from('pages')
                    .insert({
                        user_id: user?.id,
                        url,
                        title: "Sifting Sift...",
                        summary: "Synthesizing content...",
                        tags: ["Lifestyle"],
                        metadata: { status: 'pending', source: domain }
                    })
                    .select()
                    .single();

                if (error) throw error;
                return { url, id: pendingData.id };
            } catch (e) {
                console.error(`[QUEUE] Insert failed for ${url}:`, e);
                processingUrls.current.delete(url);
                return null;
            }
        }));

        // PHASE 2: API Processing (Parallel)
        const validTasks = tasks.filter((t): t is { url: string; id: string } => t !== null);

        await Promise.all(validTasks.map(async (task) => {
            try {
                await safeSift(task.url, user!.id, task.id, tier);
            } catch (apiError: any) {
                console.error(`[QUEUE] API Error for ${task.url}:`, apiError);

                if (apiError.status === 'limit_reached') {
                    setUpgradeUrl(apiError.upgrade_url);
                    setLimitReachedVisible(true);
                    triggerHaptic('notification', Haptics.NotificationFeedbackType.Error);
                } else {
                    await supabase.from('pages').update({
                        metadata: { status: 'failed', error: apiError.message }
                    }).eq('id', task.id);

                    const isTimeout = apiError.message.toLowerCase().includes('time') || apiError.message.toLowerCase().includes('deadline');
                    const errorMsg = isTimeout
                        ? "Collection taking longer than expected"
                        : (apiError.message || "Sift retrieval failed");

                    showToast({
                        message: errorMsg,
                        duration: 5000,
                        type: 'error',
                        action: { label: 'Retry', onPress: () => addToQueue(task.url) }
                    });
                    triggerHaptic('notification', Haptics.NotificationFeedbackType.Error);
                }
            } finally {
                processingUrls.current.delete(task.url);
            }
        }));


        queryClient.invalidateQueries({ queryKey: ['saved-pages'] });

        triggerHaptic('notification', Haptics.NotificationFeedbackType.Success);
        setIsProcessingQueue(false);
    }, [queue, isProcessingQueue, user?.id, tier, triggerHaptic, showToast, queryClient]);

    useEffect(() => {
        const shareIntent = intent as any;
        if (hasShareIntent && shareIntent?.value) {
            if (shareIntent.type === 'text' || shareIntent.type === 'weburl') {
                // ACTION: Paste into input (User requested "paste url into text box")
                // This avoids Auth race conditions on cold start.
                setManualUrl(shareIntent.value);
                triggerHaptic('notification', Haptics.NotificationFeedbackType.Success);
                resetShareIntent();
            }
        }
    }, [hasShareIntent, intent, resetShareIntent]);

    const handleDeepLink = useCallback((event: { url: string }) => {
        try {
            const { queryParams } = Linking.parse(event.url);
            if (queryParams?.siftUrl) {
                addToQueue(decodeURIComponent(queryParams.siftUrl as string));
            }
        } catch (e) {
            console.error("Deep link error:", e);
        }
    }, [addToQueue]);

    useEffect(() => {
        const getInitialLink = async () => {
            const initialUrl = await Linking.getInitialURL();
            if (initialUrl) {
                const { queryParams } = Linking.parse(initialUrl);
                if (queryParams?.siftUrl) {
                    addToQueue(decodeURIComponent(queryParams.siftUrl as string));
                }
            }
        };
        getInitialLink();

        const sub = Linking.addEventListener('url', handleDeepLink);
        return () => sub.remove();
    }, [handleDeepLink, addToQueue]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active') checkClipboard();
        });
        checkClipboard();
        return () => subscription.remove();
    }, [checkClipboard]);

    useEffect(() => {
        const subscription = supabase
            .channel('public:pages')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pages' }, async (payload) => {
                const newRecord = payload.new as any;
                const oldRecord = payload.old as any;

                if (payload.eventType === 'INSERT') {
                    if (!newRecord || !newRecord.id || newRecord.user_id !== user?.id) return;
                    queryClient.invalidateQueries({ queryKey: ['pages', user?.id, tier] });
                    triggerHaptic('notification', Haptics.NotificationFeedbackType.Success);
                } else if (payload.eventType === 'UPDATE') {
                    if (!newRecord || !newRecord.id || newRecord.user_id !== user?.id) return;

                    const statusChanged = newRecord.metadata?.status === 'completed' && oldRecord.metadata?.status !== 'completed';
                    const titleChanged = newRecord.title !== oldRecord.title;
                    const pinnedChanged = newRecord.is_pinned !== oldRecord.is_pinned;
                    const archivedChanged = newRecord.is_archived !== oldRecord.is_archived;

                    if (statusChanged || titleChanged || pinnedChanged || archivedChanged) {
                        queryClient.invalidateQueries({ queryKey: ['pages', user?.id, tier] });
                        if (statusChanged) triggerHaptic('notification', Haptics.NotificationFeedbackType.Success);
                    }
                } else if (payload.eventType === 'DELETE') {
                    queryClient.invalidateQueries({ queryKey: ['pages', user?.id, tier] });
                }
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [user?.id, queryClient]);

    const lastScrollY = useRef(0);
    const onScroll = useCallback((event: any) => {
        const y = event.nativeEvent.contentOffset.y;
        if (Math.abs(y - lastScrollY.current) > 100) {
            triggerHaptic('impact', Haptics.ImpactFeedbackStyle.Light);
            lastScrollY.current = y;
        }
    }, [triggerHaptic]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        triggerHaptic('impact', Haptics.ImpactFeedbackStyle.Medium);

        try {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['pages', user?.id, tier] }),
                refreshProfile()
            ]);
        } catch (e) {
            console.error('[Home] Refresh failed:', e);
        } finally {
            setRefreshing(false);
            triggerHaptic('notification', Haptics.NotificationFeedbackType.Success);
        }
    }, [queryClient, user?.id, triggerHaptic, refreshProfile]);

    const handleArchive = async (id: string) => {
        if (!user?.id) {
            showToast({ message: "Error: Identity not verified" });
            return;
        }

        try {
            const apiUrl = `${API_URL}/api/archive`;


            const response = await fetch(apiUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action: 'archive', user_id: user.id })
            });

            if (!response.ok) {
                const text = await response.text();
                console.error('[Archive] Failed:', response.status, text);
                throw new Error(`Server returned ${response.status}: ${text || 'Unknown archive error'}`);
            }

            queryClient.invalidateQueries({ queryKey: ['pages', user?.id, tier] });
            showToast({ message: "Moved to Archive" });
            triggerHaptic('notification', Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
            console.error('[Archive] Exception:', error);
            showToast({ message: error.message.includes('JSON') ? "Invalid Server Response" : `Archive failed: ${error.message}` });
        }
    };

    const handleDeleteForever = async (id: string) => {
        if (!user?.id) {
            showToast({ message: "Error: Identity not verified" });
            return;
        }

        try {
            const apiUrl = `${API_URL}/api/archive?id=${id}&user_id=${user.id}`;

            const response = await fetch(apiUrl, { method: 'DELETE' });

            if (!response.ok) {
                const text = await response.text();
                console.error('[Delete] Failed:', response.status, text);
                throw new Error(`Server returned ${response.status}: ${text || 'Unknown delete error'}`);
            }

            queryClient.invalidateQueries({ queryKey: ['pages', user?.id, tier] });
            showToast({ message: "Permanently Deleted" });
            triggerHaptic('notification', Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
            console.error('[Delete] Exception:', error);
            showToast({ message: error.message.includes('JSON') ? "Invalid Server Response" : `Delete failed: ${error.message}` });
        }
    };

    const handlePin = async (id: string) => {
        try {
            const page = pages.find(p => p.id === id);
            if (!page) return;

            const newPinnedState = !page.is_pinned;

            // Optimistic Update
            queryClient.setQueryData(['pages', user?.id, tier], (old: any) => {
                if (!old || !old.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any[]) =>
                        page.map((p: any) => p.id === id ? { ...p, is_pinned: newPinnedState } : p)
                    )
                };
            });

            const { error } = await supabase.from('pages').update({ is_pinned: newPinnedState }).eq('id', id);
            if (error) throw error;
            triggerHaptic('notification', Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error('[Pin] Action failed:', error);
            showToast({ message: "Action failed" });
            // Rollback on error
            queryClient.invalidateQueries({ queryKey: ['pages', user?.id, tier] });
        }
    };


    const handleSubmitUrl = () => {
        if (isOverLimit) {
            setLimitReachedVisible(true);
            triggerHaptic('notification', Haptics.NotificationFeedbackType.Warning);
            return;
        }

        if (manualUrl.trim()) {
            const url = manualUrl.trim();
            Keyboard.dismiss();
            addToQueue(url);
            setManualUrl("");
        } else {
            // If empty, show options for adding content
            showAddMenu();
        }
    };

    const [addMenuVisible, setAddMenuVisible] = useState(false);

    const showAddMenu = () => {
        setAddMenuVisible(true);
        Haptics.selectionAsync();
    };

    // Handle Edit Tags from Feed
    const handleEditTagsTrigger = (id: string, tags: string[]) => {
        setSelectedSiftId(id);
        setSelectedSiftTags(tags);
        setQuickTagModalVisible(true);
    };

    const [siftActionSheetVisible, setSiftActionSheetVisible] = useState(false);
    const [selectedSift, setSelectedSift] = useState<any>(null);

    const handleSiftOptions = (item: any) => {
        setSelectedSift(item);
        setSiftActionSheetVisible(true);
    };

    const handleSaveTags = async (newTags: string[]) => {
        if (!selectedSiftId) return;

        try {
            const { error } = await supabase
                .from('pages')
                .update({ tags: newTags })
                .eq('id', selectedSiftId);

            if (error) {
                throw error;
            } else {
                queryClient.invalidateQueries({ queryKey: ['pages', user?.id, tier] });
                setQuickTagModalVisible(false);
                showToast({ message: "Tags updated" });
            }
        } catch (error: any) {
            console.error("Error updating tags:", error);
            showToast({ message: "Failed to update tags" });
        }
    };

    // --- RENDER HELPERS ---

    const HomeHeader = useMemo(() => (
        <View style={{ paddingTop: SPACING.m }}>
            {/* 1. BENTO HEADER */}
            <View style={styles.bentoContainer}>
                <View style={styles.bentoHeader}>
                    <TouchableOpacity
                        activeOpacity={1}
                        onLongPress={() => {
                            const buildNum = Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '102';
                            Alert.alert(
                                "SIFT Diagnostics",
                                `API: ${API_URL}\nUser: ${user?.id}\nTier: ${tier}\nEnv: ${__DEV__ ? 'Dev' : 'Prod'}\nBuild: ${buildNum}\nSifts: ${pages?.length || 0}`,
                                [
                                    { text: "OK" },
                                    {
                                        text: "Test Connection",
                                        onPress: async () => {
                                            try {
                                                const res = await fetch(`${API_URL}/api/archive?user_id=${user?.id}`);
                                                if (res.ok) {
                                                    Alert.alert("Success", "API is reachable!");
                                                } else {
                                                    const txt = await res.text();
                                                    Alert.alert("Failed", `Status: ${res.status}\nBody: ${txt.substring(0, 100)}`);
                                                }
                                            } catch (e: any) {
                                                Alert.alert("Error", e.message);
                                            }
                                        }
                                    }
                                ]
                            );
                            triggerHaptic('notification', Haptics.NotificationFeedbackType.Warning);
                        }}
                        delayLongPress={2000}
                        style={styles.greetingBox}
                    >
                        <Typography variant="label" color={COLORS.stone} style={{ marginBottom: 2 }}>
                            {getGreeting()} •
                        </Typography>
                        <Typography variant="h1" numberOfLines={1} style={styles.serifTitle}>
                            {(profile?.display_name || "Guest").split(' ')[0]}
                        </Typography>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => {
                            setViewMode(prev => prev === 'grid' ? 'list' : 'grid');
                            triggerHaptic('selection');
                        }}
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: RADIUS.pill,
                            backgroundColor: COLORS.subtle,
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginTop: 8
                        }}
                    >
                        {viewMode === 'grid' ? (
                            <Rows size={22} color={COLORS.ink} weight="bold" />
                        ) : (
                            <SquaresFour size={22} color={COLORS.ink} weight="bold" />
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.inputContainer}>
                    <TouchableOpacity
                        onPress={() => {
                            if (isOverLimit) {
                                setLimitReachedVisible(true);
                                triggerHaptic('notification', Haptics.NotificationFeedbackType.Warning);
                            } else {
                                pickAndSift();
                            }
                        }}
                        style={styles.imageUploadIcon}
                    >
                        <ImageSquare size={22} color={COLORS.stone} weight="regular" />
                    </TouchableOpacity>
                    <TextInput
                        ref={inputRef}
                        style={styles.textInput}
                        placeholder="A link to sift..."
                        placeholderTextColor={COLORS.stone}
                        value={manualUrl}
                        onChangeText={setManualUrl}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="url"
                        returnKeyType="go"
                        onSubmitEditing={handleSubmitUrl}
                    />
                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleSubmitUrl}
                        disabled={isSiftingImage}
                    >
                        {isSiftingImage ? (
                            <ActivityIndicator size="small" color={COLORS.ink} />
                        ) : (
                            <Plus size={20} color={COLORS.ink} weight="bold" />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* 1.5. Initializing State Overlay */}
            {(authLoading && (!pages || pages.length === 0)) && (
                <View style={{ height: 100, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={COLORS.ink} />
                    <Typography variant="caption" style={{ marginTop: 12, color: COLORS.stone }}>Preparing your library...</Typography>
                </View>
            )}

            {/* 2. SEARCH BAR */}
            <View style={styles.searchContainer}>
                <View style={[styles.searchInputWrapper, { borderRadius: RADIUS.l }]}>
                    <MagnifyingGlass size={18} color={COLORS.stone} weight="bold" style={{ marginRight: 10 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Find a sift..."
                        placeholderTextColor={COLORS.stone}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {searchQuery?.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearchQuery(""); triggerHaptic('selection'); }}>
                            <XCircle size={18} color={COLORS.stone} weight="fill" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* 3. HERO CAROUSEL */}
            <View style={{ marginHorizontal: -20 }}>
                {activeFilter === 'All' && searchQuery === '' && (
                    <HeroCarousel
                        pages={filteredPages}
                        onTogglePin={handlePin}
                    />
                )}
            </View>

            {/* 4. FILTER BAR */}
            <View style={{ marginHorizontal: -20 }}>
                <FilterBar
                    filters={[
                        { id: 'All', text: 'All' },
                        ...ALLOWED_TAGS.map(tag => ({ id: tag, text: tag }))
                    ]}
                    activeFilter={activeFilter}
                    onSelect={setActiveFilter}
                />
            </View>

            {/* 5. SIFT LIMIT TRACKER */}
            <View style={{ paddingHorizontal: SPACING.m }}>
                <SiftLimitTracker />
            </View>
        </View >
    ), [pages, profile, user, tier, manualUrl, searchQuery, activeFilter, isSiftingImage]);

    const HomeEmptyState = useMemo(() => (
        <View style={{ paddingTop: 40 }}>
            <EmptyState
                type={searchQuery ? 'no-results' : 'no-sifts'}
                title={searchQuery ? "No sifts found" : "Time to Sift"}
                description={searchQuery ? `We couldn't find any results for "${searchQuery}"` : "Paste a link above or scan a photo to start building your library."}
                actionLabel={searchQuery ? "Clear Search" : "Browse Collections"}
                onAction={searchQuery ? () => setSearchQuery("") : () => setActiveFilter("All")}
            />
            {(!pages || pages.length === 0) && !loading && (!filteredPages || filteredPages.length === 0) && (
                <View style={{ padding: 20 }}>
                    <Typography variant="caption" color="stone" style={{ textAlign: 'center' }}>
                        If your items are missing, check your connection or try restarting the app.
                    </Typography>
                </View>
            )}
        </View>
    ), [searchQuery, pages?.length, loading, filteredPages?.length]);

    return (
        <ScreenWrapper edges={['top']}>
            <SiftFeed
                pages={filteredPages as any}
                onPin={handlePin}
                onArchive={handleArchive}
                onDeleteForever={handleDeleteForever}
                onEditTags={handleEditTagsTrigger}
                onOptions={handleSiftOptions}
                loading={loading && fetchStatus === 'fetching'}
                ListHeaderComponent={HomeHeader}
                ListEmptyComponent={HomeEmptyState}
                onScroll={onScroll}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.ink} />
                }
                contentContainerStyle={{ paddingBottom: 160 }}
                viewMode={viewMode}
                onEndReached={() => {
                    if (hasNextPage && !isFetchingNextPage) {
                        fetchNextPage();
                    }
                }}
                onEndReachedThreshold={0.5}
            />

            {/* 6. MODALS */}
            <QuickTagEditor
                visible={quickTagModalVisible}
                onClose={() => setQuickTagModalVisible(false)}
                onSave={handleSaveTags}
                initialTags={selectedSiftTags}
            />

            <ActionSheet
                visible={addMenuVisible}
                onClose={() => setAddMenuVisible(false)}
                title="New Sift"
                options={[
                    {
                        label: 'Scan from Gallery',
                        onPress: () => {
                            // Slight delay to allow modal to close smoothly before picker opens (optional, but good for stability)
                            setTimeout(() => pickAndSift(), 100);
                        }
                    },
                    {
                        label: 'Paste Link',
                        onPress: () => {
                            setTimeout(() => inputRef.current?.focus(), 100);
                        }
                    },
                    {
                        label: 'Cancel',
                        isCancel: true,
                        onPress: () => { }
                    }
                ]}
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
                additionalOptions={[
                    (__DEV__ && selectedSift?.debug_info) ? {
                        label: 'View Diagnostics',
                        onPress: () => {
                            Alert.alert("Sift Diagnostics", selectedSift.debug_info || "No details", [{ text: "Close" }]);
                        }
                    } : null,
                ].filter(Boolean) as any}
            />

            <LimitReachedModal
                visible={limitReachedVisible}
                onClose={() => setLimitReachedVisible(false)}
                upgradeUrl={upgradeUrl}
            />
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    bentoContainer: {
        // paddingHorizontal: 20, // Inherited from SiftFeed (standardized)
        marginTop: SPACING.m,
        marginBottom: SPACING.l,
    },
    bentoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    greetingBox: {
        flex: 1,
    },
    serifTitle: {
        fontSize: 36,
        fontFamily: 'PlayfairDisplay_700Bold',
        color: COLORS.ink,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 44,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E5E5E5',
    },
    imageUploadIcon: {
        marginRight: 12,
        padding: 4,
    },
    textInput: {
        flex: 1,
        fontSize: 17,
        fontFamily: 'System', // Standard iOS Input
        color: COLORS.ink,
        paddingVertical: 10,
    },
    submitButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchContainer: {
        // paddingHorizontal: 20, // Inherited from SiftFeed (standardized)
        marginBottom: SPACING.l,
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 52,
        backgroundColor: '#FFFFFF', // Fallback or strict white
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
        color: COLORS.ink,
        paddingVertical: 0,
        textAlignVertical: 'center',
    }
});

