import * as React from 'react';
import { useState, useCallback } from "react";
import { Share, View, ScrollView, RefreshControl, TouchableOpacity, StyleSheet, Pressable, Dimensions, Image, Alert } from "react-native";
import { Typography } from "../../components/design-system/Typography";
import { COLORS, SPACING, BORDER, RADIUS, Theme } from "../../lib/theme";
import { Shield, Bell, User as UserIcon, SignOut, ClockCounterClockwise, ClipboardText, Vibrate, Trash, FileText, CaretRight, Crown, ShareNetwork, Eye, FilmSlate, PushPin, Heart, Star, Bookmark, Lightning } from 'phosphor-react-native';
import * as Clipboard from 'expo-clipboard';
import { supabase } from "../../lib/supabase";
import SiftFeed from "../../components/SiftFeed";
import ScreenWrapper from "../../components/ScreenWrapper";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "../../lib/auth";
import { SettingsRow } from "../../components/design-system/SettingsRow";
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UsageTracker } from "../../components/UsageTracker";
import { useSubscription } from "../../hooks/useSubscription";
import { useTheme } from "../../context/ThemeContext";
import { ActionSheet } from '../../components/modals/ActionSheet';
import { useQueryClient } from '@tanstack/react-query';
import { usePersonalization } from '../../context/PersonalizationContext';
import { useToast } from '../../context/ToastContext';
import { SiftPickerModal } from '../../components/modals/SiftPickerModal';

