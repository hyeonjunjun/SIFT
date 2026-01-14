import { View, ScrollView, RefreshControl, TextInput, TouchableOpacity, AppState, DeviceEventEmitter, Pressable, Keyboard } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState, useCallback, useRef } from "react";
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Archive, Trash2 } from 'lucide-react-native';
import { supabase } from "../../lib/supabase";
import { Toast } from "../../components/Toast";
import { Typography } from "../../components/design-system/Typography";
import { Theme } from "../../lib/theme";
import { API_URL } from "../../lib/config";
import { HeroCarousel } from "../../components/home/HeroCarousel";
import { FilterBar } from "../../components/home/FilterBar";
import SiftFeed from "../../components/SiftFeed";
// import { MasonryList } from "../../components/home/MasonryList"; // Unused now
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

export default function Index() {
    const scrollViewRef = useRef<ScrollView>(null);
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

    const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

    // Filter State
    const [activeFilter, setActiveFilter] = useState("All");

    const router = useRouter();
    const params = useLocalSearchParams();

    // Listen for manual redirect params (from share.tsx)
    useEffect(() => {
        if (params.siftUrl) {
            const url = decodeURIComponent(params.siftUrl as string);
            console.log("Index received siftUrl param:", url);
            // Clear param to avoid loop? Next.js router handles this, Expo router might persist.
            // But processSharedUrl checks for duplicates so it's fine.
            processSharedUrl(url);

            // Optional cleanup visual
            router.setParams({ siftUrl: undefined });
        }
    }, [params.siftUrl]);

    // Derived: Strict Tags Only
    const allTags = ALLOWED_TAGS;

    // Derived: Filtered Pages
    const filteredPages = activeFilter === 'All'
        ? pages
        : pages
            .filter(p => p.tags?.some(t => t.toLowerCase() === activeFilter.toLowerCase()))
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());


    const showToast = (message: string, action?: { label: string, onPress: () => void }, secondaryAction?: { label: string, onPress: () => void }) => {
        setToastMessage(message);
        setToastAction(action);
        setToastSecondaryAction(secondaryAction);
        setToastVisible(true);
    };

    // Greeting Logic
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    // Listen for Double Tap
    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('scrollToTopDashboard', () => {
            if (scrollViewRef.current) {
                scrollViewRef.current.scrollTo({ y: 0, animated: true });
                Haptics.selectionAsync(); // Subtle feedback
            }
        });
        return () => sub.remove();
    }, []);

    // Magic Entry: Clipboard Snoop
    const checkClipboard = useCallback(async () => {
        try {
            const content = await Clipboard.getStringAsync();
            if (!content) return;

            // Simple URL valid check
            const isUrl = content.startsWith('http://') || content.startsWith('https://');

            // Should verify it's not the same URL we just processed or snooped
            if (isUrl && content !== lastCheckedUrl.current) {
                // Check if we already have this page? (Optional optimization)
                // For now, just prompt.
                lastCheckedUrl.current = content; // Mark as seen so we don't spam

                showToast("Link detected from clipboard.", {
                    label: "Sift It",
                    onPress: () => {
                        setManualUrl(content); // Pre-fill visual
                        processSharedUrl(content);
                    }
                }, {
                    label: "Dismiss",
                    onPress: () => {
                        // Do nothing, just close
                    }
                });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (e) {
            // Ignore clipboard errors
        }
    }, []);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active') {
                checkClipboard();
            }
        });

        // Initial check on mount
        checkClipboard();

        return () => {
            subscription.remove();
        };
    }, [checkClipboard]);

    const fetchPages = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('pages')
                .select('*')
                .eq('is_archived', false) // Filter out archived
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching pages:', error);
            } else if (data) {
                setPages(data as Page[]);
            }
        } catch (e) {
            console.error('Exception fetching pages:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const [processingUrl, setProcessingUrl] = useState<string | null>(null);

    const processSharedUrl = async (url: string) => {
        if (processingUrl === url) return; // Prevent duplicate clicks/intents
        console.log('Processing shared URL:', url);

        setProcessingUrl(url);
        showToast("Currently Sifting...");

        // "Taking longer" feedback (Optional, safeSift handles the actual fetch)
        const feedbackTimer = setTimeout(() => {
            showToast("Still sifting...", undefined, undefined);
        }, 30000);

        try {
            // Layer 2: Pipeline Guard
            await safeSift(url);

            // Success handled by Realtime + Toast
            showToast("Sifted!");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        } catch (error: any) {
            console.error('Error processing URL:', error);
            // Error toast handled by safeSift or here? 
            // safeSift throws, so we catch here.
            showToast(error.message || "Error sifting");
        } finally {
            clearTimeout(feedbackTimer);
            setTimeout(() => setProcessingUrl(null), 2000); // Cooldown
        }
    };



    useEffect(() => {
        const intent = shareIntent as any;
        if (hasShareIntent && intent?.value) {
            console.log("Share Intent Received:", intent);
            if (intent.type === 'text' || intent.type === 'weburl') {
                processSharedUrl(intent.value);
                resetShareIntent();
            }
        }
    }, [hasShareIntent, shareIntent, resetShareIntent, processSharedUrl]);

    const handleDeepLink = useCallback((event: { url: string }) => {
        try {
            const parsed = Linking.parse(event.url);
            // Handle sift://share?url=...
            if (parsed.path === 'share' || parsed.queryParams?.url) {
                const sharedUrl = parsed.queryParams?.url;
                if (typeof sharedUrl === 'string') {
                    // Slight delay to allow app to hydrate if fresh launch
                    setTimeout(() => processSharedUrl(sharedUrl), 500);
                }
            }
        } catch (e) {
            console.error("Deep link parse error", e);
        }
    }, [processSharedUrl]);

    useEffect(() => {
        fetchPages();

        const getInitialURL = async () => {
            try {
                const initialUrl = await Linking.getInitialURL();
                if (initialUrl) {
                    handleDeepLink({ url: initialUrl });
                }
            } catch (e) {
                console.error("Initial URL check failed", e);
            }
        };

        getInitialURL();
        const listener = Linking.addEventListener('url', handleDeepLink);

        const subscription = supabase
            .channel('public:pages')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'pages' },
                (payload) => {
                    console.log('New page received:', payload.new);
                    setPages((prev) => {
                        // Check if we need to re-sort?
                        // Ideally we just fetchPages again or careful insert. 
                        // Simple: prepend.
                        return [payload.new as Page, ...prev];
                    });
                    showToast("New Page Received");
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
            listener.remove();
        };
    }, [fetchPages, handleDeepLink]);

    const lastScrollY = useRef(0);
    const onScroll = useCallback((event: any) => {
        const y = event.nativeEvent.contentOffset.y;
        // Trigger haptic every 100px of scroll for a "tick" feel
        if (Math.abs(y - lastScrollY.current) > 100) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            lastScrollY.current = y;
        }
    }, []);

    const onRefresh = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // Tactile "Thud"
        setRefreshing(true);
        fetchPages();
    }, [fetchPages]);

    const deletePage = async (id: string) => {
        try {
            // Soft Delete via API (Bypass RLS)
            const debuggerHost = Constants.expoConfig?.hostUri;
            const localhost = debuggerHost?.split(':')[0] || 'localhost';
            const apiUrl = `http://${localhost}:3000/api/archive`;

            const response = await fetch(apiUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action: 'archive' })
            });

            if (!response.ok) throw new Error('Failed to archive');

            // Optimistic Remove
            setPages((prev) => prev.filter((p) => p.id !== id));
            showToast("Moved to Archive");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error('Error archiving page:', error);
            showToast("Archive failed");
        }
    };

    const deletePageForever = async (id: string) => {
        try {
            // Hard Delete via API (Bypass RLS)
            const debuggerHost = Constants.expoConfig?.hostUri;
            const localhost = debuggerHost?.split(':')[0] || 'localhost';
            const apiUrl = `http://${localhost}:3000/api/archive?id=${id}`;

            const response = await fetch(apiUrl, { method: 'DELETE' });

            if (!response.ok) throw new Error('Failed to delete');

            // Optimistic Remove
            setPages((prev) => prev.filter((p) => p.id !== id));
            showToast("Permanently Deleted");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error('Error deleting page:', error);
            showToast("Delete failed");
        }
    };

    const togglePin = async (id: string) => {
        try {
            // Optimistic update
            setPages(prev => {
                const updated = prev.map(p => p.id === id ? { ...p, is_pinned: !p.is_pinned } : p);
                // Re-sort locally: Pinned first, then Created At
                return updated.sort((a, b) => {
                    if (a.is_pinned === b.is_pinned) {
                        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                    }
                    return (a.is_pinned ? -1 : 1);
                });
            });

            // Find current state to toggle DB
            const page = pages.find(p => p.id === id);
            if (!page) return;

            const { error } = await supabase
                .from('pages')
                .update({ is_pinned: !page.is_pinned })
                .eq('id', id);

            if (error) throw error;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        } catch (error) {
            console.error('Error toggling pin:', error);
            showToast("Action failed");
            // Revert on error? For now, we accept risk of desync until refresh.
        }
    };

    const handleSubmitUrl = () => {
        if (manualUrl.trim()) {
            Keyboard.dismiss();
            processSharedUrl(manualUrl.trim());
            setManualUrl("");
        }
    }

    return (
        <SafeAreaView className="flex-1 bg-canvas">
            <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={{ paddingBottom: 140 }}
                onScroll={onScroll}
                scrollEventThrottle={16}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.text.primary} />
                }
            >
                <View className="mb-2 mt-2">
                    {/* Header & Input */}
                    <View className="px-5 mb-6">
                        <View className="flex-row justify-between items-center mb-4">
                            <View>
                                <Typography variant="caption" className="text-ink-secondary/70 uppercase tracking-widest font-semibold mb-1">
                                    {getGreeting()}
                                </Typography>
                                <Typography variant="h1" className="text-[34px] font-bold tracking-tight text-ink">
                                    Ryan
                                </Typography>
                            </View>
                            <TouchableOpacity
                                onPress={() => router.push('/archive')}
                                className="bg-white p-3 rounded-full border border-border/50 shadow-sm active:bg-gray-50"
                            >
                                <Archive size={22} color={Theme.colors.text.primary} />
                            </TouchableOpacity>
                        </View>

                        <Pressable
                            onPress={() => inputRef.current?.focus()}
                            className="flex-row items-center bg-white h-[50px] rounded-full px-4 border border-border/50 shadow-sm"
                            style={Theme.shadows.card}
                        >
                            <TextInput
                                ref={inputRef}
                                className="flex-1 text-ink font-sans text-[17px] ml-2"
                                placeholder="Sift a new URL..."
                                placeholderTextColor={Theme.colors.text.tertiary}
                                value={manualUrl}
                                onChangeText={setManualUrl}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="url"
                                returnKeyType="go"
                                onSubmitEditing={handleSubmitUrl}
                            />
                            <TouchableOpacity
                                className="bg-ink h-8 w-8 rounded-full items-center justify-center ml-2 active:opacity-80"
                                onPress={handleSubmitUrl}
                            >
                                <View className="border-t-2 border-r-2 border-white w-2 h-2 rotate-45 mr-[2px]" />
                            </TouchableOpacity>
                        </Pressable>
                    </View>

                    {/* Hero Carousel */}
                    {/* Hide Hero on Filter? Or keep? Keeping for now. */}
                    {activeFilter === 'All' && <HeroCarousel pages={pages} />}

                    {/* Filter Bar */}
                    <FilterBar
                        filters={allTags}
                        activeFilter={activeFilter}
                        onSelect={setActiveFilter}
                    />

                    {/* Sift Masonry Feed */}
                    <SiftFeed
                        pages={filteredPages}
                        loading={loading}
                        onArchive={deletePage}
                        onPin={togglePin}
                        onDeleteForever={deletePageForever}
                    />
                </View>

                {filteredPages.length === 0 && (
                    <View className="mt-12 items-center justify-center p-8 opacity-60">
                        <Typography variant="body" className="text-center font-medium">No pages found</Typography>
                    </View>
                )}
            </ScrollView>

            <Toast
                message={toastMessage}
                visible={toastVisible}
                onHide={() => setToastVisible(false)}
                action={toastAction}
                secondaryAction={toastSecondaryAction}
            />
        </SafeAreaView>
    );
}
