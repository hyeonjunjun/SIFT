import { ActionSheetIOS, Platform, View, ScrollView, RefreshControl, TextInput, TouchableOpacity, AppState, DeviceEventEmitter, Pressable, Keyboard, StyleSheet, Alert, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Archive, Plus, House, User, MagnifyingGlass, SquaresFour, Books, Fingerprint, ImageSquare, XCircle } from 'phosphor-react-native';
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
import { useQuery, useQueryClient } from '@tanstack/react-query';

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

export default function HomeScreen() {
    const { user, tier, profile, loading: authLoading } = useAuth(); // Get authenticated user
    const queryClient = useQueryClient();
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const { data: pages = [], isLoading: loading, refetch } = useQuery({
        queryKey: ['pages', user?.id, tier],
        queryFn: async () => {
            if (!user) return [];
            console.log(`[Fetch] Fetching pages for user: ${user.id}`);
            const { data, error } = await supabase
                .from('pages')
                .select('*')
                .eq('user_id', user.id)
                .neq('is_archived', true) // More resilient than .eq(false) because it handles NULLs
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[Fetch] Supabase Error:', error);
                throw error;
            }
            return data as Page[];
        },
        enabled: !!user,
    });

    // Quick Tag Modal State
    const [quickTagModalVisible, setQuickTagModalVisible] = useState(false);
    const [selectedSiftId, setSelectedSiftId] = useState<string | null>(null);
    const [selectedSiftTags, setSelectedSiftTags] = useState<string[]>([]);
    const [toastMessage, setToastMessage] = useState("");
    const [toastVisible, setToastVisible] = useState(false);
    const [toastAction, setToastAction] = useState<{ label: string, onPress: () => void } | undefined>(undefined);
    const [toastSecondaryAction, setToastSecondaryAction] = useState<{ label: string, onPress: () => void } | undefined>(undefined);
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
        if (searchQuery.trim()) {
            results = fuse.search(searchQuery).map(r => r.item);
        }

        // 2. Apply Category Filter
        if (activeFilter !== 'All') {
            results = results.filter(p => p.tags?.some(t => t && t.toLowerCase() === activeFilter.toLowerCase()));
        }

        // 3. Sort (Pinned first, then date)
        return results.sort((a, b) => {
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;
            const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return timeB - timeA;
        });
    }, [pages, searchQuery, activeFilter, fuse]);

    const [toastDuration, setToastDuration] = useState(3000);

    const showToast = (message: string, duration = 3000, action?: { label: string, onPress: () => void }, secondaryAction?: { label: string, onPress: () => void }) => {
        setToastMessage(message);
        setToastDuration(duration);
        setToastAction(action);
        setToastSecondaryAction(secondaryAction);
        setToastVisible(true);
    };

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
                console.log(`[QUEUE] Skipping duplicate: ${cleanUrl}`);
                continue;
            }

            const currentUserId = user?.id;
            console.log(`[QUEUE] Adding URL: ${cleanUrl} (User: ${currentUserId || 'GUEST'})`);
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
                console.log(`[Clipboard] Auto-detected URL: ${content}`);
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
            showToast(`Queueing ${count} links...`, 2000);
        } else {
            showToast("Sifting...", 1500);
        }

        console.log(`[OPTIMISTIC] Processing ${count} urls`);

        // PHASE 1: Batch Optimistic Inserts (Parallel)
        const tasks: { url: string; pendingId?: string }[] = [];

        await Promise.all(urlsToProcess.map(async (url) => {
            if (processingUrls.current.has(url)) return;
            processingUrls.current.add(url);

            try {
                const domain = getDomain(url);
                const { data: pendingData } = await supabase
                    .from('pages')
                    .insert({
                        user_id: user?.id,
                        url,
                        title: "Sifting...",
                        summary: "Synthesizing content...",
                        tags: ["Lifestyle"],
                        metadata: { status: 'pending', source: domain }
                    })
                    .select()
                    .single();

                if (pendingData?.id) {
                    tasks.push({ url, pendingId: pendingData.id });
                } else {
                    processingUrls.current.delete(url);
                }
            } catch (e) {
                processingUrls.current.delete(url);
            }
        }));

        triggerHaptic('notification', Haptics.NotificationFeedbackType.Success);

        // PHASE 2: Sequential Processing (Series)
        for (const task of tasks) {
            if (!task.pendingId) continue;
            try {
                console.log(`[QUEUE] Processing: ${task.url} (ID: ${task.pendingId})`);
                await safeSift(task.url, user!.id, task.pendingId, tier);
            } catch (error: any) {
                console.error(`[QUEUE] Error sifting ${task.url}:`, error);
            } finally {
                processingUrls.current.delete(task.url);
                // Ensure the database knows we are no longer processing if we didn't get success
                try {
                    const { data: checkData } = await supabase.from('pages').select('metadata').eq('id', task.pendingId).single();
                    if (checkData?.metadata?.status === 'pending') {
                        await supabase.from('pages').update({
                            metadata: { ...checkData.metadata, status: 'failed' }
                        }).eq('id', task.pendingId);
                    }
                } catch (e) { }
            }
        }

        setIsProcessingQueue(false);
    }, [queue, isProcessingQueue, user?.id]);

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
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pages' }, (payload) => {
                const newRecord = payload.new as any;
                const oldRecord = payload.old as any;

                console.log(`[Realtime] ${payload.eventType} received:`, newRecord?.id || oldRecord?.id);

                if (payload.eventType === 'INSERT') {
                    if (!newRecord || !newRecord.id || newRecord.user_id !== user?.id) return;
                    queryClient.invalidateQueries({ queryKey: ['pages', user?.id] });
                    triggerHaptic('notification', Haptics.NotificationFeedbackType.Success);
                } else if (payload.eventType === 'UPDATE') {
                    if (!newRecord || !newRecord.id || newRecord.user_id !== user?.id) return;
                    queryClient.invalidateQueries({ queryKey: ['pages', user?.id] });
                } else if (payload.eventType === 'DELETE') {
                    if (!oldRecord || !oldRecord.id) return;
                    queryClient.invalidateQueries({ queryKey: ['pages', user?.id] });
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
        triggerHaptic('impact', Haptics.ImpactFeedbackStyle.Medium);
        setRefreshing(true);
        await queryClient.invalidateQueries({ queryKey: ['pages', user?.id] });
        setRefreshing(false);
    }, [user?.id, queryClient, triggerHaptic]);

    const handleArchive = async (id: string) => {
        if (!user?.id) {
            showToast("Error: Identity not verified");
            return;
        }

        try {
            const apiUrl = `${API_URL}/api/archive`;
            console.log(`[Archive] PUT to ${apiUrl} for item ${id}`);

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

            queryClient.invalidateQueries({ queryKey: ['pages', user?.id] });
            showToast("Moved to Archive");
            triggerHaptic('notification', Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
            console.error('[Archive] Exception:', error);
            showToast(error.message.includes('JSON') ? "Invalid Server Response" : `Archive failed: ${error.message}`);
        }
    };

    const handleDeleteForever = async (id: string) => {
        if (!user?.id) {
            showToast("Error: Identity not verified");
            return;
        }

        try {
            const apiUrl = `${API_URL}/api/archive?id=${id}&user_id=${user.id}`;
            console.log(`[Delete] DELETE to ${apiUrl}`);
            const response = await fetch(apiUrl, { method: 'DELETE' });

            if (!response.ok) {
                const text = await response.text();
                console.error('[Delete] Failed:', response.status, text);
                throw new Error(`Server returned ${response.status}: ${text || 'Unknown delete error'}`);
            }

            queryClient.invalidateQueries({ queryKey: ['pages', user?.id] });
            showToast("Permanently Deleted");
            triggerHaptic('notification', Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
            console.error('[Delete] Exception:', error);
            showToast(error.message.includes('JSON') ? "Invalid Server Response" : `Delete failed: ${error.message}`);
        }
    };

    const handlePin = async (id: string) => {
        try {
            queryClient.invalidateQueries({ queryKey: ['pages', user?.id] });
            const page = pages.find(p => p.id === id);
            if (!page) return;
            const { error } = await supabase.from('pages').update({ is_pinned: !page.is_pinned }).eq('id', id);
            if (error) throw error;
            triggerHaptic('notification', Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            showToast("Action failed");
        }
    };


    const handleSubmitUrl = () => {
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

    const showAddMenu = () => {
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Cancel', 'Scan from Gallery', 'Paste Link'],
                    cancelButtonIndex: 0,
                    tintColor: COLORS.ink,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) {
                        pickAndSift();
                    } else if (buttonIndex === 2) {
                        inputRef.current?.focus();
                    }
                }
            );
        } else {
            Alert.alert(
                "Add to Sift",
                "How would you like to add content?",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Scan from Gallery", onPress: pickAndSift },
                    { text: "Paste Link", onPress: () => inputRef.current?.focus() }
                ]
            );
        }
    };

    // Handle Edit Tags from Feed
    const handleEditTagsTrigger = (id: string, currentTags: string[]) => {
        setSelectedSiftId(id);
        setSelectedSiftTags(currentTags);
        setQuickTagModalVisible(true);
    };

    const handleSaveTags = async (newTags: string[]) => {
        if (!selectedSiftId) return;

        // Optimistic update could be added here, but for now just invalidate
        try {
            const { error } = await supabase
                .from('pages')
                .update({ tags: newTags })
                .eq('id', selectedSiftId);

            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['pages', user?.id] });
            showToast("Tags updated");
        } catch (error: any) {
            console.error("Error updating tags:", error);
            showToast("Failed to update tags");
        }
    };

    return (
        <ScreenWrapper edges={['top']}>
            <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={{ paddingBottom: 160 }}
                onScroll={onScroll}
                scrollEventThrottle={16}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.ink} />
                }
            >
                {/* 1. BENTO HEADER */}
                <View style={styles.bentoContainer}>
                    <View style={styles.bentoHeader}>
                        <TouchableOpacity
                            activeOpacity={1}
                            onLongPress={() => {
                                // ENABLED FOR DEBUGGING IN PROD
                                // if (!__DEV__) return; 
                                Alert.alert(
                                    "SIFT Diagnostics",
                                    `API: ${API_URL}\nUser: ${user?.id}\nTier: ${tier}\nEnv: ${__DEV__ ? 'Dev' : 'Prod'}\nBuild: 102\nSifts: ${pages.length}`,
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
                            <Typography variant="label" style={{ fontFamily: 'System', fontWeight: '500', color: COLORS.stone }}>{getGreeting()},</Typography>
                            <Typography variant="h1" style={{ fontFamily: 'PlayfairDisplay', fontWeight: '400', fontSize: 32 }}>{(profile?.display_name || user?.email?.split('@')[0] || "guest").toLowerCase()}</Typography>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputContainer}>
                        <TouchableOpacity
                            onPress={pickAndSift}
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
                                <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.ink, borderTopColor: 'transparent' }} />
                            ) : (
                                <Plus size={20} color={COLORS.ink} weight="bold" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 1.5. Initializing State Overlay - Only on cold start or auth check */}
                {(authLoading && pages.length === 0) && (
                    <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={COLORS.ink} />
                        <Typography variant="caption" style={{ marginTop: 12, color: COLORS.stone }}>Preparing your library...</Typography>
                    </View>
                )}

                {/* 2. SEARCH BAR */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchInputWrapper}>
                        <MagnifyingGlass size={18} color={COLORS.stone} weight="bold" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Find a sift..."
                            placeholderTextColor={COLORS.stone}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => { setSearchQuery(""); triggerHaptic('selection'); }}>
                                <XCircle size={18} color={COLORS.stone} weight="fill" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* 3. HERO CAROUSEL */}
                {activeFilter === 'All' && searchQuery === '' && <HeroCarousel pages={pages} />}

                {/* 4. FILTER BAR */}
                <FilterBar
                    filters={[
                        { id: 'All', text: 'All' },
                        ...ALLOWED_TAGS.map(tag => ({ id: tag, text: tag }))
                    ]}
                    activeFilter={activeFilter}
                    onSelect={setActiveFilter}
                />

                {/* 5. FEED */}
                <SiftFeed
                    pages={filteredPages as any}
                    onPin={handlePin}
                    onArchive={handleArchive}
                    onDeleteForever={handleDeleteForever}
                    onEditTags={handleEditTagsTrigger}
                    loading={loading}
                />

                {filteredPages.length === 0 && !loading && (
                    <EmptyState
                        type={searchQuery ? 'no-results' : 'no-sifts'}
                        title={searchQuery ? "No sifts found" : "Time to Sift"}
                        description={searchQuery ? `We couldn't find any results for "${searchQuery}"` : "Paste a link above or scan a photo to start building your library."}
                        actionLabel={searchQuery ? "Clear Search" : "Browse Categories"}
                        onAction={searchQuery ? () => setSearchQuery("") : () => setActiveFilter("All")}
                    />
                )}

                {/* ERROR STATE */}
                {!(pages.length > 0) && !loading && (filteredPages.length === 0) && (
                    <View style={{ padding: 20 }}>
                        <Typography variant="caption" color="stone" style={{ textAlign: 'center' }}>
                            If your items are missing, check your connection or try restarting the app.
                        </Typography>
                    </View>
                )}
            </ScrollView>

            {/* 6. MODALS */}
            <QuickTagEditor
                visible={quickTagModalVisible}
                onClose={() => setQuickTagModalVisible(false)}
                initialTags={selectedSiftTags}
                onSave={handleSaveTags}
            />

            <Toast
                message={toastMessage}
                visible={toastVisible}
                duration={toastDuration}
                onHide={() => setToastVisible(false)}
                action={toastAction}
                secondaryAction={toastSecondaryAction}
            />
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    bentoContainer: {
        paddingHorizontal: 20,
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
        paddingHorizontal: 20,
        marginBottom: SPACING.m,
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.subtle,
        borderRadius: RADIUS.m,
        paddingHorizontal: 12,
        height: 40,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'System',
        color: COLORS.ink,
    }
});

