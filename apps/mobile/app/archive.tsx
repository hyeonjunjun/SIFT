import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, ScrollView, RefreshControl, Image, TouchableOpacity, Alert, Text, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { Theme, COLORS, SPACING, RADIUS } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';
import { Typography } from '../components/design-system/Typography';
import { CaretLeft, Trash } from 'phosphor-react-native';
import { API_URL } from '../lib/config';
import * as Haptics from 'expo-haptics';
import SiftFeed from '../components/SiftFeed';
import ScreenWrapper from '../components/ScreenWrapper';
import { useAuth } from '../lib/auth';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [refreshing, setRefreshing] = useState(false);

    const { data: pages = [], isLoading: loading, refetch } = useQuery({
        queryKey: ['pages', 'archived', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            console.log(`[Fetch] Fetching archived pages for user: ${user.id}`);
            const apiUrl = `${API_URL}/api/archive?user_id=${user.id}`;
            const response = await fetch(apiUrl);
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        },
        enabled: !!user?.id,
    });

    const onRefresh = async () => {
        setRefreshing(true);
        await queryClient.resetQueries({ queryKey: ['pages', 'archived', user?.id] });
        setRefreshing(false);
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

            queryClient.resetQueries({ queryKey: ['pages', user?.id] });
            queryClient.resetQueries({ queryKey: ['pages', 'archived', user?.id] });
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
                            queryClient.resetQueries({ queryKey: ['pages', 'archived', user?.id] });
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
        <ScreenWrapper edges={['top', 'bottom']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <CaretLeft color={colors.ink} size={28} />
                </TouchableOpacity>
                <View style={styles.headerTitleBox}>
                    <Typography variant="label" color="stone" style={styles.smallCapsLabel}>YOUR TRASH</Typography>
                    <Typography variant="h1" style={styles.serifTitle}>Archive</Typography>
                </View>
            </View>

            <ScrollView
                scrollEventThrottle={16}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />}
            >
                {pages.length === 0 && !loading ? (
                    <View style={styles.emptyState}>
                        <Trash size={48} color={colors.stone} weight="thin" />
                        <Typography variant="body" color="stone" style={{ marginTop: 16 }}>Trash is empty</Typography>
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
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 20,
        paddingTop: 60,
        marginBottom: 24,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    backButton: {
        marginTop: 4,
        marginRight: 12,
    },
    headerTitleBox: {
        flex: 1,
    },
    smallCapsLabel: {
        marginBottom: 4,
    },
    serifTitle: {
        fontSize: 34, // Matches h1 definition but within local styles context if needed
    },
    scrollContent: {
        paddingTop: 20,
        paddingBottom: 140,
    },
    emptyState: {
        paddingTop: 100,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
