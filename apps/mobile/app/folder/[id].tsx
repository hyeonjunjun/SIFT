import * as React from 'react';
import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, RefreshControl, Alert, Platform } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { CaretLeft, Folder, ShareNetwork, DotsThree, Plus } from 'phosphor-react-native';
import { Typography } from '../../components/design-system/Typography';
import { COLORS, SPACING, RADIUS } from '../../lib/theme';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import SiftFeed from '../../components/SiftFeed';
import { FolderModal, FolderData } from '../../components/modals/FolderModal';
import { ActionSheet } from '../../components/modals/ActionSheet';
import { SiftPickerModal } from '../../components/modals/SiftPickerModal';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Minus, Trash } from 'phosphor-react-native';

interface FolderItem {
    id: string;
    name: string;
    color: string;
    icon: string;
    sort_order: number;
    created_at: string;
    is_pinned?: boolean;
}

export default function FolderScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { colors } = useTheme();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [refreshing, setRefreshing] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [actionSheetVisible, setActionSheetVisible] = useState(false);

    // Folder Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [siftPickerVisible, setSiftPickerVisible] = useState(false);

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
                .order('is_pinned', { ascending: false })
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
            .update({
                name: folderData.name,
                color: folderData.color,
                icon: folderData.icon,
                is_pinned: folderData.is_pinned
            })
            .eq('id', id);
        if (error) throw error;
        queryClient.resetQueries({ queryKey: ['folder', id] });
        queryClient.resetQueries({ queryKey: ['folders', user?.id] });
    };

    const handleAddSifts = async (selectedIds: string[]) => {
        if (!id) return;
        try {
            const updates = selectedIds.map(siftId => ({
                id: siftId,
                folder_id: id
            }));

            // Batch update using upsert or loop (Sift doesn't support batch update easily via client lib sometimes, 
            // but we can try updating pages where ID in list)

            // Using a loop for safety as batch update on single table requires different syntax usually
            const { error } = await supabase
                .from('pages')
                .update({ folder_id: id })
                .in('id', selectedIds);

            if (error) throw error;

            await refetch();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to add sifts.");
        }
    };

    const handleRemoveSift = async (siftId: string) => {
        // Optimistic update
        const previousPages = queryClient.getQueryData(['folder-pages', id]);
        queryClient.setQueryData(['folder-pages', id], (old: any[]) => old.filter(p => p.id !== siftId));

        const { error } = await supabase
            .from('pages')
            .update({ folder_id: null })
            .eq('id', siftId);

        if (error) {
            queryClient.setQueryData(['folder-pages', id], previousPages);
            Alert.alert("Error", "Failed to remove sift.");
        }
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
        queryClient.invalidateQueries({ queryKey: ['folders', user?.id] });
        router.back();
    };

    const toggleEditMode = () => {
        setIsEditing(!isEditing);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const handleShare = async () => {
        if (!folder) return;
        const deepLink = `sift://folder/${folder.id}`;
        await Clipboard.setStringAsync(deepLink);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Link Copied', `Share this link:\n${deepLink}`);
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
                {isEditing ? (
                    <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.backButton}>
                        <Typography variant="label" color="ink" style={{ fontWeight: '700', letterSpacing: 1 }}>DONE</Typography>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <CaretLeft size={28} color={colors.ink} />
                    </TouchableOpacity>
                )}

                <View style={[styles.headerCenter, isEditing && { alignItems: 'flex-start', marginLeft: 16 }]}>
                    {!isEditing && (
                        <View style={[styles.folderIcon, { backgroundColor: folder.color }]}>
                            <Folder size={20} color="#FFFFFF" weight="fill" />
                        </View>
                    )}
                    <View>
                        {isEditing && (
                            <Typography variant="label" color="stone" style={{ fontSize: 10, letterSpacing: 1, fontWeight: '700', marginBottom: 2 }}>
                                MANAGING
                            </Typography>
                        )}
                        <Typography variant="h3" numberOfLines={1} style={{ fontSize: 20, fontFamily: 'PlayfairDisplay_600SemiBold' }}>
                            {folder.name}
                        </Typography>
                    </View>
                </View>

                {isEditing ? (
                    <TouchableOpacity onPress={() => {
                        Haptics.selectionAsync();
                        setSiftPickerVisible(true);
                    }} style={styles.actionButton}>
                        <Plus size={24} color={colors.ink} />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
                            <ShareNetwork size={22} color={colors.ink} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.selectionAsync();
                                setActionSheetVisible(true);
                            }}
                            style={styles.actionButton}
                        >
                            <DotsThree size={24} color={colors.ink} weight="bold" />
                        </TouchableOpacity>
                    </View>
                )}
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
                mode={isEditing ? 'edit' : 'feed'}
                onRemove={handleRemoveSift}
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
                existingFolder={{
                    id: folder.id,
                    name: folder.name,
                    color: folder.color,
                    icon: folder.icon,
                    is_pinned: folder.is_pinned
                }}
            />

            <ActionSheet
                visible={actionSheetVisible}
                onClose={() => setActionSheetVisible(false)}
                title={folder.name}
                options={[
                    {
                        label: `Manage ${folder.name}`,
                        onPress: () => {
                            setIsEditing(true);
                        }
                    },
                    {
                        label: 'Edit Folder Details',
                        onPress: () => {
                            setTimeout(() => setEditModalVisible(true), 200);
                        }
                    },
                    {
                        label: 'Delete Folder',
                        isDestructive: true,
                        onPress: () => {
                            Alert.alert(
                                "Delete Folder",
                                "Are you sure you want to delete this folder? This action cannot be undone.",
                                [
                                    { text: "Cancel", style: "cancel" },
                                    { text: "Delete", style: "destructive", onPress: () => handleDeleteFolder(id as string) }
                                ]
                            );
                        }
                    },
                    {
                        label: 'Cancel',
                        isCancel: true,
                        onPress: () => { }
                    }
                ]}
            />

            <SiftPickerModal
                visible={siftPickerVisible}
                onClose={() => setSiftPickerVisible(false)}
                onSelect={handleAddSifts}
                currentFolderSiftIds={pages.map((p: any) => p.id)}
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
    listHeader: {
        marginBottom: 16,
    },
});
