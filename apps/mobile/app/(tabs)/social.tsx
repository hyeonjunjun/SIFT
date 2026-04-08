import * as React from 'react';
import { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Alert, Dimensions, FlatList, KeyboardAvoidingView, Platform, Keyboard, Share } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS, Easing } from 'react-native-reanimated';
import { MagnifyingGlass, UserPlus, Users, Check, X, ChatCircleText, ShareNetwork, Plus, User, ProhibitInset, ArrowLeft, CaretRight, PaperPlaneTilt, Smiley, LinkSimple } from 'phosphor-react-native';
import { Typography } from '../../components/design-system/Typography';
import { EmptyState } from '../../components/design-system/EmptyState';
import { COLORS, SPACING, RADIUS, Theme } from '../../lib/theme';
import { useTheme } from '../../context/ThemeContext';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useToast } from '../../context/ToastContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FriendCardSkeleton } from '../../components/skeletons/FriendCardSkeleton';
import { sendPush } from '../../lib/pushHelper';

interface Sift {
    id: string;
    title: string;
    summary: string;
    url: string;
    metadata: any;
}

export default function SocialScreen() {
    const { colors, theme } = useTheme();
    const isDark = theme === 'dark';
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [messageText, setMessageText] = useState('');
    const [showEmojiGrid, setShowEmojiGrid] = useState(false);
    const [showSiftPicker, setShowSiftPicker] = useState(false);
    const router = useRouter();
    const triggerHaptic = (type: 'selection' | 'impact' | 'notification' | 'error') => {
        if (type === 'selection') Haptics.selectionAsync();
        else if (type === 'impact') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        else if (type === 'notification') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        else if (type === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    };
    const translateX = useSharedValue(0);
    const { width } = Dimensions.get('window');

    const [activeView, setActiveView] = useState<'network' | 'activity'>('network');

    // 1. Fetch Friends/Relationships (multi-step to avoid embedded join RLS issues)
    const { data: friendships = [], isLoading: isLoadingFriends } = useQuery({
        queryKey: ['friendships', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            // Step 1: Get raw friendships
            const { data: rawFriendships, error } = await supabase
                .from('friendships')
                .select('*')
                .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
            if (error) throw error;
            if (!rawFriendships || rawFriendships.length === 0) return [];

            // Step 2: Collect all user IDs and fetch profiles
            const userIds = new Set<string>();
            for (const f of rawFriendships) {
                userIds.add(f.user_id);
                userIds.add(f.friend_id);
            }
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, username, display_name, avatar_url, bio')
                .in('id', Array.from(userIds));

            const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

            // Step 3: Attach profiles to friendships
            return rawFriendships.map((f: any) => ({
                ...f,
                requester: profileMap.get(f.user_id) || null,
                receiver: profileMap.get(f.friend_id) || null,
            }));
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 5,
        retry: 2,
    });

    // Fetch own profile for invite link
    const { data: myProfile } = useQuery({
        queryKey: ['my-profile', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data } = await supabase.from('profiles').select('username, sift_id').eq('id', user.id).single();
            return data;
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 30,
    });

    const handleShareInvite = async () => {
        triggerHaptic('impact');
        const username = myProfile?.username || myProfile?.sift_id || user?.id;
        const displayName = user?.user_metadata?.display_name || 'me';
        try {
            await Share.share({
                message: `Save recipes from TikTok, Instagram & YouTube with Sift! Add me: @${username}\n\nhttps://sift-rho.vercel.app/invite/${username}`,
            });
        } catch {}
    };

    // Derived states for easier UX
    const incomingRequests = friendships.filter((f: any) => f.friend_id === user?.id && f.status === 'pending');
    const myNetwork = friendships.filter((f: any) => f.status === 'accepted');
    const outgoingRequests = friendships.filter((f: any) => f.user_id === user?.id && f.status === 'pending');


    // 2b. Fetch Direct Messages for selected friend
    const { data: messages = [] } = useQuery({
        queryKey: ['direct_messages', user?.id, selectedFriendId],
        queryFn: async () => {
            if (!user?.id || !selectedFriendId) return [];
            const { data: rawMessages, error } = await supabase
                .from('direct_messages')
                .select('*')
                .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedFriendId}),and(sender_id.eq.${selectedFriendId},receiver_id.eq.${user.id})`)
                .order('created_at', { ascending: true });
            if (error) throw error;
            if (!rawMessages || rawMessages.length === 0) return [];

            // Fetch attached sifts separately
            const siftIds = [...new Set(rawMessages.map((m: any) => m.sift_id).filter(Boolean))];
            let siftMap = new Map();
            if (siftIds.length > 0) {
                const { data: sifts } = await supabase
                    .from('pages')
                    .select('id, title, summary, url, metadata')
                    .in('id', siftIds);
                siftMap = new Map((sifts || []).map((s: any) => [s.id, s]));
            }

            return rawMessages.map((m: any) => ({
                ...m,
                sift: m.sift_id ? siftMap.get(m.sift_id) || null : null,
            }));
        },
        enabled: !!user?.id && !!selectedFriendId,
        staleTime: 1000 * 30, // 30s cache for active chats
        retry: 2,
    });

    // 2c. Fetch user's sifts for the sift picker
    const { data: mySifts = [] } = useQuery({
        queryKey: ['my_sifts_for_picker', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const { data, error } = await supabase
                .from('pages')
                .select('id, title, summary, url, metadata')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);
            if (error) throw error;
            return data;
        },
        enabled: !!user?.id && showSiftPicker,
        staleTime: 1000 * 60 * 5,
    });

    // 2d. Fetch global activity (all sifts shared with user)
    const { data: globalActivity = [], isLoading: isLoadingActivity } = useQuery({
        queryKey: ['global_activity', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const { data: rawActivity, error } = await supabase
                .from('direct_messages')
                .select('id, created_at, message_type, content, sender_id, receiver_id, sift_id')
                .eq('receiver_id', user.id)
                .eq('message_type', 'sift')
                .order('created_at', { ascending: false })
                .limit(50);
            if (error) throw error;
            if (!rawActivity || rawActivity.length === 0) return [];

            // Fetch sifts and senders separately
            const siftIds = [...new Set(rawActivity.map((a: any) => a.sift_id).filter(Boolean))];
            const senderIds = [...new Set(rawActivity.map((a: any) => a.sender_id).filter(Boolean))];

            const [siftsRes, sendersRes] = await Promise.all([
                siftIds.length > 0
                    ? supabase.from('pages').select('id, title, summary, url, metadata').in('id', siftIds)
                    : { data: [] },
                senderIds.length > 0
                    ? supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', senderIds)
                    : { data: [] },
            ]);

            const siftMap = new Map((siftsRes.data || []).map((s: any) => [s.id, s]));
            const senderMap = new Map((sendersRes.data || []).map((p: any) => [p.id, p]));

            return rawActivity.map((a: any) => ({
                ...a,
                sift: a.sift_id ? siftMap.get(a.sift_id) || null : null,
                sender: a.sender_id ? senderMap.get(a.sender_id) || null : null,
            }));
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60,
    });

    // Build unified conversation timeline (messages only now)
    const conversationTimeline = React.useMemo(() => {
        if (!selectedFriendId) return [];

        // Map direct messages to timeline items
        const msgItems = messages.map((m: any) => ({
            id: `dm-${m.id}`,
            type: m.message_type || 'text',
            content: m.content,
            sender_id: m.sender_id,
            created_at: m.created_at,
            sift: m.sift || null,
        }));

        // Sort chronologically
        return [...msgItems].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
    }, [messages, selectedFriendId]);

    // Send a message
    const sendMessage = useCallback(async (content: string, type: 'text' | 'sift' | 'emoji' = 'text', siftId?: string) => {
        if (!user?.id || !selectedFriendId) return;
        if (type === 'text' && !content.trim()) return;

        triggerHaptic('impact');
        try {
            const { error } = await supabase
                .from('direct_messages')
                .insert([{
                    sender_id: user.id,
                    receiver_id: selectedFriendId,
                    content: type === 'emoji' ? content : content.trim(),
                    message_type: type,
                    sift_id: siftId || null,
                }]);
            if (error) throw error;

            // Fire Push Notification Webhook (Non-blocking)
            fetch(`${process.env.EXPO_PUBLIC_API_URL || 'https://sift.so'}/api/push`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    receiverId: selectedFriendId,
                    actorName: user.user_metadata?.display_name || user.email?.split('@')[0] || 'A friend',
                    type: type === 'sift' ? 'direct_message_sift' : 'direct_message_text',
                    messageContent: type === 'emoji' ? content : content.trim(),
                    siftId: siftId || null
                })
            }).catch(() => {});

            setMessageText('');
            setShowEmojiGrid(false);
            Keyboard.dismiss();
            queryClient.invalidateQueries({ queryKey: ['direct_messages', user.id, selectedFriendId] });
        } catch (e: any) {
            showToast({ message: e.message, type: 'error' });
        }
    }, [user?.id, selectedFriendId, queryClient, showToast, triggerHaptic]);

    // Real-time subscription for incoming messages
    React.useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel('direct_messages_realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'direct_messages',
                    filter: `receiver_id=eq.${user.id}`,
                },
                (payload) => {
                    // Refresh the messages list when a new message arrives
                    queryClient.invalidateQueries({ queryKey: ['direct_messages', user.id, selectedFriendId] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, selectedFriendId, queryClient]);

    const sortedNetwork = React.useMemo(() => {
        return [...myNetwork].sort((a, b) => {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    }, [myNetwork]);

    // 3. Discovery (Search)
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async (text: string) => {
        const sanitized = text.trim();
        setSearchQuery(text);

        if (sanitized.length < 3) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sanitized);
            const orQuery = isUuid
                ? `id.eq.${sanitized},username.ilike.%${sanitized}%,email.eq.${sanitized.toLowerCase()},sift_id.ilike.%${sanitized}%`
                : `username.ilike.%${sanitized}%,email.eq.${sanitized.toLowerCase()},sift_id.ilike.%${sanitized}%`;

            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, display_name, avatar_url, email, sift_id')
                .or(orQuery)
                .neq('id', user?.id)
                .limit(5);

            if (error) throw error;
            if (data) setSearchResults(data);
        } catch (e) {
        } finally {
            setIsSearching(false);
        }
    };

    const sendFriendRequest = async (targetUserId: string) => {
        triggerHaptic('impact');
        try {
            const { data: friendData, error } = await supabase
                .from('friendships')
                .insert([{ user_id: user?.id, friend_id: targetUserId, status: 'pending' }])
                .select('id')
                .single();
            if (error) {
                if (error.code === '23505') showToast({ message: "You are already connected or have a pending request.", type: 'error' });
                else throw error;
            } else {
                // Write notification for recipient
                await supabase.from('notifications').insert([{
                    user_id: targetUserId,
                    actor_id: user?.id,
                    type: 'friend_request',
                    reference_id: friendData?.id,
                }]);

                // Push notification
                sendPush({
                    receiverId: targetUserId,
                    actorName: user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Someone',
                    type: 'friend_request',
                });

                showToast("Friend request sent!");
                queryClient.invalidateQueries({ queryKey: ['friendships', user?.id] });
                setSearchQuery('');
                setSearchResults([]);
            }
        } catch (e: any) { showToast({ message: e.message, type: 'error' }); }
    };

    const handleAccept = async (id: string) => {
        try {
            // Get the friendship to find the requester
            const { data: friendship } = await supabase
                .from('friendships')
                .select('user_id')
                .eq('id', id)
                .single();

            const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', id);
            if (error) throw error;

            // Notify the requester that their request was accepted
            if (friendship?.user_id) {
                await supabase.from('notifications').insert([{
                    user_id: friendship.user_id,
                    actor_id: user?.id,
                    type: 'friend_accepted',
                    reference_id: id,
                }]);

                sendPush({
                    receiverId: friendship.user_id,
                    actorName: user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Someone',
                    type: 'friend_accepted',
                });
            }

            queryClient.invalidateQueries({ queryKey: ['friendships', user?.id] });
            triggerHaptic('notification');
            showToast("Request accepted");
        } catch (e: any) { showToast({ message: e.message, type: 'error' }); }
    };

    const handleDecline = async (id: string) => {
        try {
            const { error } = await supabase.from('friendships').delete().eq('id', id);
            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['friendships', user?.id] });
        } catch (e: any) { showToast({ message: e.message, type: 'error' }); }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['friendships', user?.id] }),
            queryClient.invalidateQueries({ queryKey: ['direct_messages', user?.id, selectedFriendId] }),
        ]);
        setRefreshing(false);
    };

    const handleBlockUser = (targetUserId: string, displayName: string) => {
        Alert.alert(
            `Block ${displayName}?`,
            'They won\'t be able to send you sifts or friend requests. You can unblock them later.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Block', style: 'destructive', onPress: async () => {
                        try {
                            await supabase.from('blocked_users').insert([{
                                blocker_id: user?.id,
                                blocked_id: targetUserId,
                            }]);
                            // Also remove friendship
                            await supabase.from('friendships').delete()
                                .or(`and(user_id.eq.${user?.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${user?.id})`);
                            queryClient.invalidateQueries({ queryKey: ['friendships', user?.id] });
                            showToast(`${displayName} has been blocked`);
                        } catch (e: any) { showToast({ message: e.message, type: 'error' }); }
                    }
                }
            ]
        );
    };

    const handleReportUser = (targetUserId: string, displayName: string) => {
        Alert.alert(
            `Report ${displayName}?`,
            'This will flag the user for review by our team.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Report', style: 'destructive', onPress: async () => {
                        try {
                            await supabase.from('user_reports').insert([{
                                reporter_id: user?.id,
                                reported_id: targetUserId,
                                reason: 'inappropriate',
                            }]);
                            showToast('Report submitted. Thank you.');
                        } catch (e: any) { showToast({ message: e.message, type: 'error' }); }
                    }
                }
            ]
        );
    };

    // Animation for detail view
    const detailTranslateX = useSharedValue(width);
    const mainOpacity = useSharedValue(1);

    React.useEffect(() => {
        if (selectedFriendId) {
            detailTranslateX.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) });
            mainOpacity.value = withTiming(0.4, { duration: 300 });
        } else {
            detailTranslateX.value = withTiming(width, { duration: 300, easing: Easing.out(Easing.quad) });
            mainOpacity.value = withTiming(1, { duration: 300 });
        }
    }, [selectedFriendId]);

    const detailStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: detailTranslateX.value }],
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.canvas,
        zIndex: 10,
        paddingTop: insets.top,
    }));

    const mainStyle = useAnimatedStyle(() => ({
        opacity: mainOpacity.value,
        flex: 1,
    }));

    const selectedFriend = React.useMemo(() => {
        if (!selectedFriendId) return null;
        const friendship = friendships.find((f: any) =>
            f.user_id === selectedFriendId || f.friend_id === selectedFriendId
        );
        if (!friendship) return null;
        return friendship.user_id === user?.id ? friendship.receiver : friendship.requester;
    }, [selectedFriendId, friendships, user?.id]);

    const chatPanGesture = Gesture.Pan()
        .activeOffsetX([20, 1000]) // Only activate on horizontal swiping right
        .onUpdate((e) => {
            if (e.translationX > 0) {
                detailTranslateX.value = e.translationX;
            }
        })
        .onEnd((e) => {
            if (e.translationX > width / 3 || e.velocityX > 500) {
                detailTranslateX.value = withTiming(width, { duration: 300, easing: Easing.out(Easing.quad) }, () => {
                    runOnJS(setSelectedFriendId)(null);
                    runOnJS(setShowEmojiGrid)(false);
                    runOnJS(setShowSiftPicker)(false);
                });
                mainOpacity.value = withTiming(1, { duration: 300 });
                runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
            } else {
                detailTranslateX.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) });
            }
        });

    return (
        <ScreenWrapper edges={['top']}>
            <Animated.View style={mainStyle}>
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <Typography variant="h1" style={styles.serifTitle}>Social</Typography>
                        <View style={{ flexDirection: 'row', backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderRadius: RADIUS.pill, padding: 2 }}>
                            <TouchableOpacity
                                style={[{ paddingHorizontal: SPACING.m, paddingVertical: 6, borderRadius: RADIUS.pill }, activeView === 'network' && { backgroundColor: colors.paper, ...Theme.shadows.soft }]}
                                onPress={() => { setActiveView('network'); Haptics.selectionAsync(); }}
                            >
                                <Typography variant="caption" style={{ fontSize: 11, color: activeView === 'network' ? colors.ink : colors.stone, fontWeight: '600' }}>Network</Typography>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[{ paddingHorizontal: SPACING.m, paddingVertical: 6, borderRadius: RADIUS.pill }, activeView === 'activity' && { backgroundColor: colors.paper, ...Theme.shadows.soft }]}
                                onPress={() => { setActiveView('activity'); Haptics.selectionAsync(); }}
                            >
                                <Typography variant="caption" style={{ fontSize: 11, color: activeView === 'activity' ? colors.ink : colors.stone, fontWeight: '600' }}>Activity</Typography>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {activeView === 'network' && (
                    <View style={styles.searchContainer}>
                        <TouchableOpacity
                            onPress={handleShareInvite}
                            style={[styles.inviteButton, { backgroundColor: colors.ink }]}
                            activeOpacity={0.8}
                        >
                            <ShareNetwork size={18} color={colors.paper} weight="bold" />
                            <Typography variant="label" style={{ color: colors.paper, marginLeft: 8 }}>
                                Invite Friends
                            </Typography>
                        </TouchableOpacity>
                    </View>
                )}

            <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />}>
                    {activeView === 'network' ? (
                        <View style={styles.friendsList}>
                        {incomingRequests.length > 0 && (
                            <View style={styles.section}>
                                <Typography variant="label" color="stone" style={styles.sectionTitle}>REQUESTS ({incomingRequests.length})</Typography>
                                {incomingRequests.map((f: any) => (
                                    <FriendItem
                                        key={f.id}
                                        friendship={f}
                                        currentUserId={user?.id}
                                        colors={colors}
                                        onAccept={() => handleAccept(f.id)}
                                        onDecline={() => handleDecline(f.id)}
                                        onBlock={handleBlockUser}
                                        onReport={handleReportUser}
                                    />
                                ))}
                            </View>
                        )}

                        <View style={styles.section}>
                            <Typography variant="label" color="stone" style={styles.sectionTitle}>MY NETWORK</Typography>
                            {isLoadingFriends ? (
                                <>
                                    <FriendCardSkeleton />
                                    <FriendCardSkeleton />
                                    <FriendCardSkeleton />
                                </>
                            ) : sortedNetwork.length > 0 ? (
                                sortedNetwork.map((f: any) => {
                                    const friendId = f.user_id === user?.id ? f.friend_id : f.user_id;
                                    return (
                                        <FriendItem
                                            key={f.id}
                                            friendship={f}
                                            currentUserId={user?.id}
                                            colors={colors}
                                            onBlock={handleBlockUser}
                                            onReport={handleReportUser}
                                            onPress={() => setSelectedFriendId(friendId)}
                                        />
                                    );
                                })
                            ) : (
                                incomingRequests.length === 0 && (
                                    <EmptyState
                                        icon={<Users size={40} color={colors.stone} />}
                                        title="Add your first friend"
                                        description="Tap 'Invite Friends' above to share your invite link via text, WhatsApp, or any messaging app."
                                    />
                                )
                            )}
                        </View>

                        {outgoingRequests.length > 0 && (
                            <View style={[styles.section]}>
                                <Typography variant="label" color="stone" style={styles.sectionTitle}>SENT REQUESTS</Typography>
                                {outgoingRequests.map((f: any) => (
                                    <FriendItem
                                        key={f.id}
                                        friendship={f}
                                        currentUserId={user?.id}
                                        colors={colors}
                                        onDecline={() => handleDecline(f.id)}
                                        onBlock={handleBlockUser}
                                        onReport={handleReportUser}
                                    />
                                ))}
                            </View>
                        )}
                    </View>
                    ) : (
                        <View style={styles.activityList}>
                            {isLoadingActivity ? (
                                <>
                                    <FriendCardSkeleton />
                                    <FriendCardSkeleton />
                                    <FriendCardSkeleton />
                                </>
                            ) : globalActivity.length > 0 ? (
                                globalActivity.map((activity: any) => (
                                    <SharedSiftCard
                                        key={activity.id}
                                        share={activity}
                                        user={user}
                                        colors={colors}
                                        queryClient={queryClient}
                                        router={router}
                                    />
                                ))
                            ) : (
                                <EmptyState
                                    icon={<PaperPlaneTilt size={40} color={colors.stone} weight="thin" />}
                                    title="No activity yet"
                                    description="When friends share recipes with you, they'll appear here."
                                />
                            )}
                        </View>
                    )}
                </ScrollView>
            </Animated.View>

            {/* CHAT INTERFACE */}
            {selectedFriendId && (
                <GestureDetector gesture={chatPanGesture}>
                    <Animated.View style={detailStyle}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={{ flex: 1 }}
                            keyboardVerticalOffset={0}
                        >
                            {/* Chat Header */}
                            <View style={[chatStyles.chatHeader, { borderBottomColor: colors.separator }]}>
                                <TouchableOpacity
                                    onPress={() => { setSelectedFriendId(null); setShowEmojiGrid(false); setShowSiftPicker(false); }}
                                    style={{ flexDirection: 'row', alignItems: 'center' }}
                                    hitSlop={16}
                                >
                                    <ArrowLeft size={20} color={colors.ink} />
                                </TouchableOpacity>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 16 }}>
                                    {selectedFriend?.avatar_url ? (
                                        <Image source={{ uri: selectedFriend.avatar_url }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                                    ) : (
                                        <View style={[{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.subtle, justifyContent: 'center', alignItems: 'center' }]}>
                                            <User size={18} color={colors.stone} weight="thin" />
                                        </View>
                                    )}
                                    <View style={{ marginLeft: 12 }}>
                                        <Typography variant="h3" numberOfLines={1}>{selectedFriend?.display_name}</Typography>
                                        <Typography variant="caption" color="stone">@{selectedFriend?.username}</Typography>
                                    </View>
                                </View>
                            </View>

                            {/* Messages List */}
                            <FlatList
                                style={{ flex: 1 }}
                                data={[...conversationTimeline].reverse()}
                                keyExtractor={(item) => item.id}
                                inverted={true}
                                contentContainerStyle={chatStyles.messagesList}
                                showsVerticalScrollIndicator={false}
                                ListEmptyComponent={
                                    <View style={{ alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 }}>
                                        <ChatCircleText size={48} color={colors.stone} weight="thin" />
                                        <Typography variant="h3" style={{ marginTop: 16, textAlign: 'center' }}>Start a conversation</Typography>
                                        <Typography variant="body" color="stone" style={{ marginTop: 8, textAlign: 'center' }}>Send a message, share a sift, or react with an emoji</Typography>
                                    </View>
                                }
                                renderItem={({ item }) => {
                                    const isMine = item.sender_id === user?.id;

                                    if (item.type === 'emoji') {
                                        return (
                                            <View style={[chatStyles.emojiMessage, isMine ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}>
                                                <Typography style={{ fontSize: 48, lineHeight: 52 }}>{item.content}</Typography>
                                                <Typography variant="caption" color="stone" style={{ marginTop: 4 }}>
                                                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </Typography>
                                            </View>
                                        );
                                    }

                                    if (item.type === 'sift' && item.sift) {
                                        return (
                                            <TouchableOpacity
                                                style={[chatStyles.siftBubble, {
                                                    backgroundColor: isMine ? colors.ink : colors.paper,
                                                    alignSelf: isMine ? 'flex-end' : 'flex-start',
                                                    borderColor: isMine ? 'transparent' : colors.separator,
                                                }]}
                                                onPress={() => router.push(`/page/${item.sift.id}`)}
                                                activeOpacity={0.7}
                                            >
                                                {item.content && (
                                                    <Typography variant="body" style={{ color: isMine ? colors.paper : colors.ink, marginBottom: 8 }}>
                                                        {item.content}
                                                    </Typography>
                                                )}
                                                <View style={{ borderRadius: RADIUS.s, backgroundColor: isMine ? (colors.paper === '#FDFCF8' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)') : colors.subtle, overflow: 'hidden' }}>
                                                    {item.sift.metadata?.image_url && (
                                                        <Image
                                                            source={item.sift.metadata.image_url}
                                                            style={{ width: '100%', height: 140, backgroundColor: isMine ? (colors.paper === '#FDFCF8' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)') : colors.separator }}
                                                            contentFit="cover"
                                                        />
                                                    )}
                                                    <View style={{ padding: 12 }}>
                                                        <Typography variant="h3" numberOfLines={2} style={{ color: isMine ? colors.paper : colors.ink }}>
                                                            {item.sift.title}
                                                        </Typography>
                                                        {item.sift.summary && (
                                                            <Typography variant="body" numberOfLines={5} style={{ color: isMine ? colors.paper : colors.stone, opacity: isMine ? 0.8 : 1, marginTop: 6, fontSize: 13, lineHeight: 18 }}>
                                                                {item.sift.summary}
                                                            </Typography>
                                                        )}
                                                    </View>
                                                </View>
                                                <Typography variant="caption" style={{ color: isMine ? colors.paper : colors.stone, opacity: isMine ? 0.6 : 1, marginTop: 6, alignSelf: 'flex-end' }}>
                                                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </Typography>
                                            </TouchableOpacity>
                                        );
                                    }

                                    // Text message bubble
                                    return (
                                        <View style={[chatStyles.bubble, {
                                            backgroundColor: isMine ? colors.ink : colors.paper,
                                            alignSelf: isMine ? 'flex-end' : 'flex-start',
                                            borderColor: isMine ? 'transparent' : colors.separator,
                                            borderBottomRightRadius: isMine ? 4 : RADIUS.m,
                                            borderBottomLeftRadius: isMine ? RADIUS.m : 4,
                                        }]}>
                                            <Typography variant="body" style={{ color: isMine ? colors.paper : colors.ink }}>
                                                {item.content}
                                            </Typography>
                                            <Typography variant="caption" style={{ color: isMine ? colors.paper : colors.stone, opacity: isMine ? 0.6 : 1, marginTop: 4, alignSelf: 'flex-end' }}>
                                                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Typography>
                                        </View>
                                    );
                                }}
                            />

                            {/* Emoji Quick-React Grid */}
                            {showEmojiGrid && (
                                <View style={[chatStyles.emojiGrid, { backgroundColor: colors.paper, borderColor: colors.separator }]}>
                                    {['👍', '❤️', '😂', '🔥', '👀', '🎉', '😍', '💯'].map((emoji) => (
                                        <TouchableOpacity
                                            key={emoji}
                                            style={chatStyles.emojiButton}
                                            onPress={() => sendMessage(emoji, 'emoji')}
                                        >
                                            <Typography style={{ fontSize: 28, lineHeight: 34 }}>{emoji}</Typography>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            {/* Sift Picker */}
                            {showSiftPicker && (
                                <View style={[chatStyles.siftPickerContainer, { backgroundColor: colors.paper, borderColor: colors.separator }]}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <Typography variant="label" color="stone">SHARE A SIFT</Typography>
                                        <TouchableOpacity onPress={() => setShowSiftPicker(false)} hitSlop={12}>
                                            <X size={18} color={colors.stone} />
                                        </TouchableOpacity>
                                    </View>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 240 }} contentContainerStyle={{ gap: 12, paddingBottom: 8 }}>
                                        {mySifts.length > 0 ? mySifts.map((sift: any) => (
                                            <TouchableOpacity
                                                key={sift.id}
                                                style={{
                                                    width: 160,
                                                    backgroundColor: colors.subtle,
                                                    borderRadius: RADIUS.s,
                                                    overflow: 'hidden',
                                                    borderWidth: StyleSheet.hairlineWidth,
                                                    borderColor: colors.separator,
                                                }}
                                                onPress={() => {
                                                    sendMessage('', 'sift', sift.id);
                                                    setShowSiftPicker(false);
                                                }}
                                            >
                                                {sift.metadata?.image_url ? (
                                                    <Image source={sift.metadata.image_url} style={{ width: '100%', height: 110, backgroundColor: 'rgba(0,0,0,0.05)' }} contentFit="cover" />
                                                ) : (
                                                    <View style={{ width: '100%', height: 80, backgroundColor: 'rgba(0,0,0,0.02)', justifyContent: 'center', alignItems: 'center' }}>
                                                        <LinkSimple size={24} color={colors.stone} />
                                                    </View>
                                                )}
                                                <View style={{ padding: 10 }}>
                                                    <Typography variant="label" numberOfLines={2}>{sift.title}</Typography>
                                                    <Typography variant="caption" color="stone" numberOfLines={3} style={{ marginTop: 4, lineHeight: 14 }}>{sift.summary}</Typography>
                                                </View>
                                            </TouchableOpacity>
                                        )) : (
                                            <Typography variant="body" color="stone" style={{ textAlign: 'center', paddingVertical: 20, width: Dimensions.get('window').width - 64 }}>No sifts in your library</Typography>
                                        )}
                                    </ScrollView>
                                </View>
                            )}

                            {/* Input Bar */}
                            <View style={[
                                chatStyles.inputBar,
                                {
                                    backgroundColor: colors.canvas,
                                    borderTopColor: colors.separator,
                                    paddingBottom: Math.max(8, insets.bottom),
                                }
                            ]}>
                                <TouchableOpacity
                                    onPress={() => { setShowEmojiGrid(!showEmojiGrid); setShowSiftPicker(false); }}
                                    hitSlop={8}
                                    style={{ padding: 8 }}
                                >
                                    <Smiley size={24} color={showEmojiGrid ? colors.ink : colors.stone} weight={showEmojiGrid ? 'fill' : 'regular'} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => { setShowSiftPicker(!showSiftPicker); setShowEmojiGrid(false); }}
                                    hitSlop={8}
                                    style={{ padding: 8 }}
                                >
                                    <LinkSimple size={24} color={showSiftPicker ? colors.ink : colors.stone} weight={showSiftPicker ? 'bold' : 'regular'} />
                                </TouchableOpacity>
                                <TextInput
                                    style={[chatStyles.messageInput, { backgroundColor: colors.paper, color: colors.ink, borderColor: colors.separator }]}
                                    placeholder="Message..."
                                    placeholderTextColor={colors.stone}
                                    value={messageText}
                                    onChangeText={setMessageText}
                                    multiline
                                    maxLength={2000}
                                    onFocus={() => { setShowEmojiGrid(false); setShowSiftPicker(false); }}
                                />
                                <TouchableOpacity
                                    onPress={() => sendMessage(messageText)}
                                    hitSlop={8}
                                    style={[chatStyles.sendButton, { backgroundColor: messageText.trim() ? colors.ink : colors.subtle }]}
                                    disabled={!messageText.trim()}
                                >
                                    <PaperPlaneTilt size={18} color={messageText.trim() ? colors.paper : colors.stone} weight="fill" />
                                </TouchableOpacity>
                            </View>
                        </KeyboardAvoidingView>
                    </Animated.View>
                </GestureDetector>
            )
            }
        </ScreenWrapper >
    );
}

function SharedSiftCard({ share, user, colors, queryClient, router }: any) {
    const [collecting, setCollecting] = useState(false);
    const { showToast } = useToast();

    const handleCollect = async () => {
        if (!user?.id || collecting) return;
        setCollecting(true);
        try {
            const { id: _, created_at: __, ...siftData } = share.sift;
            const { error } = await supabase.from('pages').insert([{
                ...siftData,
                user_id: user.id,
                created_at: new Date().toISOString(),
                is_pinned: false,
                is_archived: false,
                metadata: { ...share.sift.metadata, shared_from: share.sender_id, original_id: share.sift.id }
            }]);
            if (error) throw error;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast({ message: "Sift added to library", type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['pages', user.id] });
        } catch (e: any) { showToast({ message: e.message, type: 'error' }); }
        finally { setCollecting(false); }
    };

    return (
        <TouchableOpacity style={[styles.card, { backgroundColor: colors.paper, borderColor: colors.separator }]} onPress={() => router.push(`/page/${share.sift.id}`)}>
            <View style={styles.cardHeader}>
                {share.sender.avatar_url ? (
                    <Image source={{ uri: share.sender.avatar_url }} style={styles.tinyAvatar} />
                ) : (
                    <View style={[styles.tinyAvatar, { backgroundColor: colors.subtle, justifyContent: 'center', alignItems: 'center' }]}>
                        <User size={12} color={colors.stone} weight="bold" />
                    </View>
                )}
                <Typography variant="caption" color="stone" style={{ marginLeft: 8 }}>{share.sender.display_name} shared a Sift</Typography>
            </View>
            {share.message && (
                <View style={{ marginBottom: 16, padding: 12, backgroundColor: colors.subtle, borderRadius: RADIUS.s }}>
                    <Typography variant="body" style={{ fontStyle: 'italic', color: colors.ink }}>"{share.message}"</Typography>
                </View>
            )}
            <View style={styles.cardBody}>
                <Typography variant="h3" numberOfLines={1}>{share.sift.title}</Typography>
                <Typography variant="body" color="stone" numberOfLines={2} style={{ marginTop: 4 }}>{share.sift.summary}</Typography>
            </View>
            <View style={styles.cardFooter}>
                <Typography variant="caption" color="stone">{new Date(share.created_at).toLocaleDateString()}</Typography>
                <TouchableOpacity style={[styles.collectButton, collecting && { opacity: 0.5 }]} onPress={handleCollect} disabled={collecting}>
                    {collecting ? <ActivityIndicator size="small" color={colors.paper} /> : <Typography variant="caption" style={{ color: colors.paper }}>Collect</Typography>}
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
}

function FriendItem({ friendship, currentUserId, colors, onAccept, onDecline, onBlock, onReport, onPress }: any) {
    const friend = friendship.user_id === currentUserId ? friendship.receiver : friendship.requester;
    const isPending = friendship.status === 'pending';
    const isOutgoing = isPending && friendship.user_id === currentUserId;

    const handleLongPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
            friend.display_name,
            `@${friend.username}`,
            [
                { text: 'Block', style: 'destructive', onPress: () => onBlock?.(friend.id, friend.display_name) },
                { text: 'Report', style: 'destructive', onPress: () => onReport?.(friend.id, friend.display_name) },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    return (
        <TouchableOpacity
            style={[styles.friendItem, { borderBottomColor: colors.separator }]}
            onPress={onPress}
            onLongPress={handleLongPress}
            delayLongPress={500}
            activeOpacity={0.7}
        >
            {friend.avatar_url ? (
                <Image source={{ uri: friend.avatar_url }} style={styles.mediumAvatar} />
            ) : (
                <View style={[styles.mediumAvatar, { backgroundColor: colors.subtle, justifyContent: 'center', alignItems: 'center' }]}>
                    <User size={24} color={colors.stone} weight="thin" />
                </View>
            )}
            <View style={{ flex: 1, marginLeft: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h3">{friend.display_name}</Typography>
                </View>
                <Typography variant="caption" color="stone" numberOfLines={1}>
                    {`@${friend.username}`}
                </Typography>
                {friend.bio && (
                    <Typography variant="caption" color="stone" numberOfLines={2} style={{ marginTop: 4 }}>
                        {friend.bio}
                    </Typography>
                )}
            </View>
            {isPending ? (
                isOutgoing ? (
                    <TouchableOpacity
                        style={[styles.statusBadge, { backgroundColor: colors.subtle, flexDirection: 'row', alignItems: 'center' }]}
                        onPress={onDecline}
                        hitSlop={12}
                    >
                        <X size={12} color={colors.stone} weight="bold" style={{ marginRight: 4 }} />
                        <Typography variant="caption" color="stone">Cancel</Typography>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={[styles.actionButton, { backgroundColor: COLORS.success }]} onPress={onAccept} hitSlop={12}>
                            <Check size={16} color="white" weight="bold" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionButton, { backgroundColor: 'rgba(255,59,48,0.1)' }]} onPress={onDecline} hitSlop={12}>
                            <X size={16} color={COLORS.danger} weight="bold" />
                        </TouchableOpacity>
                    </View>
                )
            ) : <CaretRight size={16} color={colors.stone} weight="bold" />}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    header: { paddingHorizontal: 20, marginTop: SPACING.m, marginBottom: 20 },
    smallCapsLabel: { marginBottom: 4 },
    serifTitle: {
        fontSize: 36,
        fontFamily: 'PlayfairDisplay_700Bold',
    },
    searchContainer: {
        marginHorizontal: 20,
        marginBottom: 12,
    },
    inviteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: RADIUS.l,
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 52,
        borderRadius: RADIUS.l,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(0,0,0,0.08)',
        // @ts-ignore
        cornerCurve: 'continuous',
        ...Theme.shadows.soft,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'System',
        paddingVertical: 0,
        textAlignVertical: 'center',
    },
    searchResultsBox: { marginHorizontal: 20, borderRadius: RADIUS.m, ...Theme.shadows.medium, marginBottom: 20, overflow: 'hidden' },
    searchResultItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.separator },
    miniAvatar: { width: 32, height: 32, borderRadius: 16 },
    mediumAvatar: { width: 48, height: 48, borderRadius: 24 },
    tinyAvatar: { width: 20, height: 20, borderRadius: 10 },
    tabsContainer: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 8, marginBottom: 20, gap: 24 },
    tab: { paddingBottom: 8 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 160 },
    card: { padding: 20, borderRadius: RADIUS.m, borderWidth: StyleSheet.hairlineWidth, marginBottom: 16, ...Theme.shadows.soft },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    cardBody: { marginBottom: 16 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    collectButton: { backgroundColor: COLORS.ink, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.pill },
    friendItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
    actionRow: { flexDirection: 'row', gap: 12 },
    actionButton: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill },
    feed: { gap: 16 },
    activityList: { gap: 16 },
    friendsList: {},
    section: { marginBottom: 32 },
    sectionTitle: { marginBottom: 12, letterSpacing: 1 },
    badge: {
        marginLeft: 6,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }
});

const chatStyles = StyleSheet.create({
    chatHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    messagesList: {
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    bubble: {
        maxWidth: '78%',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: RADIUS.m,
        marginBottom: 8,
        borderWidth: StyleSheet.hairlineWidth,
    },
    emojiMessage: {
        alignItems: 'center',
        paddingVertical: 8,
        marginBottom: 8,
    },
    siftBubble: {
        maxWidth: '82%',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: RADIUS.m,
        marginBottom: 8,
        borderWidth: StyleSheet.hairlineWidth,
    },
    siftCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: RADIUS.s,
    },
    emojiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 12,
        marginHorizontal: 16,
        borderRadius: RADIUS.m,
        borderWidth: StyleSheet.hairlineWidth,
        marginBottom: 8,
    },
    emojiButton: {
        width: '25%',
        alignItems: 'center',
        paddingVertical: 8,
    },
    siftPickerContainer: {
        padding: 16,
        marginHorizontal: 16,
        borderRadius: RADIUS.m,
        borderWidth: StyleSheet.hairlineWidth,
        marginBottom: 8,
    },
    siftPickerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    messageInput: {
        flex: 1,
        marginHorizontal: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: RADIUS.l,
        borderWidth: StyleSheet.hairlineWidth,
        fontSize: 15,
        maxHeight: 100,
    },
    sendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
