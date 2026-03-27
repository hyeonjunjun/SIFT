import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, UserPlus, Users, User, Check } from 'phosphor-react-native';
import { Typography } from '../design-system/Typography';
import { COLORS, RADIUS, Theme } from '../../lib/theme';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useToast } from '../../context/ToastContext';
import { sendPush } from '../../lib/pushHelper';

interface InviteFriendModalProps {
    visible: boolean;
    onClose: () => void;
    folderId: string;
    folderName: string;
}

export function InviteFriendModal({ visible, onClose, folderId, folderName }: InviteFriendModalProps) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const insets = useSafeAreaInsets();
    const [sending, setSending] = useState<string | null>(null);

    // Fetch accepted friends and folder members in one query
    const { data: friendsWithStatus = [], isLoading } = useQuery({
        queryKey: ['invite-friends', user?.id, folderId],
        queryFn: async () => {
            if (!user?.id) return [];

            // Fetch friendships and folder members in parallel
            const [friendshipsRes, membersRes] = await Promise.all([
                supabase
                    .from('friendships')
                    .select('user_id, friend_id, status')
                    .eq('status', 'accepted')
                    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`),
                supabase
                    .from('folder_members')
                    .select('user_id')
                    .eq('folder_id', folderId),
            ]);

            if (friendshipsRes.error) {
                return [];
            }

            const memberIds = new Set((membersRes.data || []).map((m: any) => m.user_id));

            // Extract friend IDs
            const friendIds = (friendshipsRes.data || []).map((f: any) =>
                f.user_id === user.id ? f.friend_id : f.user_id
            );

            if (friendIds.length === 0) return [];

            // Fetch friend profiles
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, username, display_name, avatar_url')
                .in('id', friendIds);

            if (profilesError) {
                return [];
            }

            return (profiles || []).map((p: any) => ({
                ...p,
                isMember: memberIds.has(p.id),
            }));
        },
        enabled: visible && !!user?.id && !!folderId,
        staleTime: 1000 * 60 * 2,
    });

    const handleInvite = async (friendId: string, friendName: string) => {
        if (!user?.id || sending) return;

        setSending(friendId);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            // Check if already invited (maybe they declined or it's pending)
            const { data: existing } = await supabase
                .from('folder_members')
                .select('id')
                .eq('folder_id', folderId)
                .eq('user_id', friendId)
                .single();

            let error;
            if (existing) {
                // If they exist (e.g. they declined previously), we reset them to accepted automatically since it's an invite from a mutual friend.
                const { error: updErr } = await supabase
                    .from('folder_members')
                    .update({ status: 'accepted', role: 'contributor', invited_by: user.id })
                    .eq('id', existing.id);
                error = updErr;
            } else {
                const { error: insErr } = await supabase
                    .from('folder_members')
                    .insert([{
                        folder_id: folderId,
                        user_id: friendId,
                        invited_by: user.id,
                        role: 'contributor',
                        status: 'accepted' // Auto-accepting for MVP since they are already mutual friends
                    }]);
                error = insErr;
            }

            if (error) throw error;

            // Write notification for the invited friend
            await supabase.from('notifications').insert([{
                user_id: friendId,
                actor_id: user.id,
                type: 'collection_invite',
                reference_id: folderId,
                metadata: { collection_name: folderName },
            }]);

            sendPush({
                receiverId: friendId,
                actorName: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Someone',
                type: 'collection_invite',
                collectionName: folderName,
                collectionId: folderId,
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast({ message: `${friendName} added to collection.`, type: 'success' });

            // Invalidate both folder members and invite-friends so the UI updates
            queryClient.invalidateQueries({ queryKey: ['folder-members', folderId] });
            queryClient.invalidateQueries({ queryKey: ['invite-friends', user.id, folderId] });

        } catch (e: any) {
            showToast({ message: e.message || "Could not complete the invite.", type: 'error' });
        } finally {
            setSending(null);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={styles.dismissArea}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View style={styles.content}>
                    <View style={styles.header}>
                        <View style={{ flex: 1 }}>
                            <Typography variant="h3">Invite to Collection</Typography>
                            <Typography variant="caption" color="stone" numberOfLines={1}>
                                {folderName}
                            </Typography>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={20} color={COLORS.ink} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.friendsList}
                        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 + insets.bottom }]}
                        showsVerticalScrollIndicator={false}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="large" color={COLORS.ink} style={{ marginTop: 40 }} />
                        ) : friendsWithStatus.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Users size={48} color={COLORS.subtle} weight="thin" />
                                <Typography variant="body" color="stone" style={{ marginTop: 12, textAlign: 'center' }}>
                                    No friends found yet. Connect with others in the Social tab to collaborate.
                                </Typography>
                            </View>
                        ) : (
                            friendsWithStatus.map((friend: any) => (
                                <TouchableOpacity
                                    key={friend.id}
                                    style={styles.friendItem}
                                    onPress={() => !friend.isMember && handleInvite(friend.id, friend.display_name)}
                                    disabled={!!sending || friend.isMember}
                                    activeOpacity={friend.isMember ? 1 : 0.7}
                                >
                                    <View style={[styles.friendInfo, friend.isMember && { opacity: 0.5 }]}>
                                        {friend?.avatar_url ? (
                                            <Image source={{ uri: friend.avatar_url }} style={styles.avatar} />
                                        ) : (
                                            <View style={[styles.avatar, styles.placeholderAvatar]}>
                                                <User size={16} color={COLORS.stone} />
                                            </View>
                                        )}
                                        <View style={{ marginLeft: 12 }}>
                                            <Typography variant="label">{friend.display_name}</Typography>
                                            <Typography variant="caption" color="stone">@{friend.username}</Typography>
                                        </View>
                                    </View>

                                    <View style={styles.sendIcon}>
                                        {sending === friend.id ? (
                                            <ActivityIndicator size="small" color={COLORS.ink} />
                                        ) : friend.isMember ? (
                                            <View style={styles.addedBadge}>
                                                <Check size={14} color={COLORS.success} weight="bold" />
                                                <Typography variant="caption" color="success" style={{ marginLeft: 4, fontWeight: 'bold' }}>Added</Typography>
                                            </View>
                                        ) : (
                                            <View style={styles.addButton}>
                                                <UserPlus size={18} color={COLORS.ink} weight="regular" />
                                                <Typography variant="caption" style={{ marginLeft: 6, fontWeight: 'bold' }}>Add</Typography>
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    dismissArea: {
        flex: 1,
    },
    content: {
        backgroundColor: COLORS.canvas,
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
        height: height * 0.7,
        paddingTop: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 20,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.paper,
        justifyContent: 'center',
        alignItems: 'center',
    },
    friendsList: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
    },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.paper,
        padding: 16,
        borderRadius: RADIUS.l,
        marginBottom: 12,
        ...Theme.shadows.soft,
    },
    friendInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    placeholderAvatar: {
        backgroundColor: COLORS.canvas,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.separator,
    },
    sendIcon: {
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.subtle,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: RADIUS.pill,
    },
    addedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(125, 147, 137, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: RADIUS.pill,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
        paddingHorizontal: 40,
    }
});
