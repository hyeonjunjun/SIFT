import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, Dimensions } from 'react-native';
import { X, PaperPlaneTilt, Users, User } from 'phosphor-react-native';
import { Typography } from '../design-system/Typography';
import { COLORS, RADIUS, Theme } from '../../lib/theme';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';

interface ShareSiftModalProps {
    visible: boolean;
    onClose: () => void;
    siftId: string;
    siftTitle: string;
}

export default function ShareSiftModal({ visible, onClose, siftId, siftTitle }: ShareSiftModalProps) {
    const { user } = useAuth();
    const [sending, setSending] = useState<string | null>(null);

    // Fetch accepted friendships
    const { data: friends = [], isLoading } = useQuery({
        queryKey: ['accepted_friends', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const { data, error } = await supabase
                .from('friendships')
                .select(`
                    id,
                    requester:user_id (id, username, display_name, avatar_url),
                    receiver:friend_id (id, username, display_name, avatar_url)
                `)
                .eq('status', 'accepted')
                .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

            if (error) throw error;

            return data.map((f: any) =>
                f.requester.id === user.id ? f.receiver : f.requester
            );
        },
        enabled: visible && !!user?.id,
    });

    const handleSend = async (friendId: string, friendName: string) => {
        if (!user?.id || sending) return;

        setSending(friendId);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const { error } = await supabase
                .from('sift_shares')
                .insert([{
                    sender_id: user.id,
                    receiver_id: friendId,
                    sift_id: siftId
                }]);

            if (error) throw error;

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Sift Sent", `Shared "${siftTitle}" with ${friendName}.`);
            onClose();
        } catch (e: any) {
            Alert.alert("Recall Error", e.message || "Could not send sift.");
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
                            <Typography variant="h3">Send Sift</Typography>
                            <Typography variant="caption" color="stone" numberOfLines={1}>
                                {siftTitle}
                            </Typography>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={20} color={COLORS.ink} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.friendsList}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="large" color={COLORS.ink} style={{ marginTop: 40 }} />
                        ) : friends.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Users size={48} color={COLORS.subtle} weight="thin" />
                                <Typography variant="body" color="stone" style={{ marginTop: 12, textAlign: 'center' }}>
                                    No friends found yet. Connect with others in the Social tab to share sifts.
                                </Typography>
                            </View>
                        ) : (
                            friends.map((friend: any) => (
                                <TouchableOpacity
                                    key={friend.id}
                                    style={styles.friendItem}
                                    onPress={() => handleSend(friend.id, friend.display_name)}
                                    disabled={!!sending}
                                >
                                    <View style={styles.friendInfo}>
                                        {friend.avatar_url ? (
                                            <Image source={friend.avatar_url} style={styles.avatar} />
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
                                        ) : (
                                            <PaperPlaneTilt size={20} color={COLORS.ink} />
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
        paddingBottom: 40,
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
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
        paddingHorizontal: 40,
    }
});
