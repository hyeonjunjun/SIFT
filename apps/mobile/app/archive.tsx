import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Image, TouchableOpacity, Alert, Text } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
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
            const debuggerHost = Constants.expoConfig?.hostUri;
            const localhost = debuggerHost?.split(':')[0] || 'localhost';
            const apiUrl = `http://${localhost}:3000/api/archive`;

            const response = await fetch(apiUrl);
            const data = await response.json();

            if (Array.isArray(data)) {
                setPages(data);
            }
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
            const debuggerHost = Constants.expoConfig?.hostUri;
            const localhost = debuggerHost?.split(':')[0] || 'localhost';
            const apiUrl = `http://${localhost}:3000/api/archive`;

            const response = await fetch(apiUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action: 'restore' })
            });

            if (!response.ok) throw new Error('Failed');

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
                            const debuggerHost = Constants.expoConfig?.hostUri;
                            const localhost = debuggerHost?.split(':')[0] || 'localhost';
                            const apiUrl = `http://${localhost}:3000/api/archive?id=${id}`;

                            const response = await fetch(apiUrl, { method: 'DELETE' });

                            if (!response.ok) throw new Error('Failed');

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
                                <Typography variant="h3" numberOfLines={1} className="mb-1 text-ink text-base">{page.title}</Typography>
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
