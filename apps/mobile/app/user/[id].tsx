import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as React from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CaretLeft, UserPlus, Check, X } from 'phosphor-react-native';
import { Typography } from '../../components/design-system/Typography';
import { COLORS, SPACING, RADIUS, Theme } from '../../lib/theme';
import { useTheme } from '../../context/ThemeContext';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';

export default function UserProfileScreen() {
    const { id } = useLocalSearchParams();
    const { colors } = useTheme();
    const { user } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();

    const { data: profile, isLoading, isError } = useQuery({
        queryKey: ['profile', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!id
    });

    const { data: friendship } = useQuery({
        queryKey: ['friendship', user?.id, id],
        queryFn: async () => {
            if (!user?.id || !id) return null;
            const { data, error } = await supabase
                .from('friendships')
                .select('*')
                .or(`and(user_id.eq.${user.id},friend_id.eq.${id}),and(user_id.eq.${id},friend_id.eq.${user.id})`)
                .single();
            if (error && error.code !== 'PGRST116') throw error;
            return data;
        },
        enabled: !!user?.id && !!id
    });

    const sendFriendRequest = async () => {
        if (!user?.id || !id) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            const { error } = await supabase
                .from('friendships')
                .insert([{ user_id: user.id, friend_id: id as string, status: 'pending' }]);
            if (error) throw error;
            Alert.alert("Sent", "Friend request sent!");
            queryClient.invalidateQueries({ queryKey: ['friendship', user.id, id] });
        } catch (e: any) {
            Alert.alert("Error", e.message);
        }
    };

    if (isLoading) {
        return (
            <ScreenWrapper edges={['top']}>
                <View style={styles.centered}><ActivityIndicator color={colors.ink} /></View>
            </ScreenWrapper>
        );
    }

    if (isError || !profile) {
        return (
            <ScreenWrapper edges={['top']}>
                <View style={styles.centered}>
                    <Typography variant="h2">User not found</Typography>
                    <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                        <Typography variant="label" color="stone">Go Back</Typography>
                    </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <CaretLeft size={28} color={colors.ink} />
                </TouchableOpacity>
                <Typography variant="h3">Profile</Typography>
                <View style={{ width: 28 }} />
            </View>

            <View style={styles.content}>
                <View style={[styles.avatarContainer, { backgroundColor: colors.paper, borderColor: colors.separator }]}>
                    {profile.avatar_url ? (
                        <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                    ) : (
                        <Typography variant="h1" color="stone">
                            {(profile.display_name?.[0] || 'U').toUpperCase()}
                        </Typography>
                    )}
                </View>

                <Typography variant="h1" style={styles.name}>{profile.display_name}</Typography>
                {profile.username && (
                    <Typography variant="label" color="stone" style={styles.username}>@{profile.username.toLowerCase()}</Typography>
                )}

                {profile.bio && (
                    <Typography variant="body" color="stone" style={styles.bio}>{profile.bio}</Typography>
                )}

                <View style={styles.actionSection}>
                    {id === user?.id ? (
                        <Typography variant="label" color="stone">This is you</Typography>
                    ) : friendship ? (
                        <View style={[styles.statusBadge, { backgroundColor: colors.subtle }]}>
                            {friendship.status === 'accepted' ? (
                                <View style={styles.row}>
                                    <Check size={18} color={colors.ink} />
                                    <Typography variant="label" style={{ marginLeft: 8 }}>Friends</Typography>
                                </View>
                            ) : (
                                <Typography variant="label" color="stone">Request Pending</Typography>
                            )}
                        </View>
                    ) : (
                        <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.ink }]} onPress={sendFriendRequest}>
                            <UserPlus size={20} color={colors.paper} />
                            <Typography variant="label" style={{ color: colors.paper, marginLeft: 10 }}>Add Friend</Typography>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 60,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 40,
        paddingHorizontal: 24,
    },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        ...Theme.shadows.soft,
        marginBottom: 24,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    name: {
        fontSize: 28,
        textAlign: 'center',
    },
    username: {
        marginTop: 4,
        letterSpacing: 1,
    },
    bio: {
        marginTop: 20,
        textAlign: 'center',
        lineHeight: 22,
    },
    actionSection: {
        marginTop: 40,
        width: '100%',
        alignItems: 'center',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: RADIUS.pill,
        ...Theme.shadows.medium,
    },
    statusBadge: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: RADIUS.pill,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    }
});
