import * as React from 'react';
import { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Alert, Dimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { MagnifyingGlass, UserPlus, Users, Check, X, ChatCircleText, ShareNetwork, Plus } from 'phosphor-react-native';
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
    const [activeTab, setActiveTab] = useState<'friends' | 'shared'>('shared');
    const [refreshing, setRefreshing] = useState(false);
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
            // Search by username (ilike), exact email (eq), or Sift ID (ilike)
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, display_name, avatar_url, email, sift_id')
                .or(`username.ilike.%${sanitized}%,email.eq.${sanitized.toLowerCase()},sift_id.ilike.%${sanitized}%`)
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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            const { error } = await supabase
                .from('friendships')
                .insert([{ user_id: user?.id, friend_id: targetUserId, status: 'pending' }]);
            if (error) {
                if (error.code === '23505') showToast({ message: "You are already connected or have a pending request.", type: 'error' });
                else throw error;
            } else {
                showToast("Friend request sent!");
                queryClient.invalidateQueries({ queryKey: ['friendships', user?.id] });
                setSearchQuery('');
                setSearchResults([]);
            }
        } catch (e: any) { showToast({ message: e.message, type: 'error' }); }
    };

    const handleAccept = async (id: string) => {
        try {
            const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', id);
            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['friendships', user?.id] });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast("Request declined");
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

    // Swipe gesture handler
    const panGesture = Gesture.Pan()
        .onUpdate((event) => {
            translateX.value = event.translationX;
        })
        .onEnd((event) => {
            const threshold = width * 0.2; // 20% of screen width
            if (event.translationX > threshold && activeTab === 'friends') {
                runOnJS(setActiveTab)('shared');
            } else if (event.translationX < -threshold && activeTab === 'shared') {
                runOnJS(setActiveTab)('friends');
            }
            translateX.value = withSpring(0);
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }]
    }));

    return (
        <ScreenWrapper edges={['top']}>
            <View style={styles.header}>
                <Typography variant="label" color="stone" style={styles.smallCapsLabel}>NATIVE • NETWORK</Typography>
                <Typography variant="h1" style={styles.serifTitle}>Social</Typography>
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

            <View style={styles.tabsContainer}>
                <TouchableOpacity onPress={() => setActiveTab('shared')} style={[styles.tab, activeTab === 'shared' && { borderBottomColor: colors.ink, borderBottomWidth: 2 }]}>
                    <Typography variant="label" color={activeTab === 'shared' ? "ink" : "stone"}>Shared</Typography>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('friends')} style={[styles.tab, activeTab === 'friends' && { borderBottomColor: colors.ink, borderBottomWidth: 2 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Typography variant="label" color={activeTab === 'friends' ? "ink" : "stone"}>Friends</Typography>
                        {incomingRequests.length > 0 && (
                            <View style={[styles.badge, { backgroundColor: COLORS.danger }]}>
                                <Typography variant="caption" style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                                    {incomingRequests.length}
                                </Typography>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </View>

            <GestureDetector gesture={panGesture}>
                <Animated.View style={animatedStyle}>
                    <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />}>
                        {activeTab === 'shared' ? (
                            <View style={styles.feed}>
                                {sharedSifts.length === 0 ? (
                                    <EmptyState icon={<ShareNetwork size={40} color={colors.stone} />} title="No shared sifts yet" subtitle="Sifts shared by friends will land here." />
                                ) : (
                                    sharedSifts.map((share: any) => <SharedSiftCard key={share.id} share={share} user={user} colors={colors} queryClient={queryClient} router={useRouter()} />)
                                )}
                            </View>
                        ) : (
                            <View style={styles.friendsList}>
                                {incomingRequests.length > 0 && (
                                    <View style={styles.section}>
                                        <Typography variant="label" color="stone" style={styles.sectionTitle}>REQUESTS ({incomingRequests.length})</Typography>
                                        {incomingRequests.map((f: any) => (
                                            <FriendItem key={f.id} friendship={f} currentUserId={user?.id} colors={colors} onAccept={() => handleAccept(f.id)} onDecline={() => handleDecline(f.id)} />
                                        ))}
                                    </View>
                                )}

                                {myNetwork.length > 0 ? (
                                    <View style={styles.section}>
                                        <Typography variant="label" color="stone" style={styles.sectionTitle}>MY NETWORK</Typography>
                                        {myNetwork.map((f: any) => (
                                            <FriendItem key={f.id} friendship={f} currentUserId={user?.id} colors={colors} />
                                        ))}
                                    </View>
                                ) : (
                                    incomingRequests.length === 0 && (
                                        <EmptyState icon={<Users size={40} color={colors.stone} />} title="Lonely in here?" subtitle="Search for friends to start sharing sifts." />
                                    )
                                )}

                                {outgoingRequests.length > 0 && (
                                    <View style={[styles.section, { opacity: 0.6 }]}>
                                        <Typography variant="label" color="stone" style={styles.sectionTitle}>SENT REQUESTS</Typography>
                                        {outgoingRequests.map((f: any) => (
                                            <FriendItem key={f.id} friendship={f} currentUserId={user?.id} colors={colors} onDecline={() => handleDecline(f.id)} />
                                        ))}
                                    </View>
                                )}
                            </View>
                        )}
                    </ScrollView>
                </Animated.View>
            </GestureDetector>
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
                <Image source={share.sender.avatar_url} style={styles.tinyAvatar} />
                <Typography variant="caption" color="stone" style={{ marginLeft: 8 }}>{share.sender.display_name} shared a sift</Typography>
            </View>
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

function FriendItem({ friendship, currentUserId, colors, onAccept, onDecline }: any) {
    const friend = friendship.user_id === currentUserId ? friendship.receiver : friendship.requester;
    const isPending = friendship.status === 'pending';
    const amRequester = friendship.user_id === currentUserId;

    return (
        <View style={[styles.friendItem, { borderBottomColor: colors.separator }]}>
            <Image source={friend.avatar_url} style={styles.mediumAvatar} />
            <View style={{ flex: 1, marginLeft: 16 }}>
                <Typography variant="h3">{friend.display_name}</Typography>
                <Typography variant="caption" color="stone">@{friend.username}</Typography>
            </View>
            {isPending ? (
                amRequester ? (
                    <View style={[styles.statusBadge, { backgroundColor: colors.subtle }]}>
                        <Typography variant="caption" color="stone">Pending</Typography>
                    </View>
                ) : (
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={[styles.actionButton, { backgroundColor: COLORS.success }]} onPress={onAccept}>
                            <Check size={16} color="white" weight="bold" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionButton, { backgroundColor: 'rgba(255,59,48,0.1)' }]} onPress={onDecline}>
                            <X size={16} color={COLORS.danger} weight="bold" />
                        </TouchableOpacity>
                    </View>
                )
            ) : <ChatCircleText size={20} color={colors.stone} />}
        </View>
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
