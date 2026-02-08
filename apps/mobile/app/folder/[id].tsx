import * as React from 'react';
import { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { CaretLeft, PencilSimple, Folder, ShareNetwork, Trash } from 'phosphor-react-native';
import { Typography } from '../../components/design-system/Typography';
import { COLORS, SPACING, RADIUS, Theme } from '../../lib/theme';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import SiftFeed from '../../components/SiftFeed';
import { FolderModal, FolderData } from '../../components/modals/FolderModal';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

interface FolderItem {
    id: string;
    name: string;
    color: string;
    icon: string;
    sort_order: number;
    created_at: string;
}

export default function FolderScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [refreshing, setRefreshing] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);

    // Fetch folder details
    const { data: folder } = useQuery({
        queryKey: ['folder', id],
        queryFn: async () => {
            if (!id) return null;
            const { data, error } = await supabase
                .from('folders')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            return data as FolderItem;
        },
        enabled: !!id,
    });

    // Fetch pages in this folder
    const { data: pages = [], isLoading, refetch } = useQuery({
        queryKey: ['folder-pages', id],
        queryFn: async () => {
            if (!id) return [];
            const { data, error } = await supabase
                .from('pages')
                .select('id, title, url, tags, created_at, metadata')
                .eq('folder_id', id)
                .eq('is_archived', false)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!id,
    });

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const handleUpdateFolder = async (folderData: FolderData) => {
        const { error } = await supabase
            .from('folders')
            .update({ name: folderData.name, color: folderData.color, icon: folderData.icon })
            .eq('id', id);
        if (error) throw error;
        queryClient.resetQueries({ queryKey: ['folder', id] });
        queryClient.resetQueries({ queryKey: ['folders', user?.id] });
    };

    const handleDeleteFolder = async (folderId: string) => {
        // Unassign sifts
        await supabase
            .from('pages')
            .update({ folder_id: null })
            .eq('folder_id', folderId);
        // Delete folder
        const { error } = await supabase
            .from('folders')
            .delete()
            .eq('id', folderId);
        if (error) throw error;
        queryClient.resetQueries({ queryKey: ['folders', user?.id] });
        router.back();
    };

    const handleShare = async () => {
        if (!folder) return;
        const deepLink = `sift://folder/${folder.id}`;
        await Clipboard.setStringAsync(deepLink);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Link Copied', `Share this link:\n${deepLink}`);
    };

    const handleRemoveFromFolder = async (pageId: string) => {
        const { error } = await supabase
            .from('pages')
            .update({ folder_id: null })
            .eq('id', pageId);
        if (error) {
            Alert.alert('Error', 'Failed to remove from folder');
            return;
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        refetch();
    };

    if (!folder) {
        return (
            <ScreenWrapper edges={['top']}>
                <View style={styles.loading}>
                    <Typography variant="body" color="stone">Loading...</Typography>
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <CaretLeft size={28} color={colors.ink} />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <View style={[styles.folderIcon, { backgroundColor: folder.color }]}>
                        <Folder size={20} color="#FFFFFF" weight="fill" />
                    </View>
                    <Typography variant="h3" numberOfLines={1} style={{ flex: 1 }}>
                        {folder.name}
                    </Typography>
                </View>

                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
                        <ShareNetwork size={22} color={colors.ink} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEditModalVisible(true)} style={styles.actionButton}>
                        <PencilSimple size={22} color={colors.ink} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Stats */}
            <View style={[styles.statsBar, { backgroundColor: colors.subtle, borderColor: colors.separator }]}>
                <Typography variant="caption" color="stone">
                    {pages.length} {pages.length === 1 ? 'sift' : 'sifts'} in this folder
                </Typography>
            </View>

            {/* Sift Feed */}
            <SiftFeed
                pages={pages as any}
                loading={isLoading}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />
                }
                contentContainerStyle={styles.feedContainer}
            />

            {pages.length === 0 && !isLoading && (
                <View style={styles.emptyState}>
                    <Folder size={48} color={COLORS.stone} weight="thin" />
                    <Typography variant="body" color="stone" style={{ marginTop: SPACING.m }}>
                        No sifts in this folder yet.
                    </Typography>
                    <Typography variant="caption" color="stone" style={{ marginTop: 4 }}>
                        Long-press any sift to add it here.
                    </Typography>
                </View>
            )}

            <FolderModal
                visible={editModalVisible}
                onClose={() => setEditModalVisible(false)}
                onSave={handleUpdateFolder}
                onDelete={handleDeleteFolder}
                existingFolder={{ id: folder.id, name: folder.name, color: folder.color, icon: folder.icon }}
            />
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    backButton: {
        padding: 4,
    },
    headerCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
        gap: 10,
    },
    folderIcon: {
        width: 32,
        height: 32,
        borderRadius: RADIUS.s,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 4,
    },
    actionButton: {
        padding: 8,
    },
    statsBar: {
        marginHorizontal: 20,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: RADIUS.m,
        borderWidth: StyleSheet.hairlineWidth,
        marginBottom: SPACING.m,
    },
    feedContainer: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    emptyState: {
        position: 'absolute',
        top: '40%',
        left: 0,
        right: 0,
        alignItems: 'center',
    },
});
