import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Image, TouchableOpacity, Alert, Text } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { Theme } from '../lib/theme';
import { Typography } from '../components/design-system/Typography';
import { ArrowLeft, RotateCcw, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface Page {
    id: string;
    title: string;
    summary: string;
    tags: string[];
    created_at: string;
    url: string;
    metadata?: {
        image_url?: string;
    };
}

export default function ArchiveScreen() {
    const router = useRouter();
    const [pages, setPages] = useState<Page[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchArchived = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('pages')
                .select('*')
                .eq('is_archived', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setPages(data as Page[]);
        } catch (e) {
            console.error('Error fetching archive:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchArchived();
    }, [fetchArchived]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchArchived();
    };

    const handleRestore = async (id: string) => {
        try {
            const { error } = await supabase
                .from('pages')
                .update({ is_archived: false })
                .eq('id', id);

            if (error) throw error;

            setPages(prev => prev.filter(p => p.id !== id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to restore page");
        }
    };

    const handleDeleteForever = (id: string) => {
        Alert.alert(
            "Delete Forever",
            "This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('pages')
                                .delete() // Hard delete
                                .eq('id', id);

                            if (error) throw error;

                            setPages(prev => prev.filter(p => p.id !== id));
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } catch (e) {
                            console.error(e);
                            Alert.alert("Error", "Failed to delete page");
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-canvas">
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View className="px-5 py-4 flex-row items-center border-b border-border/50">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <ArrowLeft color={Theme.colors.text.primary} size={24} />
                </TouchableOpacity>
                <Typography variant="h3" className="text-ink">Archive</Typography>
            </View>

            <ScrollView
                contentContainerClassName="p-5 pb-32"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.text.primary} />}
            >
                {pages.length === 0 && !loading ? (
                    <View className="items-center justify-center mt-20 opacity-50">
                        <Trash2 size={48} color={Theme.colors.text.tertiary} />
                        <Typography variant="body" className="mt-4 text-ink-secondary">Trash is empty</Typography>
                    </View>
                ) : (
                    pages.map(page => (
                        <View key={page.id} className="bg-white rounded-xl p-4 mb-3 border border-border/50 shadow-sm flex-row justify-between items-center">
                            <View className="flex-1 mr-4">
                                <Typography variant="h4" numberOfLines={1} className="mb-1 text-ink">{page.title}</Typography>
                                <Typography variant="caption" className="text-ink-secondary" numberOfLines={1}>{page.url}</Typography>
                            </View>

                            <View className="flex-row gap-2">
                                <TouchableOpacity
                                    onPress={() => handleRestore(page.id)}
                                    className="p-2 bg-green-50 rounded-full"
                                >
                                    <RotateCcw size={18} color="#059669" />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => handleDeleteForever(page.id)}
                                    className="p-2 bg-red-50 rounded-full"
                                >
                                    <Trash2 size={18} color="#DC2626" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
