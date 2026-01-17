import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, ScrollView, RefreshControl, Image, TouchableOpacity, Alert, Text } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { Theme } from '../lib/theme';
import { Typography } from '../components/design-system/Typography';
import { ArrowLeft, RotateCcw, Trash2 } from 'lucide-react-native';
import { API_URL } from '../lib/config';
import * as Haptics from 'expo-haptics';
import SiftFeed from '../components/SiftFeed';
import { useAuth } from '../lib/auth';

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
    const { user } = useAuth();
    const [pages, setPages] = useState<Page[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchArchived = useCallback(async () => {
        if (!user?.id) return;
        try {
            const apiUrl = `${API_URL}/api/archive?user_id=${user.id}`;

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
    }, [user?.id]);

    useEffect(() => {
        fetchArchived();
    }, [fetchArchived]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchArchived();
    };

    const handleRestore = async (id: string) => {
        try {
            const apiUrl = `${API_URL}/api/archive`;

            const response = await fetch(apiUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action: 'restore', user_id: user?.id })
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
                            const apiUrl = `${API_URL}/api/archive?id=${id}&user_id=${user?.id}`;

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

    const lastScrollY = useRef(0);
    const onScroll = useCallback((event: any) => {
        const y = event.nativeEvent.contentOffset.y;
        if (Math.abs(y - lastScrollY.current) > 100) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            lastScrollY.current = y;
        }
    }, []);

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
                onScroll={onScroll}
                scrollEventThrottle={16}
                contentContainerClassName="pt-5 pb-32"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.text.primary} />}
            >
                {pages.length === 0 && !loading ? (
                    <View className="items-center justify-center mt-20 opacity-50">
                        <Trash2 size={48} color={Theme.colors.text.tertiary} />
                        <Typography variant="body" className="mt-4 text-ink-secondary">Trash is empty</Typography>
                    </View>
                ) : (
                    <SiftFeed
                        pages={pages}
                        mode="archive"
                        loading={loading}
                        onArchive={handleRestore}
                        onDeleteForever={handleDeleteForever}
                    />
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
