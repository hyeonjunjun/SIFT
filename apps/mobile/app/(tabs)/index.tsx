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
            .filter(p => p.tags?.some(t => t.toLowerCase() === activeFilter.toLowerCase()))
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
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

    const addToQueue = useCallback((url: string) => {
        if (!url || typeof url !== 'string') return;
        const cleanUrl = url.trim();
        if (!cleanUrl) return;

        // Basic dedupe for current session
        if (lastCheckedUrl.current === cleanUrl && isProcessingQueue) return;

        const currentUserId = user?.id;
        console.log(`[QUEUE] Adding URL: ${cleanUrl} (User: ${currentUserId || 'GUEST'})`);
        setQueue(prev => [...prev, cleanUrl]);
        lastCheckedUrl.current = cleanUrl;
    }, [isProcessingQueue]);

    const checkClipboard = useCallback(async () => {
        try {
            const content = await Clipboard.getStringAsync();
            if (!content) return;
            const isUrl = content.startsWith('http://') || content.startsWith('https://');
            if (isUrl && content !== lastCheckedUrl.current) {
                console.log(`[Clipboard] Auto-detected URL: ${content}`);
                lastCheckedUrl.current = content;

                // UX Improvement: Fill input and start sifting automatically
                setManualUrl(content);
                addToQueue(content);

                showToast("Processing link from clipboard...", 3000);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (e) { }
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
        setQueue([]); // Clear queue as we are processing these

        console.log(`[QUEUE] Starting to process ${urlsToProcess.length} items`);

        for (let i = 0; i < urlsToProcess.length; i++) {
            const url = urlsToProcess[i];
            setCurrentStep(i + 1);

            const total = urlsToProcess.length;
            const progressMsg = total > 1 ? `Sifting (${i + 1} of ${total})...` : "Currently Sifting...";

            showToast(progressMsg, 60000);

            try {
                if (!user?.id) {
                    throw new Error("You must be logged in to sift.");
                }

                console.log(`[QUEUE] Sifting URL: ${url} for User: ${user.id}`);
                const result = await safeSift(url, user.id);

                // Detailed diagnostic logging for the user/developer
                if (result && (result as any).debug_info) {
                    console.log(`[QUEUE] Sift Diagnostics: ${(result as any).debug_info}`);
                }

                console.log(`[QUEUE] Sift result for ${url}:`, result ? "Success" : "Failed");

                if (result) {
                    if (i === total - 1) {
                        setToastVisible(false);
                        setTimeout(() => {
                            showToast("Sifted!", 3000);
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }, 100);
                    }
                    // Refresh feed
                    fetchPages(true);
                }
            } catch (error: any) {
                console.error(`[QUEUE] Error sifting ${url}:`, error);
                showToast(error.message || "Error sifting URL");
                break; // Stop queue on error
            }
        }

        setIsProcessingQueue(false);
    }, [queue, isProcessingQueue, user?.id, fetchPages]);

    useEffect(() => {
        const shareIntent = intent as any;
        if (hasShareIntent && shareIntent?.value) {
            if (shareIntent.type === 'text' || shareIntent.type === 'weburl') {
                addToQueue(shareIntent.value);
                resetShareIntent();
            }
        }
    }, [hasShareIntent, intent, resetShareIntent, addToQueue]);

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
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pages' }, (payload) => {
                console.log('[Realtime] New page received:', payload.new.id, 'User ID:', payload.new.user_id);
                if (payload.new.user_id === user?.id) {
                    setPages((prev) => [payload.new as Page, ...prev]);
                    showToast("New Page Received");
                } else {
                    console.log('[Realtime] Page skipped (User ID mismatch)');
                }
            })
            .subscribe((status) => {
                console.log(`[Realtime] Subscription Status: ${status}`);
            });

        return () => {
            subscription.unsubscribe();
        };
    }, [fetchPages]);

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
        try {
            const apiUrl = `${API_URL}/api/archive`;

            const response = await fetch(apiUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action: 'archive', user_id: user?.id })
            });

            if (!response.ok) throw new Error('Failed to archive');
            setPages((prev) => prev.filter((p) => p.id !== id));
            showToast("Moved to Archive");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            showToast("Archive failed");
        }
    };

    const deletePageForever = async (id: string) => {
        try {
            const apiUrl = `${API_URL}/api/archive?id=${id}&user_id=${user?.id}`;
            const response = await fetch(apiUrl, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete');
            setPages((prev) => prev.filter((p) => p.id !== id));
            showToast("Permanently Deleted");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            showToast("Delete failed");
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
            Keyboard.dismiss();
            addToQueue(manualUrl.trim());
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
                            <Typography variant="label" color={COLORS.stone} style={styles.smallCapsLabel}>{getGreeting().toUpperCase()}</Typography>
                            <Typography variant="h1" style={styles.serifTitle}>Ryan</Typography>
                        </TouchableOpacity>
                    </View>

                    {/* 2. INPUT BLOCK (PAPER LOOK) */}
                    <View style={styles.inputContainer}>
                        <TextInput
                            ref={inputRef}
                            style={styles.textInput}
                            placeholder="Sift a new URL..."
                            placeholderTextColor="#888"
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
                            <Plus size={20} color={COLORS.paper} weight="bold" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 3. HERO CAROUSEL */}
                {activeFilter === 'All' && <HeroCarousel pages={pages} />}

                {/* 4. FILTER BAR */}
                <FilterBar
                    filters={allTags}
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
                        <Typography variant="body" color={COLORS.stone}>No pages found</Typography>
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
        paddingHorizontal: SPACING.l,
        marginTop: SPACING.m,
        marginBottom: SPACING.l,
    },
    bentoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.l,
    },
    greetingBox: {
        flex: 1,
        marginBottom: 24,
    },
    smallCapsLabel: {
        fontSize: 11,
        letterSpacing: 1.5,
        color: '#999',
        fontFamily: 'Inter_500Medium',
        marginBottom: 4,
    },
    serifTitle: {
        fontFamily: 'PlayfairDisplay_700Bold',
        fontSize: 32,
        color: '#1A1A1A',
        lineHeight: 40,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 54,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: SPACING.m,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
    },
    textInput: {
        flex: 1,
        fontSize: 17,
        fontFamily: 'PlayfairDisplay_600SemiBold', // Serif for "Paper" look
        fontStyle: 'italic',
        color: COLORS.ink,
    },
    submitButton: {
        backgroundColor: COLORS.ink,
        width: 36,
        height: 36,
        borderRadius: 18,
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

