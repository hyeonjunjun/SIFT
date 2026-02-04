import * as React from 'react';
import { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Alert } from 'react-native';
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

export default function SocialScreen() {
    const { colors } = useTheme();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'friends' | 'shared'>('shared');
    const [refreshing, setRefreshing] = useState(false);

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
        enabled: !!user?.id
    });

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
        enabled: !!user?.id
    });

    // 3. Discovery (Search)
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async (text: string) => {
        setSearchQuery(text);
        if (text.length < 3) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            // Search by username OR exact email
            const { data } = await supabase
                .from('profiles')
                .select('id, username, display_name, avatar_url, email')
                .or(`username.ilike.%${text}%,email.eq.${text.toLowerCase()}`)
                .neq('id', user?.id)
                .limit(5);

            if (data) setSearchResults(data);
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
                if (error.code === '23505') Alert.alert("Relationship exists", "You are already connected or have a pending request.");
                else throw error;
            } else {
                Alert.alert("Sent", "Friend request sent!");
                queryClient.invalidateQueries({ queryKey: ['friendships', user?.id] });
                setSearchQuery('');
                setSearchResults([]);
            }
        } catch (e: any) { Alert.alert("Error", e.message); }
    };

    const handleAccept = async (id: string) => {
        try {
            const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', id);
            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['friendships', user?.id] });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e: any) { Alert.alert("Error", e.message); }
    };

    const handleDecline = async (id: string) => {
        try {
            const { error } = await supabase.from('friendships').delete().eq('id', id);
            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['friendships', user?.id] });
        } catch (e: any) { Alert.alert("Error", e.message); }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['friendships', user?.id] }),
            queryClient.invalidateQueries({ queryKey: ['shared_sifts', user?.id] })
        ]);
        setRefreshing(false);
    };

    return (
        <ScreenWrapper edges={['top']}>
            <View style={styles.header}>
                <Typography variant="label" color="stone" style={styles.smallCapsLabel}>NATIVE NETWORK</Typography>
                <Typography variant="h1" style={styles.serifTitle}>Social</Typography>
            </View>

            <View style={[styles.searchContainer, { backgroundColor: colors.paper, borderColor: colors.separator }]}>
                <MagnifyingGlass size={18} color={colors.stone} weight="bold" />
                <TextInput
                    style={[styles.searchInput, { color: colors.ink }]}
                    placeholder="Add friends..."
                    placeholderTextColor={colors.stone}
                    value={searchQuery}
                    onChangeText={handleSearch}
                    autoCapitalize="none"
                />
                {isSearching && (
                    <ActivityIndicator size="small" color={colors.ink} />
                )}
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
                    <Typography variant="label" color={activeTab === 'friends' ? "ink" : "stone"}>Friends</Typography>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />}>
                {activeTab === 'shared' ? (
                    <View style={styles.feed}>
                        {sharedSifts.length === 0 ? (
                            <EmptyState icon={<ShareNetwork size={40} color={colors.stone} />} title="No sifts yet" subtitle="Gems shared by friends will land here." />
                        ) : (
                            sharedSifts.map((share: any) => <SharedSiftCard key={share.id} share={share} colors={colors} />)
                        )}
                    </View>
                ) : (
                    <View style={styles.friendsList}>
                        {friendships.length === 0 ? (
                            <EmptyState icon={<Users size={40} color={colors.stone} />} title="Lonely in here?" subtitle="Search for friends to start sharing gems." />
                        ) : (
                            friendships.map((f: any) => (
                                <FriendItem key={f.id} friendship={f} currentUserId={user?.id} colors={colors} onAccept={() => handleAccept(f.id)} onDecline={() => handleDecline(f.id)} />
                            ))
                        )}
                    </View>
                )}
            </ScrollView>
        </ScreenWrapper>
    );
}

function SharedSiftCard({ share, colors }: any) {
    const { user } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [collecting, setCollecting] = useState(false);

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
            Alert.alert("Collected!", "Shared gem added to your library.");
            queryClient.invalidateQueries({ queryKey: ['pages', user.id] });
        } catch (e: any) { Alert.alert("Error", e.message); }
        finally { setCollecting(false); }
    };

    return (
        <TouchableOpacity style={[styles.card, { backgroundColor: colors.paper, borderColor: colors.separator }]} onPress={() => router.push(`/page/${share.sift.id}`)}>
            <View style={styles.cardHeader}>
                <Image source={share.sender.avatar_url} style={styles.tinyAvatar} />
                <Typography variant="caption" color="stone" style={{ marginLeft: 8 }}>{share.sender.display_name} shared a gem</Typography>
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
                amRequester ? <Typography variant="caption" color="stone">Sent</Typography> : (
                    <View style={styles.actionRow}>
                        <TouchableOpacity onPress={onAccept}><Check size={20} color={COLORS.success} /></TouchableOpacity>
                        <TouchableOpacity onPress={onDecline}><X size={20} color={COLORS.danger} /></TouchableOpacity>
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
    serifTitle: { fontSize: 34 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, paddingHorizontal: 16, height: 48, borderRadius: RADIUS.m, borderWidth: StyleSheet.hairlineWidth, marginBottom: 12 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
    searchResultsBox: { marginHorizontal: 20, borderRadius: RADIUS.m, ...Theme.shadows.medium, marginBottom: 20, overflow: 'hidden' },
    searchResultItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.separator },
    miniAvatar: { width: 32, height: 32, borderRadius: 16 },
    mediumAvatar: { width: 48, height: 48, borderRadius: 24 },
    tinyAvatar: { width: 20, height: 20, borderRadius: 10 },
    tabsContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20, gap: 24 },
    tab: { paddingBottom: 8 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 160 },
    card: { padding: 20, borderRadius: RADIUS.m, borderWidth: StyleSheet.hairlineWidth, marginBottom: 16, ...Theme.shadows.soft },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    cardBody: { marginBottom: 16 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    collectButton: { backgroundColor: COLORS.ink, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.pill },
    friendItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
    actionRow: { flexDirection: 'row', gap: 16 },
    feed: { gap: 16 },
    friendsList: {},
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }
});