export default function ProfileScreen() {
    const { width: SCREEN_WIDTH } = Dimensions.get('window');
    const { user, tier, profile, refreshProfile, signOut, updateProfileInDB } = useAuth();
    const { setPinIcon } = usePersonalization();
    const { description: tierName } = useSubscription();
    const { showToast } = useToast();
    const router = useRouter();
    const {
        theme,
        setTheme,
        colors,
        isDark,
        highContrast,
        setHighContrast,
        reduceMotion,
        setReduceMotion
    } = useTheme();

    const queryClient = useQueryClient();
    const [savedPages, setSavedPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Settings State
    const [hapticsEnabled, setHapticsEnabled] = useState(true);
    const [autoClipboard, setAutoClipboard] = useState(true);

    const fetchSavedPages = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('pages')
                .select('id, title, summary, tags, created_at, url, is_pinned, metadata') // OPTIMIZE: Exclude 'content'
                .eq('user_id', user?.id)
                .eq('is_pinned', true)
                .order('created_at', { ascending: false });

            if (data) setSavedPages(data as any);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    const loadSettings = useCallback(async () => {
        try {
            const h = await AsyncStorage.getItem('settings_haptics');
            const c = await AsyncStorage.getItem('settings_clipboard');
            if (h !== null) setHapticsEnabled(h === 'true');
            if (c !== null) setAutoClipboard(c === 'true');
        } catch (e) {
            console.error(e);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchSavedPages();
            loadSettings();
            refreshProfile(); // Refresh user profile on focus
        }, [fetchSavedPages, loadSettings, refreshProfile])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([
            fetchSavedPages(),
            refreshProfile()
        ]);
        setRefreshing(false);
    }

    const toggleHaptics = async (value: boolean) => {
        setHapticsEnabled(value);
        await AsyncStorage.setItem('settings_haptics', String(value));
        if (value) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const toggleClipboard = async (value: boolean) => {
        setAutoClipboard(value);
        await AsyncStorage.setItem('settings_clipboard', String(value));
        if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const toggleHighContrast = async (value: boolean) => {
        await setHighContrast(value);
        if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const toggleReduceMotion = async (value: boolean) => {
        await setReduceMotion(value);
        if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const clearCache = async () => {
        try {
            await AsyncStorage.removeItem('sift_pages_cache');
            queryClient.clear();
            if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast("Cache Cleared");
        } catch (e) {
            console.error(e);
        }
    };

    const inviteFriends = async () => {
        if (!profile?.sift_id) {
            Alert.alert("Wait a second", "We're still setting up your Sift ID. Try again in a moment!");
            return;
        }

        const message = `Hey! I've been using Sift to stay mindful of the cool things I find online. 🕊️ I thought you'd love it too! Let's connect so we can share our favorite finds.\n\nMy Sift ID is: ${profile.sift_id}\n\nJoin me here: sift://user/${profile.sift_id}`;

        try {
            await Share.share({
                message,
                title: 'Connect on Sift',
            });
            if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
            Alert.alert("Error", error.message);
        }
    };

    return (
        <ScreenWrapper edges={['top']}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />
                }
            >
                {/* 1. USER HEADER */}
                <View style={styles.profileHeader}>
                    <View style={[styles.avatarContainer, { backgroundColor: colors.paper, borderColor: colors.separator }]}>
                        {user?.user_metadata?.avatar_url ? (
                            <Image
                                source={{ uri: user.user_metadata.avatar_url }}
                                style={styles.avatarImage}
                            />
                        ) : (
                            <Typography variant="h1" color="stone">
                                {(user?.user_metadata?.display_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                            </Typography>
                        )}
                    </View>
                    <View style={styles.profileInfo}>
                        <View style={[styles.tierBadge, (tier !== 'free') ? { backgroundColor: colors.ink } : { backgroundColor: colors.subtle, borderWidth: 1, borderColor: colors.separator }]}>
                            <Typography variant="label" style={[styles.tierText, { color: (tier !== 'free') ? colors.paper : colors.stone }]}>
                                {tier === 'admin' ? 'ADMIN' : `${tierName.toUpperCase()} MEMBER`}
                            </Typography>
                        </View>
                        <Typography variant="label" color="stone" style={styles.smallCapsLabel}>YOUR • IDENTITY</Typography>
                        <Typography variant="h2" style={[styles.serifTitle, { marginBottom: 0 }]}>
                            {profile?.display_name || user?.email?.split('@')[0] || 'User'}
                        </Typography>
                        <Typography variant="body" color="stone" numberOfLines={2} style={styles.userBio}>
                            {profile?.bio || 'No bio yet.'}
                        </Typography>
                        {profile?.username && (
                            <Typography variant="label" color="stone" style={styles.handle}>
                                @{profile.username.toLowerCase()}
                            </Typography>
                        )}
                    </View>
                </View>

                {/* USAGE TRACKER (Tier-Aware) */}
                <UsageTracker />

                {/* 2. ACCOUNT SECTION */}
                <View style={styles.sectionHeader}>
                    <Typography variant="label">Account</Typography>
                </View>
                <View style={[styles.settingsBox, { backgroundColor: colors.paper, borderColor: colors.separator }]}>
                    <SettingsRow
                        label="Identity"
                        description="Profile, Avatar, and Bio"
                        onPress={() => router.push('/settings/identity')}
                        icon={<UserIcon size={20} color={colors.ink} />}
                    />
                    <SettingsRow
                        label="Membership"
                        description={tier === 'free' ? 'Upgrade for more sifts' : 'Manage your subscription'}
                        onPress={() => router.push('/settings/subscription')}
                        icon={<Crown size={20} color={colors.ink} />}
                    />
                    <SettingsRow
                        label="History"
                        description="Activity log and recent actions"
                        onPress={() => router.push('/settings/history')}
                        icon={<ClockCounterClockwise size={20} color={colors.ink} />}
                    />
                    <SettingsRow
                        label="Invite Friends"
                        description={`Sift ID: ${profile?.sift_id || 'Generating...'}`}
                        onPress={inviteFriends}
                        icon={<ShareNetwork size={20} color={colors.ink} />}
                    />
                </View>

                {/* 3. PREFERENCES SECTION */}
                <View style={styles.sectionHeader}>
                    <Typography variant="label">Preferences</Typography>
                </View>
                <View style={[styles.settingsBox, { backgroundColor: colors.paper, borderColor: colors.separator }]}>
                    <SettingsRow
                        label="Haptic Feedback"
                        description="Tactile response to actions"
                        type="toggle"
                        value={hapticsEnabled}
                        onValueChange={toggleHaptics}
                        icon={<Vibrate size={20} color={colors.ink} />}
                    />
                    <SettingsRow
                        label="Personalization"
                        description="App icons, themes, and styles"
                        onPress={() => router.push('/settings/personalization')}
                        icon={<Star size={20} color={colors.ink} />}
                    />
                    <SettingsRow
                        label="Alerts"
                        description="Notification and digest settings"
                        onPress={() => router.push('/settings/alerts')}
                        icon={<Bell size={20} color={colors.ink} />}
                    />

                    <SettingsRow
                        label="Auto-grab Clipboard"
                        description="Scan for links on app launch"
                        type="toggle"
                        value={autoClipboard}
                        onValueChange={toggleClipboard}
                        icon={<ClipboardText size={20} color={colors.ink} />}
                    />
                    <SettingsRow
                        label="Clear Cache"
                        description="Purge local storage and refresh"
                        onPress={clearCache}
                        icon={<Trash size={20} color={colors.ink} />}
                    />
                    <SettingsRow
                        label="High Contrast"
                        description="Increase legibility"
                        type="toggle"
                        value={highContrast}
                        onValueChange={toggleHighContrast}
                        icon={<Eye size={20} color={colors.ink} />}
                    />
                    <SettingsRow
                        label="Reduce Motion"
                        description="Minimize animations"
                        type="toggle"
                        value={reduceMotion}
                        onValueChange={toggleReduceMotion}
                        icon={<FilmSlate size={20} color={colors.ink} />}
                    />

                    <View style={[styles.pinStylePicker, { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.separator }]}>
                        <Typography variant="label" style={{ marginBottom: 12 }}>Pin Icon Style</Typography>
                        <View style={styles.pinIconRow}>
                            {[
                                { id: 'pin', icon: PushPin },
                                { id: 'heart', icon: Heart },
                                { id: 'star', icon: Star },
                                { id: 'bookmark', icon: Bookmark },
                                { id: 'lightning', icon: Lightning }
                            ].map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setPinIcon(item.id as any);
                                    }}
                                    style={[
                                        styles.pinIconItem,
                                        { backgroundColor: colors.canvas, borderColor: colors.separator },
                                        profile?.pin_style === item.id && { borderColor: colors.accent, borderWidth: 2 }
                                    ]}
                                >
                                    <item.icon size={20} color={profile?.pin_style === item.id ? colors.accent : colors.stone} weight="fill" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>



                {/* 4. APPEARANCE SECTION */}
                <View style={styles.sectionHeader}>
                    <Typography variant="label">Appearance</Typography>
                </View>
                <View style={[styles.settingsBox, { backgroundColor: colors.paper, borderColor: colors.separator }]}>
                    <TouchableOpacity
                        style={[styles.appearanceOption, theme === 'light' && { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }, { borderColor: colors.separator }]}
                        onPress={() => setTheme('light')}
                    >
                        <Typography variant="body" color={theme === 'light' ? "accent" : "ink"}>Light Mode</Typography>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.appearanceOption, theme === 'dark' && { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }, { borderColor: colors.separator }]}
                        onPress={() => setTheme('dark')}
                    >
                        <Typography variant="body" color={theme === 'dark' ? "accent" : "ink"}>Midnight Mode</Typography>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.appearanceOption, theme === 'system' && { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }, { borderBottomWidth: 0, borderColor: colors.separator }]}
                        onPress={() => setTheme('system')}
                    >
                        <Typography variant="body" color={theme === 'system' ? "accent" : "ink"}>System Mode</Typography>
                    </TouchableOpacity>
                </View>

                {/* 5. LEGAL & SUPPORT SECTION */}
                <View style={styles.sectionHeader}>
                    <Typography variant="label">Legal & Support</Typography>
                </View>
                <View style={[styles.settingsBox, { backgroundColor: colors.paper, borderColor: colors.separator }]}>
                    <SettingsRow
                        label="Privacy Policy"
                        onPress={() => router.push('/settings/privacy')}
                        icon={<Shield size={20} color={colors.ink} />}
                    />
                    <SettingsRow
                        label="Terms of Service"
                        onPress={() => router.push('/settings/terms')}
                        icon={<FileText size={20} color={colors.ink} />}
                    />
                    <SettingsRow
                        label="Delete Account"
                        onPress={() => router.push('/settings/privacy')}
                        icon={<Trash size={20} color="#EF4444" />}
                        description="Permanently remove your account and data"
                    />
                </View>

                {/* 4. SAVED ITEMS SECTION */}
                <View style={styles.sectionHeader}>
                    <Typography variant="label">Pinned Artifacts</Typography>
                </View>

                <View style={styles.feedWrapper}>
                    <SiftFeed
                        pages={savedPages}
                        loading={loading}
                        onPin={async (id) => {
                            try {
                                const page = savedPages.find(p => p.id === id);
                                if (!page) return;

                                const newPinnedState = !page.is_pinned;

                                // Optimistic update
                                setSavedPages(prev =>
                                    prev.map(p => p.id === id ? { ...p, is_pinned: newPinnedState } : p)
                                        .filter(p => p.is_pinned) // If unpinned, remove from saved list
                                );

                                const { error } = await supabase.from('pages').update({ is_pinned: newPinnedState }).eq('id', id);
                                if (error) throw error;
                                fetchSavedPages(); // Final sync
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            } catch (e) {
                                console.error('[Pin/Settings] Error:', e);
                                fetchSavedPages(); // Revert on error
                                Alert.alert("Error", "Failed to update pin");
                            }
                        }}
                        onArchive={async (id) => {
                            try {
                                const { error } = await supabase.from('pages').update({ is_archived: true }).eq('id', id);
                                if (error) throw error;
                                fetchSavedPages();
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                Alert.alert("Success", "Moved to Archive");
                            } catch (e) { Alert.alert("Error", "Failed to archive"); }
                        }}
                        onDeleteForever={async (id) => {
                            try {
                                const { error } = await supabase.from('pages').delete().eq('id', id);
                                if (error) throw error;
                                fetchSavedPages();
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                Alert.alert("Success", "Permanently Deleted");
                            } catch (e) { Alert.alert("Error", "Failed to delete"); }
                        }}
                    />

                    {(!savedPages || savedPages.length === 0) && !loading && (
                        <View style={styles.emptyState}>
                            <Typography variant="body" color="stone">No pinned items yet.</Typography>
                        </View>
                    )}
                </View>

                <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.paper, borderColor: colors.separator }]} onPress={signOut}>
                    <SignOut size={18} color="#C67D63" style={{ marginRight: 8 }} />
                    <Typography variant="label" style={{ color: '#C67D63' }}>Sign Out</Typography>
                </TouchableOpacity>

            </ScrollView>
        </ScreenWrapper >
    );
}


