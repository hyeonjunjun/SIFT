import { View, ScrollView, RefreshControl, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState, useCallback } from "react";
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { Archive, Trash2 } from 'lucide-react-native';
import { supabase } from "../../lib/supabase";
import { Toast } from "../../components/Toast";
import { Typography } from "../../components/design-system/Typography";
import { Theme } from "../../lib/theme";
import { HeroCarousel } from "../../components/home/HeroCarousel";
import { FilterBar } from "../../components/home/FilterBar";
import { MasonryList } from "../../components/home/MasonryList";
import { useRouter } from "expo-router";

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
    const [pages, setPages] = useState<Page[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [toastVisible, setToastVisible] = useState(false);
    const [manualUrl, setManualUrl] = useState("");

    // Filter State
    const [activeFilter, setActiveFilter] = useState("All");

    const router = useRouter();

    // Derived: Unique Tags
    const allTags = Array.from(new Set(pages.flatMap(p => p.tags || []))).sort();

    // Derived: Filtered Pages
    const filteredPages = activeFilter === 'All'
        ? pages
        : pages
            .filter(p => p.tags?.includes(activeFilter))
            // When filtering, we might want to ignore 'pinned' sort and just show relevance/date?
            // User said "hide pinned posts (do not remove pinned state)". 
            // So we re-sort purely by date for the filtered view?
            // The original 'pages' is already sorted by pin then date. filter() preserves order.
            // If we want to "hide" the pinned nature, we should resort by created_at.
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());


    const showToast = (message: string) => {
        setToastMessage(message);
        setToastVisible(true);
    };

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

    const processSharedUrl = async (url: string) => {
        console.log('Processing shared URL:', url);
        showToast("Sifting...");

        try {
            const debuggerHost = Constants.expoConfig?.hostUri;
            const localhost = debuggerHost?.split(':')[0] || 'localhost';
            const apiUrl = `http://${localhost}:3000/api/sift`;

            console.log('Calling API at:', apiUrl);

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: url,
                    platform: 'share_sheet',
                }),
            });

            if (!response.ok) {
                const text = await response.text();
                // console.error('API Error:', text); // Optional log
                throw new Error('API failed');
            }

            // Success is handled by Realtime subscription
            showToast("Sifted!");

        } catch (error) {
            console.error('Error processing URL:', error);
            showToast("Error sifting");
        }
    };

    const handleDeepLink = useCallback((event: Linking.EventType) => {
        const { url } = event;
        const parsed = Linking.parse(url);

        if (parsed.queryParams?.url) {
            const targetUrl = parsed.queryParams.url as string;
            processSharedUrl(targetUrl);
        }
    }, []);

    useEffect(() => {
        fetchPages();

        const getInitialURL = async () => {
            // ... existing deep link logic checks ...
            const initialUrl = await Linking.getInitialURL();
            if (initialUrl) {
                const parsed = Linking.parse(initialUrl);
                if (parsed.queryParams?.url) {
                    processSharedUrl(parsed.queryParams.url as string);
                }
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

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchPages();
    }, [fetchPages]);

    const deletePage = async (id: string) => {
        try {
            const { error } = await supabase.from('pages').delete().eq('id', id);
            if (error) throw error;
            setPages((prev) => prev.filter((p) => p.id !== id));
            showToast("Page Deleted");
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
            processSharedUrl(manualUrl.trim());
            setManualUrl("");
        }
    }

    return (
        <SafeAreaView className="flex-1 bg-canvas">
            <ScrollView
                contentContainerClassName="pb-32"
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
                                    Good Afternoon
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

                        <View className="flex-row items-center bg-white h-[50px] rounded-full px-4 border border-border/50 shadow-sm" style={Theme.shadows.card}>
                            <TextInput
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
                        </View>
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

                    {/* Masonry Feed */}
                    <MasonryList pages={filteredPages} onDelete={deletePage} onPin={togglePin} />
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
            />
        </SafeAreaView>
    );
}
