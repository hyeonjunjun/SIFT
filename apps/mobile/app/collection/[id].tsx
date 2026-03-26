import * as React from 'react';
import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, RefreshControl, Alert, Platform } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { CaretLeft, Folder, ShareNetwork, DotsThree, Plus } from 'phosphor-react-native';
import { Typography } from '../../components/design-system/Typography';
import { COLORS, SPACING, RADIUS, Theme } from '../../lib/theme';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import SiftFeed from '../../components/SiftFeed';
import { CollectionModal, CollectionData } from '../../components/modals/CollectionModal';
import { ActionSheet } from '../../components/modals/ActionSheet';
import { SiftPickerModal } from '../../components/modals/SiftPickerModal';
import { InviteFriendModal } from '../../components/modals/InviteFriendModal';
import { useToast } from '../../context/ToastContext';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Minus, Trash, User } from 'phosphor-react-native';
import { Image } from 'expo-image';


export default function CollectionScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { colors } = useTheme();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [refreshing, setRefreshing] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [actionSheetVisible, setActionSheetVisible] = useState(false);
    const [inviteModalVisible, setInviteModalVisible] = useState(false);
    const [editingCollection, setEditingCollection] = useState<CollectionData | null>(null);

    // Collection Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [isReordering, setIsReordering] = useState(false);
    const [pickerVisible, setPickerVisible] = useState(false);

    // Fetch folder details
    const { data: folder, isError: folderError, isLoading: folderLoading } = useQuery({
        queryKey: ['folder', id],
        queryFn: async () => {
            if (!id) return null;
            const { data, error } = await supabase
                .from('folders')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            return data as CollectionData & { user_id: string };
        },
        enabled: !!id,
        staleTime: 1000 * 60 * 5,
        retry: 2,
    });

    // Fetch members of this shared collection
    const { data: members = [] } = useQuery({
        queryKey: ['folder-members', id],
        queryFn: async () => {
            if (!id) return [];
            const { data, error } = await supabase
                .from('folder_members')
                .select(`
                    id,
                    role,
                    status,
                    user:user_id ( id, username, display_name, avatar_url )
                `)
                .eq('folder_id', id)
                .eq('status', 'accepted'); // Only show accepted participants

            if (error) throw error;
            return data;
        },
        enabled: !!id,
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: 2,
    });

    // Fetch pages in this folder
    const { data: pages = [], isLoading, refetch, fetchStatus } = useQuery({
        queryKey: ['folder-pages', id],
        queryFn: async () => {
            if (!id) return [];
            const { data, error } = await supabase
                .from('pages')
                .select('id, title, url, tags, created_at, metadata')
                .eq('folder_id', id)
                .or('is_archived.is.null,is_archived.eq.false')
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!id,
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: 2,
    });

    // Compute sorted pages
    const sortedPages = React.useMemo(() => {
        if (!pages || !folder?.page_order) return pages;
        const pageMap = new Map((pages as any[]).map(p => [p.id, p]));
        const sorted = [];
        for (const pid of folder.page_order) {
            if (pageMap.has(pid)) {
                sorted.push(pageMap.get(pid));
                pageMap.delete(pid);
            }
        }
        return [...sorted, ...Array.from(pageMap.values())];
    }, [pages, folder?.page_order]);

    const handleReorderSifts = async (newOrder: any[]) => {
        const newPageIds = newOrder.map(p => p.id);

        queryClient.setQueryData(['folder', id], (old: any) => {
            if (!old) return old;
            return { ...old, page_order: newPageIds };
        });

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const { error } = await supabase
            .from('folders')
            .update({ page_order: newPageIds })
            .eq('id', id);

        if (error) {
            showToast({ message: "Failed to save reorder.", type: 'error' });
            queryClient.invalidateQueries({ queryKey: ['folder', id] });
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    // Determine current user's role in this folder
    const currentUserRole = React.useMemo(() => {
        if (!user || !folder) return null;
        if (folder.user_id === user.id) return 'owner';
        const member = members.find((m: any) => m.user?.id === user.id);
        return member ? member.role : null;
    }, [user, folder, members]);

    const isOwner = currentUserRole === 'owner';
    const canContribute = isOwner || currentUserRole === 'contributor';

    const handleUpdateCollection = async (folderData: CollectionData) => {
        const { error } = await supabase
            .from('folders')
            .update({
                name: folderData.name,
                color: folderData.color,
                icon: folderData.icon,
                is_pinned: folderData.is_pinned,
                image_url: folderData.image_url || null
            })
            .eq('id', id);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['folder', id] });
        queryClient.invalidateQueries({ queryKey: ['folders', user?.id] });
        setEditingCollection(null);
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
            showToast({ message: "Failed to add sifts.", type: 'error' });
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
            showToast({ message: "Failed to remove sift.", type: 'error' });
        }
    };

    const handleDeleteCollection = async (folderId: string) => {
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
        const deepLink = `sift://collection/${folder.id}`;
        await Clipboard.setStringAsync(deepLink);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Link Copied', `Share this link:\n${deepLink}`);
    };

    if (folderError || (!folderLoading && !folder)) {
        return (
            <ScreenWrapper edges={['top']}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={[styles.header, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <CaretLeft size={28} color={colors.ink} />
                    </TouchableOpacity>
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                    <Folder size={48} color={colors.stone} weight="thin" />
                    <Typography variant="h3" style={{ marginTop: 16, textAlign: 'center' }}>
                        Collection Not Found
                    </Typography>
                    <Typography variant="body" color="stone" style={{ textAlign: 'center', marginTop: 8 }}>
                        This collection may have been deleted or you don't have access.
                    </Typography>
                </View>
            </ScreenWrapper>
        );
    }

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
            <View style={[styles.header, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator }]}>
                {isReordering ? (
                    <TouchableOpacity onPress={() => { setIsReordering(false); }} style={styles.backButton}>
                        <Typography variant="label" color="ink" style={{ fontWeight: '700', letterSpacing: 1 }}>DONE</Typography>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <CaretLeft size={28} color={colors.ink} />
                    </TouchableOpacity>
                )}

                <View style={[styles.headerCenter, { alignItems: 'center', marginLeft: 0 }]}>
                    {folder.image_url ? (
                        <Image
                            source={folder.image_url}
                            style={{ width: 32, height: 32, borderRadius: RADIUS.s, backgroundColor: colors.subtle }}
                            contentFit="cover"
                        />
                    ) : (
                        <View style={[styles.folderIcon, { backgroundColor: folder.color }]}>
                            {folder.icon ? getIcon(folder.icon, 18, '#FFFFFF') : <Folder size={18} color="#FFFFFF" weight="fill" />}
                        </View>
                    )}
                    <View>
                        <Typography variant="h3" numberOfLines={1} style={styles.headerTitle}>
                            {folder.name}
                        </Typography>

                        {/* Member / Sift Info Row */}
                        <View style={styles.memberInfoRow}>
                            {members.length > 0 ? (
                                <View style={styles.avatarStack}>
                                    {/* Always show the owner's avatar first if possible */}
                                    <View style={[styles.stackedAvatarWrap, { zIndex: 4, borderColor: colors.canvas }]}>
                                        <View style={[styles.stackedAvatar, { backgroundColor: colors.subtle, justifyContent: 'center', alignItems: 'center' }]}>
                                            <User size={12} color={colors.stone} weight="bold" />
                                        </View>
                                    </View>
                                    {members.slice(0, 3).map((member: any, index: number) => (
                                        <View
                                            key={member.id}
                                            style={[
                                                styles.stackedAvatarWrap,
                                                { zIndex: 3 - index, marginLeft: -10, borderColor: colors.canvas }
                                            ]}
                                        >
                                            {member.user?.avatar_url ? (
                                                <Image source={{ uri: member.user.avatar_url }} style={styles.stackedAvatar} />
                                            ) : (
                                                <View style={[styles.stackedAvatar, { backgroundColor: colors.subtle, justifyContent: 'center', alignItems: 'center' }]}>
                                                    <Typography variant="caption" style={{ fontSize: 8 }}>{member.user?.display_name?.charAt(0) || 'U'}</Typography>
                                                </View>
                                            )}
                                        </View>
                                    ))}
                                    {members.length > 3 && (
                                        <View style={[styles.stackedAvatarWrap, { zIndex: 0, marginLeft: -10, borderColor: colors.canvas, backgroundColor: colors.separator, justifyContent: 'center', alignItems: 'center' }]}>
                                            <Typography variant="caption" style={{ fontSize: 8 }}>+{members.length - 3}</Typography>
                                        </View>
                                    )}
                                    <Typography variant="caption" color="stone" style={{ fontSize: 11, marginLeft: 6 }}>
                                        • {pages.length} {pages.length === 1 ? 'SIFT' : 'SIFTS'}
                                    </Typography>
                                </View>
                            ) : (
                                <Typography variant="caption" color="stone" style={{ fontSize: 11, letterSpacing: 0.5 }}>
                                    {pages.length} {pages.length === 1 ? 'SIFT' : 'SIFTS'}
                                </Typography>
                            )}
                        </View>
                    </View>
                </View>

                {isReordering ? (
                    <TouchableOpacity onPress={() => {
                        Haptics.selectionAsync();
                        setPickerVisible(true)
                            ;
                    }} style={styles.actionButton}>
                        <Plus size={24} color={colors.ink} />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
                            <ShareNetwork size={22} color={colors.ink} />
                        </TouchableOpacity>

                        {(isOwner || canContribute) && (
                            <TouchableOpacity
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    setActionSheetVisible(true);
                                }}
                                style={styles.actionButton}
                            >
                                <DotsThree size={24} color={colors.ink} weight="bold" />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>


            {/* Sift Feed */}
            <SiftFeed
                pages={sortedPages as any}
                loading={isLoading && fetchStatus === 'fetching'}
                mode={isReordering ? 'reorder' : 'feed'}
                onRemove={handleRemoveSift}
                onDragEnd={handleReorderSifts}
                viewMode={isReordering ? 'list' : 'grid'} // Force list view for reordering
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />
                }
                contentContainerStyle={styles.feedContainer}
            />

            {pages.length === 0 && !isLoading && (
                <View style={styles.emptyState}>
                    <Folder size={48} color={COLORS.stone} weight="thin" />
                    <Typography variant="body" color="stone" style={{ marginTop: SPACING.m }}>
                        No sifts in this collection yet.
                    </Typography>
                    {canContribute && (
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.selectionAsync();
                                setPickerVisible(true);
                            }}
                            style={styles.addSiftsButton}
                        >
                            <Plus size={18} color="#FFFFFF" weight="bold" />
                            <Typography variant="label" style={{ color: '#FFFFFF', marginLeft: 6 }}>Add Sifts</Typography>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            <CollectionModal
                visible={editModalVisible}
                onClose={() => {
                    setEditModalVisible(false);
                    setEditingCollection(null);
                }}
                onSave={handleUpdateCollection}
                onDelete={handleDeleteCollection}
                existingCollection={editingCollection}
            />

            <ActionSheet
                visible={actionSheetVisible}
                onClose={() => setActionSheetVisible(false)}
                title={folder.name}
                options={[
                    ...(isOwner ? [{
                        label: 'Invite Friends',
                        onPress: () => {
                            setTimeout(() => setInviteModalVisible(true), 200);
                        }
                    }] : []),
                    ...(canContribute ? [{
                        label: 'Add Sifts',
                        onPress: () => {
                            setTimeout(() => setPickerVisible(true), 200);
                        }
                    }] : []),
                    ...(canContribute && pages.length > 1 ? [{
                        label: 'Reorder Sifts',
                        onPress: () => {
                            setIsReordering(true);
                        }
                    }] : []),
                    ...(isOwner ? [{
                        label: 'Edit Collection',
                        onPress: () => {
                            setTimeout(() => {
                                setEditingCollection(folder);
                                setEditModalVisible(true);
                            }, 200);
                        }
                    }] : []),
                    ...(isOwner ? [{
                        label: 'Delete Collection',
                        isDestructive: true,
                        onPress: () => {
                            Alert.alert(
                                "Delete Collection",
                                "Are you sure you want to delete this collection? This action cannot be undone.",
                                [
                                    { text: "Cancel", style: "cancel" },
                                    { text: "Delete", style: "destructive", onPress: () => handleDeleteCollection(id as string) }
                                ]
                            );
                        }
                    }] : []),
                    {
                        label: 'Cancel',
                        isCancel: true,
                        onPress: () => { }
                    }
                ]}
            />

            <SiftPickerModal
                visible={pickerVisible}
                onClose={() => setPickerVisible(false)}
                onSelect={handleAddSifts}
                currentCollectionSiftIds={pages.map(p => p.id)}
            />

            <InviteFriendModal
                visible={inviteModalVisible}
                onClose={() => setInviteModalVisible(false)}
                folderId={id as string}
                folderName={folder.name}
            />
        </ScreenWrapper>
    );
}

const getIcon = (name: string, size: number, color: string) => {
    const { SelectionBackground, Folder, FolderOpen, FolderStar, Heart, Star, BookmarkSimple, Lightning, Fire, Sparkle, Coffee, GameController, MusicNote, Camera, Palette, Book, Briefcase, GraduationCap, Trophy, Target, Lightbulb, Rocket } = require('phosphor-react-native');
    const icons: any = { SelectionBackground, Folder, FolderOpen, FolderStar, Heart, Star, BookmarkSimple, Lightning, Fire, Sparkle, Coffee, GameController, MusicNote, Camera, Palette, Book, Briefcase, GraduationCap, Trophy, Target, Lightbulb, Rocket };
    const IconComponent = icons[name] || Folder;
    return <IconComponent size={size} color={color} weight="fill" />;
};

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
        paddingTop: 8,
        paddingBottom: 16,
    },
    backButton: {
        padding: 4,
        marginRight: 4,
    },
    headerCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerTitle: {
        fontSize: 22,
        fontFamily: 'PlayfairDisplay_700Bold',
        lineHeight: 28,
    },
    folderIcon: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.m,
        justifyContent: 'center',
        alignItems: 'center',
        ...Theme.shadows.soft,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    memberInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    avatarStack: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stackedAvatarWrap: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
    },
    stackedAvatar: {
        width: '100%',
        height: '100%',
        borderRadius: 11,
    },
    actionButton: {
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.02)',
        borderRadius: RADIUS.s,
    },
    feedContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 120,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    addSiftsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.ink,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: RADIUS.pill,
        marginTop: SPACING.l,
    },
});
