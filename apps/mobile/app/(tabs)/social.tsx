import * as React from 'react';
import { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Alert, Dimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS, Easing } from 'react-native-reanimated';
import { MagnifyingGlass, UserPlus, Users, Check, X, ChatCircleText, ShareNetwork, Plus, User, ProhibitInset, ArrowLeft, CaretRight } from 'phosphor-react-native';
import { Typography } from '../../components/design-system/Typography';
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

interface Sift {
    id: string;
    title: string;
    summary: string;
    url: string;
    metadata: any;
}

interface Share {
    id: string;
    sender_id: string;
    sift: Sift;
    sender: { display_name: string; avatar_url: string };
    created_at: string;
}

export default function SocialScreen() {
    const { colors } = useTheme();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const triggerHaptic = (type: 'selection' | 'impact' | 'notification' | 'error') => {
        if (type === 'selection') Haptics.selectionAsync();
        else if (type === 'impact') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        else if (type === 'notification') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        else if (type === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    };
    const translateX = useSharedValue(0);
    const { width } = Dimensions.get('window');

    // 1. Fetch Friends/Relationships
    const { data: friendships = [] } = useQuery({
        queryKey: ['friendships', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const { data, error } = await supabase
                .from('friendships')
                .select(`
                    *,
                    requester:user_id (id, username, display_name, avatar_url),
                    receiver:friend_id (id, username, display_name, avatar_url)
                `)
                .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
            if (error) throw error;
            return data;
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 5, // 5 minutes cache
        retry: 2,
    });

    // Derived states for easier UX
    const incomingRequests = friendships.filter((f: any) => f.friend_id === user?.id && f.status === 'pending');
    const myNetwork = friendships.filter((f: any) => f.status === 'accepted');
    const outgoingRequests = friendships.filter((f: any) => f.user_id === user?.id && f.status === 'pending');

    // 2. Fetch Shared Sifts
    const { data: sharedSifts = [] } = useQuery({
        queryKey: ['shared_sifts', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const { data, error } = await supabase
                .from('sift_shares')
                .select(`
                    *,
                    sift:sift_id (*),
                    sender:sender_id (username, display_name, avatar_url)
                `)
                .eq('receiver_id', user.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 5, // 5 minutes cache
        retry: 2,
    });

    // Derived states for grouped shares
    const sharesBySender = React.useMemo(() => {
        const map: Record<string, any[]> = {};
        sharedSifts.forEach(s => {
            if (!map[s.sender_id]) map[s.sender_id] = [];
            map[s.sender_id].push(s);
        });
        return map;
    }, [sharedSifts]);

    const sortedNetwork = React.useMemo(() => {
        return [...myNetwork].sort((a, b) => {
            const friendIdA = a.user_id === user?.id ? a.friend_id : a.user_id;
            const friendIdB = b.user_id === user?.id ? b.friend_id : b.user_id;
            const lastA = sharesBySender[friendIdA]?.[0] ? new Date(sharesBySender[friendIdA][0].created_at).getTime() : 0;
            const lastB = sharesBySender[friendIdB]?.[0] ? new Date(sharesBySender[friendIdB][0].created_at).getTime() : 0;
            return lastB - lastA;
        });
    }, [myNetwork, sharesBySender, user?.id]);

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
            console.error('[Social] Search error:', e);
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
            queryClient.invalidateQueries({ queryKey: ['shared_sifts', user?.id] })
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
        paddingHorizontal: 20,
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

    return (
        <ScreenWrapper edges={['top']}>
            <Animated.View style={mainStyle}>
                <View style={styles.header}>
                    <Typography variant="label" color="stone" style={styles.smallCapsLabel}>NETWORK • ACTIVITY</Typography>
                    <Typography variant="h1" style={styles.serifTitle}>Friends</Typography>
                </View>

                <View style={styles.searchContainer}>
                    <View style={[styles.searchInputWrapper, { backgroundColor: colors.paper, borderColor: colors.separator }]}>
                        <MagnifyingGlass size={18} color={colors.stone} weight="bold" style={{ marginRight: 10 }} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.ink }]}
                            placeholder="Find friends by @username or ID..."
                            placeholderTextColor={colors.stone}
                            value={searchQuery}
                            onChangeText={handleSearch}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {isSearching && (
                            <ActivityIndicator size="small" color={colors.ink} style={{ marginLeft: 8 }} />
                        )}
                    </View>
                </View>

                {searchResults.length > 0 ? (
                    <View style={[styles.searchResultsBox, { backgroundColor: colors.paper }]}>
                        {searchResults.map(u => (
                            <TouchableOpacity key={u.id} style={styles.searchResultItem} onPress={() => sendFriendRequest(u.id)}>
                                <Image source={u.avatar_url} style={styles.miniAvatar} />
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Typography variant="label">{u.display_name}</Typography>
                                    <Typography variant="caption" color="stone">@{u.username}</Typography>
                                </View>
                                <UserPlus size={20} color={colors.ink} />
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : (
                    searchQuery.length >= 3 && !isSearching && (
                        <View style={[styles.searchResultsBox, { backgroundColor: colors.paper, padding: 20, alignItems: 'center' }]}>
                            <Typography variant="body" color="stone">No users found matching "{searchQuery}"</Typography>
                            <Typography variant="caption" color="stone" style={{ marginTop: 4 }}>Try searching by @username or exact email</Typography>
                        </View>
                    )
                )}

                <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />}>
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
                            {sortedNetwork.length > 0 ? (
                                sortedNetwork.map((f: any) => {
                                    const friendId = f.user_id === user?.id ? f.friend_id : f.user_id;
                                    const shares = sharesBySender[friendId] || [];
                                    return (
                                        <FriendItem
                                            key={f.id}
                                            friendship={f}
                                            currentUserId={user?.id}
                                            colors={colors}
                                            onBlock={handleBlockUser}
                                            onReport={handleReportUser}
                                            onPress={() => shares.length > 0 ? setSelectedFriendId(friendId) : null}
                                            shareCount={shares.length}
                                            latestShare={shares[0]}
                                        />
                                    );
                                })
                            ) : (
                                incomingRequests.length === 0 && (
                                    <EmptyState
                                        icon={<Users size={40} color={colors.stone} />}
                                        title="Build your network"
                                        subtitle="Search for friends to start sharing your best finds directly with them."
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
                </ScrollView>
            </Animated.View>

            {/* DETAIL VIEW OVERLAY */}
            {selectedFriendId && (
                <Animated.View style={detailStyle}>
                    <View style={{ marginTop: 20, marginBottom: 20 }}>
                        <TouchableOpacity
                            onPress={() => setSelectedFriendId(null)}
                            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}
                            hitSlop={16}
                        >
                            <ArrowLeft size={20} color={colors.ink} weight="bold" />
                            <Typography variant="h3" style={{ marginLeft: 12 }}>Inbox</Typography>
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 32 }}>
                            {selectedFriend?.avatar_url ? (
                                <Image source={selectedFriend.avatar_url} style={styles.mediumAvatar} />
                            ) : (
                                <View style={[styles.mediumAvatar, { backgroundColor: colors.subtle, justifyContent: 'center', alignItems: 'center' }]}>
                                    <User size={24} color={colors.stone} weight="thin" />
                                </View>
                            )}
                            <View style={{ marginLeft: 16 }}>
                                <Typography variant="h2">{selectedFriend?.display_name}</Typography>
                                <Typography variant="body" color="stone">@{selectedFriend?.username}</Typography>
                            </View>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                            <View style={styles.feed}>
                                {(sharesBySender[selectedFriendId] || []).map((share: any) => (
                                    <SharedSiftCard
                                        key={share.id}
                                        share={share}
                                        user={user}
                                        colors={colors}
                                        queryClient={queryClient}
                                        router={useRouter()}
                                    />
                                ))}
                            </View>
                        </ScrollView>
                    </View>
                </Animated.View>
            )}
        </ScreenWrapper>
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
                    <Image source={share.sender.avatar_url} style={styles.tinyAvatar} />
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

function FriendItem({ friendship, currentUserId, colors, onAccept, onDecline, onBlock, onReport, onPress, shareCount = 0, latestShare }: any) {
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
                <Image source={friend.avatar_url} style={styles.mediumAvatar} />
            ) : (
                <View style={[styles.mediumAvatar, { backgroundColor: colors.subtle, justifyContent: 'center', alignItems: 'center' }]}>
                    <User size={24} color={colors.stone} weight="thin" />
                </View>
            )}
            <View style={{ flex: 1, marginLeft: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h3">{friend.display_name}</Typography>
                    {shareCount > 0 && (
                        <View style={[styles.badge, { backgroundColor: colors.subtle, marginLeft: 0 }]}>
                            <Typography style={{ fontSize: 10, color: colors.ink }}>{shareCount}</Typography>
                        </View>
                    )}
                </View>
                <Typography variant="caption" color="stone" numberOfLines={1}>
                    {latestShare ? latestShare.sift.title : `@${friend.username}`}
                </Typography>
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

function EmptyState({ icon, title, subtitle }: any) {
    return (
        <View style={styles.emptyContainer}>
            {icon}
            <Typography variant="h2" style={{ marginTop: 16 }}>{title}</Typography>
            <Typography variant="body" color="stone" style={{ marginTop: 8, textAlign: 'center' }}>{subtitle}</Typography>
        </View>
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
        marginBottom: 12
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
