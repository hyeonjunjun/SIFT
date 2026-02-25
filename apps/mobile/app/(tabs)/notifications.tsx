import React, { useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Typography } from '../../components/design-system/Typography';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { SPACING, RADIUS, COLORS } from '../../lib/theme';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { Bell, CheckCircle, UserPlus, PaperPlaneTilt, FolderPlus, Users, TrashSimple } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';

interface Notification {
    id: string;
    created_at: string;
    type: string;
    reference_id: string | null;
    is_read: boolean;
    metadata: any;
    actor: {
        id: string;
        display_name: string;
        avatar_url: string | null;
        username: string;
    };
}

function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    return `${weeks}w ago`;
}

function getTimeGroup(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays < 7) return 'This Week';
    return 'Earlier';
}

function getNotificationIcon(type: string, color: string) {
    const size = 18;
    switch (type) {
        case 'friend_request': return <UserPlus size={size} color={color} weight="bold" />;
        case 'friend_accepted': return <Users size={size} color={color} weight="bold" />;
        case 'sift_shared': return <PaperPlaneTilt size={size} color={color} weight="bold" />;
        case 'collection_invite': return <FolderPlus size={size} color={color} weight="bold" />;
        case 'collection_sift_added': return <FolderPlus size={size} color={color} weight="bold" />;
        default: return <Bell size={size} color={color} weight="bold" />;
    }
}

function getNotificationText(notification: Notification): string {
    const name = notification.actor?.display_name || 'Someone';
    const meta = notification.metadata || {};

    switch (notification.type) {
        case 'friend_request':
            return `${name} sent you a friend request`;
        case 'friend_accepted':
            return `${name} accepted your friend request`;
        case 'sift_shared':
            return `${name} shared "${meta.sift_title || 'a sift'}" with you`;
        case 'collection_invite':
            return `${name} invited you to "${meta.collection_name || 'a collection'}"`;
        case 'collection_sift_added':
            return `${name} added a sift to "${meta.collection_name || 'a shared collection'}"`;
        default:
            return `${name} did something`;
    }
}

