import { View, ScrollView, RefreshControl, TextInput, TouchableOpacity, AppState, DeviceEventEmitter, Pressable, Keyboard, StyleSheet } from "react-native";
import { useEffect, useState, useCallback, useRef } from "react";
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Archive, Plus, House, User, MagnifyingGlass } from 'phosphor-react-native';
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
    const [activeFilter, setActiveFilter] = useState("All");
    const router = useRouter();
    const params = useLocalSearchParams();

    useEffect(() => {
        if (params.siftUrl) {
            const url = decodeURIComponent(params.siftUrl as string);
            processSharedUrl(url);
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

    const checkClipboard = useCallback(async () => {
        try {
            const content = await Clipboard.getStringAsync();
            if (!content) return;
            const isUrl = content.startsWith('http://') || content.startsWith('https://');
            if (isUrl && content !== lastCheckedUrl.current) {
                lastCheckedUrl.current = content;
                showToast("Link detected from clipboard.", 5000, {
                    label: "Sift It",
                    onPress: () => {
                        setManualUrl(content);
                        processSharedUrl(content);
                    }
                }, {
                    label: "Dismiss",
                    onPress: () => { }
                });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (e) { }
    }, []);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active') checkClipboard();
        });
        checkClipboard();
        return () => subscription.remove();
    }, [checkClipboard]);

    const fetchPages = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('pages')
                .select('*')
                .eq('is_archived', false)
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false });

            if (data) setPages(data as Page[]);
        } catch (e) {
            console.error('Exception fetching pages:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const [processingUrl, setProcessingUrl] = useState<string | null>(null);

    const processSharedUrl = async (url: string) => {
        if (processingUrl === url) return;
        setProcessingUrl(url);
        showToast("Currently Sifting...", 0);
        const feedbackTimer = setTimeout(() => showToast("Still sifting...", 0), 15000);
        try {
            await safeSift(url);
            showToast("Sifted!");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
            showToast(error.message || "Error sifting");
        } finally {
            clearTimeout(feedbackTimer);
            setTimeout(() => setProcessingUrl(null), 2000);
        }
    };

    useEffect(() => {
        const intent = shareIntent as any;
        if (hasShareIntent && intent?.value) {
            if (intent.type === 'text' || intent.type === 'weburl') {
                processSharedUrl(intent.value);
                resetShareIntent();
            }
        }
    }, [hasShareIntent, shareIntent, resetShareIntent, processSharedUrl]);

    const handleDeepLink = useCallback((event: { url: string }) => {
        try {
            const parsed = Linking.parse(event.url);
            if (parsed.path === 'share' || parsed.queryParams?.url) {
                const sharedUrl = parsed.queryParams?.url;
                if (typeof sharedUrl === 'string') {
                    setTimeout(() => processSharedUrl(sharedUrl), 500);
                }
            }
        } catch (e) { }
    }, [processSharedUrl]);

    useEffect(() => {
        fetchPages();
        const getInitialURL = async () => {
            const initialUrl = await Linking.getInitialURL();
            if (initialUrl) handleDeepLink({ url: initialUrl });
        };
        getInitialURL();
        const listener = Linking.addEventListener('url', handleDeepLink);
        const subscription = supabase
            .channel('public:pages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pages' }, (payload) => {
                setPages((prev) => [payload.new as Page, ...prev]);
                showToast("New Page Received");
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
            listener.remove();
        };
    }, [fetchPages, handleDeepLink]);

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
            const debuggerHost = Constants.expoConfig?.hostUri;
            const localhost = debuggerHost?.split(':')[0] || 'localhost';
            const apiUrl = `${API_URL}/api/archive`; // Use standardized config

            const response = await fetch(apiUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action: 'archive' })
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
            const apiUrl = `${API_URL}/api/archive?id=${id}`;
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
            processSharedUrl(manualUrl.trim());
            setManualUrl("");
        }
    }

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
                        <View style={styles.greetingBox}>
                            <Typography variant="label" color={COLORS.stone}>{getGreeting()}</Typography>
                            <Typography variant="h1">Dashboard</Typography>
                        </View>
                        <TouchableOpacity
                            onPress={() => router.push('/archive')}
                            style={styles.archiveIcon}
                        >
                            <Archive size={22} color={COLORS.ink} />
                        </TouchableOpacity>
                    </View>

                    {/* 2. INPUT BLOCK (BENTO) */}
                    <View style={styles.inputBlock}>
                        <View style={styles.inputContainer}>
                            <TextInput
                                ref={inputRef}
                                style={styles.textInput}
                                placeholder="Sift a new URL..."
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
                                <Plus size={20} color={COLORS.paper} weight="bold" />
                            </TouchableOpacity>
                        </View>
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
    },
    archiveIcon: {
        backgroundColor: COLORS.paper,
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        ...Theme.shadows.soft,
    },
    inputBlock: {
        backgroundColor: COLORS.paper,
        borderRadius: RADIUS.l,
        padding: SPACING.m,
        ...Theme.shadows.soft,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        backgroundColor: COLORS.vapor,
        borderRadius: RADIUS.m,
        paddingHorizontal: SPACING.m,
    },
    textInput: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'Inter_400Regular',
        color: COLORS.ink,
    },
    submitButton: {
        backgroundColor: COLORS.ink,
        width: 32,
        height: 32,
        borderRadius: 16,
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