const styles = StyleSheet.create({
    scrollContent: {
        paddingBottom: 160,
    },
    profileHeader: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginTop: SPACING.m,
        marginBottom: 24,
        alignItems: 'center',
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        ...Theme.shadows.soft,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    profileInfo: {
        flex: 1,
        marginLeft: 16,
    },
    smallCapsLabel: {
        marginBottom: 2,
    },
    serifTitle: {
        fontSize: 32,
        fontFamily: 'PlayfairDisplay_700Bold',
        color: COLORS.ink,
        marginBottom: 4,
    },
    userBio: {
        fontSize: 14,
        marginTop: 2,
    },
    tierBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginBottom: 4,
    },
    tierText: {
        fontSize: 10,
        fontWeight: '700',
    },
    handle: {
        marginTop: 4,
        letterSpacing: 0.5,
    },
    gridContainer: {
        paddingHorizontal: 20,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: SPACING.xl,
    },
    tile: {
        aspectRatio: 1, // FORCE SQUARE
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: RADIUS.l, // Pebble Shape (24)
        padding: 16,
        // Soft Shadow (Ambient)
        ...Theme.shadows.soft,
        // No Border for Cozy look (or extremely subtle if needed)
    },
    tileLabel: {
        marginTop: 12,
        fontSize: 13,
        fontWeight: '500', // Reduced weight
        fontFamily: 'System', // Keep clean sans
    },
    settingsBox: {
        marginHorizontal: 20,
        borderRadius: RADIUS.m,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
    },
    sectionHeader: {
        paddingHorizontal: 20,
        marginBottom: SPACING.s,
        marginTop: SPACING.m,
    },
    feedWrapper: {
        marginTop: SPACING.s,
    },
    appearanceOption: {
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    logoutButton: {
        marginTop: 40,
        marginBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: RADIUS.pill,
        ...Theme.shadows.soft,
        borderWidth: StyleSheet.hairlineWidth,
    },
    emptyState: {
        padding: SPACING.xl,
        alignItems: 'center',
    },
    pinStylePicker: {
        padding: 16,
    },
    pinIconRow: {
        flexDirection: 'row',
        gap: 12,
    },
    pinIconItem: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    }
});