export default function NotificationsScreen() {
    const { colors } = useTheme();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const router = useRouter();
    const [refreshing, setRefreshing] = React.useState(false);

    const { data: notifications = [], isLoading, refetch } = useQuery({
        queryKey: ['notifications', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const { data, error } = await supabase
                .from('notifications')
                .select('*, actor:actor_id(id, display_name, avatar_url, username)')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);
            if (error) throw error;
            return (data || []) as Notification[];
        },
        enabled: !!user?.id,
    });

    // Mark all as read when screen is focused
    useFocusEffect(
        useCallback(() => {
            const markRead = async () => {
                if (!user?.id) return;
                const unread = notifications.filter(n => !n.is_read);
                if (unread.length === 0) return;

                await supabase
                    .from('notifications')
                    .update({ is_read: true })
                    .eq('user_id', user.id)
                    .eq('is_read', false);

                queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
                queryClient.invalidateQueries({ queryKey: ['social_badge', user.id] });
            };
            // Small delay so the user sees the unread state briefly
            const timeout = setTimeout(markRead, 1500);
            return () => clearTimeout(timeout);
        }, [user?.id, notifications.length])
    );

    const handleMarkAllRead = async () => {
        if (!user?.id) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false);
        queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
        queryClient.invalidateQueries({ queryKey: ['social_badge', user.id] });
    };

    const handleAcceptFriend = async (friendshipId: string) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
        queryClient.invalidateQueries({ queryKey: ['friends'] });
        refetch();
    };

    const handleDeclineFriend = async (friendshipId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await supabase.from('friendships').delete().eq('id', friendshipId);
        queryClient.invalidateQueries({ queryKey: ['friends'] });
        refetch();
    };

    const onRefresh = async () => {
        setRefreshing(true);
        Haptics.selectionAsync();
        await refetch();
        setRefreshing(false);
    };

    const handleDeleteNotification = async (notificationId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await supabase.from('notifications').delete().eq('id', notificationId);
        queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
        queryClient.invalidateQueries({ queryKey: ['social_badge', user?.id] });
    };

    const handleNotificationPress = (notification: Notification) => {
        Haptics.selectionAsync();
        switch (notification.type) {
            case 'sift_shared':
                if (notification.reference_id) {
                    router.push(`/page/${notification.reference_id}`);
                }
                break;
            case 'collection_invite':
            case 'collection_sift_added':
                if (notification.reference_id) {
                    router.push(`/collection/${notification.reference_id}`);
                }
                break;
            case 'friend_request':
            case 'friend_accepted':
                router.push('/(tabs)/social');
                break;
        }
    };

    // Group notifications by time
    const grouped = React.useMemo(() => {
        const groups: { title: string; data: Notification[] }[] = [];
        const map: Record<string, Notification[]> = {};

        notifications.forEach(n => {
            const group = getTimeGroup(n.created_at);
            if (!map[group]) map[group] = [];
            map[group].push(n);
        });

        ['Today', 'This Week', 'Earlier'].forEach(key => {
            if (map[key]?.length) {
                groups.push({ title: key, data: map[key] });
            }
        });

        return groups;
    }, [notifications]);

    // Flatten with section headers
    const flatData = React.useMemo(() => {
        const items: (Notification | { type: 'header'; title: string })[] = [];
        grouped.forEach(group => {
            items.push({ type: 'header', title: group.title } as any);
            items.push(...group.data);
        });
        return items;
    }, [grouped]);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const renderItem = ({ item }: { item: any }) => {
        if (item.type === 'header' && item.title) {
            return (
                <View style={styles.sectionHeader}>
                    <Typography variant="label" color="stone" style={{ letterSpacing: 1.5 }}>
                        {item.title}
                    </Typography>
                </View>
            );
        }

        const notification = item as Notification;
        const isFriendRequest = notification.type === 'friend_request';

        const renderRightActions = () => (
            <TouchableOpacity
                style={{
                    backgroundColor: '#FF3B30',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: 80,
                }}
                onPress={() => handleDeleteNotification(notification.id)}
            >
                <TrashSimple size={22} color="#FFFFFF" weight="bold" />
                <Typography variant="caption" style={{ color: '#FFFFFF', marginTop: 4, fontWeight: '600' }}>Delete</Typography>
            </TouchableOpacity>
        );

        return (
            <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
                <TouchableOpacity
                    activeOpacity={0.7}
                    style={[
                        styles.notificationItem,
                        { borderBottomColor: colors.separator, backgroundColor: colors.canvas },
                        !notification.is_read && { borderLeftWidth: 3, borderLeftColor: colors.accent },
                    ]}
                    onPress={() => handleNotificationPress(notification)}
                >
                    <View style={[styles.avatarContainer, { backgroundColor: colors.subtle }]}>
                        {notification.actor?.avatar_url ? (
                            <Image
                                source={{ uri: notification.actor.avatar_url }}
                                style={styles.avatar}
                            />
                        ) : (
                            getNotificationIcon(notification.type, colors.ink)
                        )}
                    </View>

                    <View style={styles.contentContainer}>
                        <Typography variant="bodyMedium" style={{ lineHeight: 20 }}>
                            {getNotificationText(notification)}
                        </Typography>
                        <Typography variant="caption" color="stone" style={{ marginTop: 2 }}>
                            {timeAgo(notification.created_at)}
                        </Typography>
                    </View>

                    {isFriendRequest && (
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={[styles.acceptBtn, { backgroundColor: colors.accent }]}
                                onPress={() => handleAcceptFriend(notification.reference_id!)}
                                hitSlop={16}
                            >
                                <Typography variant="caption" style={{ color: '#FFFFFF', fontWeight: '600' }}>
                                    Accept
                                </Typography>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.declineBtn, { borderColor: colors.separator }]}
                                onPress={() => handleDeclineFriend(notification.reference_id!)}
                                hitSlop={16}
                            >
                                <Typography variant="caption" color="stone" style={{ fontWeight: '600' }}>
                                    Decline
                                </Typography>
                            </TouchableOpacity>
                        </View>
                    )}
                </TouchableOpacity>
            </Swipeable>
        );
    };

    return (
        <ScreenWrapper edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Typography variant="h2">Notifications</Typography>
                {unreadCount > 0 && (
                    <TouchableOpacity onPress={handleMarkAllRead} hitSlop={16}>
                        <Typography variant="caption" color="accent" style={{ fontWeight: '600' }}>
                            Mark all read
                        </Typography>
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={flatData}
                renderItem={renderItem}
                keyExtractor={(item: any) => item.id || item.title}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.stone}
                    />
                }
                ListEmptyComponent={
                    !isLoading ? (
                        <View style={styles.emptyState}>
                            <CheckCircle size={48} color={colors.stone} weight="thin" />
                            <Typography variant="h3" style={{ marginTop: SPACING.m, textAlign: 'center' }}>
                                All caught up!
                            </Typography>
                            <Typography variant="subhead" color="stone" style={{ marginTop: SPACING.xs, textAlign: 'center' }}>
                                No new notifications
                            </Typography>
                        </View>
                    ) : null
                }
            />
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.l,
        paddingTop: SPACING.m,
        paddingBottom: SPACING.m,
    },
    list: {
        paddingBottom: 100,
    },
    sectionHeader: {
        paddingHorizontal: SPACING.l,
        paddingTop: SPACING.l,
        paddingBottom: SPACING.s,
    },
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.l,
        paddingVertical: SPACING.m,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    avatarContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.m,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    contentContainer: {
        flex: 1,
        marginRight: SPACING.s,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    acceptBtn: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: RADIUS.pill,
    },
    declineBtn: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: RADIUS.pill,
        borderWidth: 1,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 120,
    },
});
