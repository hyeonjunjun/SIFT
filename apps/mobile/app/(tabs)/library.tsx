import { View, ScrollView, RefreshControl, SafeAreaView, ActivityIndicator } from "react-native";
import { useState, useCallback, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Typography } from "../../components/design-system/Typography";
import { SearchBar } from "../../components/library/SearchBar";
import { MasonryList } from "../../components/home/MasonryList";
import { Toast } from "../../components/Toast";
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';

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

export default function Library() {
    const [pages, setPages] = useState<Page[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [toastMessage, setToastMessage] = useState("");
    const [toastVisible, setToastVisible] = useState(false);

    const fetchAllPages = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('pages')
                .select('*')
                .eq('is_archived', false)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPages(data || []);
        } catch (error) {
            console.error('Error fetching library:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchAllPages();
    }, [fetchAllPages]);

    const onRefresh = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setRefreshing(true);
        fetchAllPages();
    }, [fetchAllPages]);

    // Search Logic
    const filteredPages = pages.filter(page => {
        const q = searchQuery.toLowerCase();
        return (
            page.title?.toLowerCase().includes(q) ||
            page.summary?.toLowerCase().includes(q) ||
            page.tags?.some(tag => tag.toLowerCase().includes(q)) ||
            page.url?.toLowerCase().includes(q)
        );
    });

    const showToast = (message: string) => {
        setToastMessage(message);
        setToastVisible(true);
    };

    // Actions (Duplicate of Index... ideally refactor to hook)
    const deletePage = async (id: string) => {
        try {
            const debuggerHost = Constants.expoConfig?.hostUri;
            const localhost = debuggerHost?.split(':')[0] || 'localhost';
            const apiUrl = `http://${localhost}:3000/api/archive`;

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
            const debuggerHost = Constants.expoConfig?.hostUri;
            const localhost = debuggerHost?.split(':')[0] || 'localhost';
            const apiUrl = `http://${localhost}:3000/api/archive?id=${id}`;

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
            setPages(prev => prev.map(p => p.id === id ? { ...p, is_pinned: !p.is_pinned } : p));

            const { error } = await supabase
                .from('pages')
                .update({ is_pinned: !pages.find(p => p.id === id)?.is_pinned })
                .eq('id', id);

            if (error) throw error;
            Haptics.selectionAsync();
        } catch (error) {
            console.error('Error pinning page:', error);
            showToast("Error updating pin");
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-canvas">
            <View className="px-5 pt-2 pb-4">
                <Typography variant="h1" className="text-[34px] font-bold tracking-tight text-ink mb-4">
                    Library
                </Typography>
                <SearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onClear={() => setSearchQuery("")}
                />
            </View>

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator />
                </View>
            ) : (
                <ScrollView
                    className="flex-1"
                    contentContainerClassName="pb-32"
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                >
                    {filteredPages.length > 0 ? (
                        <MasonryList
                            pages={filteredPages}
                            onDelete={deletePage}
                            onDeleteForever={deletePageForever}
                            onPin={togglePin}
                        />
                    ) : (
                        <View className="flex-1 items-center justify-center py-20 opacity-60">
                            <Typography variant="h3" className="text-ink-secondary mb-2">No results found</Typography>
                            <Typography variant="body" className="text-ink-tertiary">Try a different search term</Typography>
                        </View>
                    )}
                </ScrollView>
            )}

            <Toast
                message={toastMessage}
                visible={toastVisible}
                onHide={() => setToastVisible(false)}
            />
        </SafeAreaView>
    );
}
