import { View, ScrollView, RefreshControl, TextInput, TouchableOpacity, AppState, DeviceEventEmitter, Pressable, Keyboard, StyleSheet, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState, useCallback, useRef } from "react";
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Archive, Plus, House, User, MagnifyingGlass, SquaresFour, Books, Fingerprint } from 'phosphor-react-native';
import { supabase } from "../../lib/supabase";
import { Toast } from "../../components/Toast";
import { Typography } from "../../components/design-system/Typography";
import { COLORS, SPACING, Theme, RADIUS } from "../../lib/theme";
import { API_URL } from "../../lib/config";
import { HeroCarousel } from "../../components/home/HeroCarousel";
import { FilterBar } from "../../components/home/FilterBar";
import SiftFeed from "../../components/SiftFeed";
import ScreenWrapper from "../../components/ScreenWrapper";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useShareIntent } from 'expo-share-intent';
import { safeSift } from "../../lib/sift-api";
import { getDomain } from "../../lib/utils";

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
    const { user } = useAuth(); // Get authenticated user
    const [pages, setPages] = useState<Page[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
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
    const [currentStep, setCurrentStep] = useState(0);
    const router = useRouter();
    const params = useLocalSearchParams();

    useEffect(() => {
        if (params.siftUrl) {
            const url = decodeURIComponent(params.siftUrl as string);
            addToQueue(url);
            router.setParams({ siftUrl: undefined });
        }
    }, [params.siftUrl]);

    const allTags = ALLOWED_TAGS;
    const filteredPages = activeFilter === 'All'
        ? pages
        : pages
            .filter(p => p.tags?.some(t => t && t.toLowerCase() === activeFilter.toLowerCase()))
            .sort((a, b) => {
                const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
                return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
            });

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
                Haptics.selectionAsync();
            }
        });
        return () => sub.remove();
    }, []);



    const fetchPages = useCallback(async (force = false) => {
        if (!user) return;
        try {
            // 1. Try to load from cache first for instant UI
            if (pages.length === 0 && !force) {
                const cachedData = await AsyncStorage.getItem('sift_pages_cache');
                if (cachedData) {
                    setPages(JSON.parse(cachedData));
                }
            }

            // 2. Fetch from Supabase
            console.log(`[Fetch] Fetching pages for user: ${user.id}`);
            const { data, error } = await supabase
                .from('pages')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_archived', false)
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[Fetch] Supabase Error:', error);
                showToast(`Fetch Error: ${error.message}`);
            }

            if (data) {
                console.log(`[Fetch] Success. Received ${data.length} pages.`);
                setPages(data as Page[]);
                // 3. Update cache
                await AsyncStorage.setItem('sift_pages_cache', JSON.stringify(data));
            }
        } catch (e) {
            console.error('Exception fetching pages:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]); // Removed pages.length to break loop

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

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // PHASE 2: Sequential Processing (Series)
        for (const task of tasks) {
            if (!task.pendingId) continue;
            try {
                console.log(`[QUEUE] Processing: ${task.url} (ID: ${task.pendingId})`);
                await safeSift(task.url, user!.id, task.pendingId);
            } catch (error: any) {
                console.error(`[QUEUE] Error sifting ${task.url}:`, error);
            } finally {
                processingUrls.current.delete(task.url);
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
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
        fetchPages();
        const subscription = supabase
            .channel('public:pages')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pages' }, (payload) => {
                const newRecord = payload.new as any;
                const oldRecord = payload.old as any;

                console.log(`[Realtime] ${payload.eventType} received:`, newRecord?.id || oldRecord?.id);

                if (payload.eventType === 'INSERT') {
                    if (!newRecord || !newRecord.id || newRecord.user_id !== user?.id) return;
                    setPages((prev) => {
                        if (prev.find(p => p.id === newRecord.id)) return prev;
                        return [newRecord as Page, ...prev];
                    });
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } else if (payload.eventType === 'UPDATE') {
                    if (!newRecord || !newRecord.id || newRecord.user_id !== user?.id) return;
                    setPages((prev) => prev.map(p => p.id === newRecord.id ? { ...p, ...newRecord } : p));
                } else if (payload.eventType === 'DELETE') {
                    if (!oldRecord || !oldRecord.id) return;
                    setPages((prev) => prev.filter(p => p.id !== oldRecord.id));
                }
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [fetchPages, user?.id]);

    const lastScrollY = useRef(0);
    const onScroll = useCallback((event: any) => {
        const y = event.nativeEvent.contentOffset.y;
        if (Math.abs(y - lastScrollY.current) > 100) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            lastScrollY.current = y;
        }
    }, []);

    const onRefresh = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setRefreshing(true);
        fetchPages();
    }, [fetchPages]);

    const deletePage = async (id: string) => {
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

            setPages((prev) => prev.filter((p) => p.id !== id));
            showToast("Moved to Archive");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
            console.error('[Archive] Exception:', error);
            showToast(error.message.includes('JSON') ? "Invalid Server Response" : `Archive failed: ${error.message}`);
        }
    };

    const deletePageForever = async (id: string) => {
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

            setPages((prev) => prev.filter((p) => p.id !== id));
            showToast("Permanently Deleted");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
            console.error('[Delete] Exception:', error);
            showToast(error.message.includes('JSON') ? "Invalid Server Response" : `Delete failed: ${error.message}`);
        }
    };

    const togglePin = async (id: string) => {
        try {
            setPages(prev => {
                const updated = prev.map(p => p.id === id ? { ...p, is_pinned: !p.is_pinned } : p);
                return updated.sort((a, b) => {
                    if (a.is_pinned === b.is_pinned) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                    return (a.is_pinned ? -1 : 1);
                });
            });
            const page = pages.find(p => p.id === id);
            if (!page) return;
            const { error } = await supabase.from('pages').update({ is_pinned: !page.is_pinned }).eq('id', id);
            if (error) throw error;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            showToast("Action failed");
        }
    };

    const handleSubmitUrl = () => {
        if (manualUrl.trim()) {
            const url = manualUrl.trim();

            // We removed auto-sift, so we MUST allow manual submission of the pre-filled link.
            // Duplicate check is now handled by processingUrls set inside addToQueue.

            Keyboard.dismiss();
            addToQueue(url);
            setManualUrl("");
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
                                    "SIFT Debug",
                                    `API: ${API_URL}\nSB: ${process.env.EXPO_PUBLIC_SUPABASE_URL?.substring(0, 20)}...\nUser: ${user?.id}\nPages: ${pages.length}`,
                                    [
                                        { text: "OK" },
                                        {
                                            text: "Run Mock Sift",
                                            onPress: async () => {
                                                try {
                                                    showToast("Starting Mock Sift...");
                                                    const res = await fetch(`${API_URL}/api/sift`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ mock: true, user_id: user?.id, platform: 'debug' })
                                                    });
                                                    const json = await res.json();
                                                    if (res.ok) {
                                                        showToast("Mock Sift Success! Check feed.");
                                                        onRefresh(); // Trigger feed update
                                                    } else {
                                                        Alert.alert("Mock Sift Failed", json.message || "Unknown error");
                                                    }
                                                } catch (e: any) {
                                                    Alert.alert("Request Exception", e.message);
                                                }
                                            }
                                        }
                                    ]
                                );
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                            }}
                            delayLongPress={2000}
                            style={styles.greetingBox}
                        >
                            <Typography variant="label" style={{ fontFamily: 'System', fontWeight: '500', color: COLORS.stone }}>{getGreeting()},</Typography>
                            <Typography variant="h1" style={{ fontFamily: 'PlayfairDisplay', fontWeight: '400', fontSize: 32 }}>{(user?.email?.split('@')[0] || "guest").toLowerCase()}</Typography>
                        </TouchableOpacity>
                    </View>

                    {/* 2. INPUT BLOCK (SPOTLIGHT STYLE) */}
                    <View style={styles.inputContainer}>
                        <Typography variant="label" style={styles.inputLabel}>SIFT</Typography>
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
                        >
                            <Plus size={20} color={manualUrl ? COLORS.ink : COLORS.stone} weight="bold" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 3. HERO CAROUSEL */}
                {activeFilter === 'All' && <HeroCarousel pages={pages} />}

                {/* 4. FILTER BAR */}
                <FilterBar
                    filters={[
                        { id: 'All', text: 'All' },
                        ...allTags.map(tag => ({ id: tag, text: tag }))
                    ]}
                    activeFilter={activeFilter}
                    onSelect={setActiveFilter}
                />

                {/* 5. FEED */}
                <SiftFeed
                    pages={filteredPages}
                    loading={loading}
                    onArchive={deletePage}
                    onPin={togglePin}
                    onDeleteForever={deletePageForever}
                />

                {filteredPages.length === 0 && (
                    <View style={styles.emptyState}>
                        <Typography variant="h3" color={COLORS.ink} style={{ marginBottom: 4 }}>Time to Sift</Typography>
                        <Typography variant="body" color={COLORS.stone}>Paste a link above to start.</Typography>
                    </View>
                )}
            </ScrollView>

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
    inputLabel: {
        color: COLORS.stone,
        marginRight: 10,
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
    emptyState: {
        marginTop: 48,
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
    }
});

