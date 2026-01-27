import * as React from 'react';
import { useState, useCallback } from "react";
import { View, ScrollView, RefreshControl, TouchableOpacity, StyleSheet, Pressable, Dimensions, Image, Alert } from "react-native";
import { Typography } from "../../components/design-system/Typography";
import { COLORS, SPACING, BORDER, RADIUS, Theme } from "../../lib/theme";
import { Shield, Bell, User as UserIcon, SignOut, ClockCounterClockwise, ClipboardText, Vibrate, Trash, FileText, CaretRight } from 'phosphor-react-native';
import { supabase } from "../../lib/supabase";
import SiftFeed from "../../components/SiftFeed";
import ScreenWrapper from "../../components/ScreenWrapper";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "../../lib/auth";
import { SettingsRow } from "../../components/design-system/SettingsRow";
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../context/ThemeContext";
import { useQueryClient } from '@tanstack/react-query';





export default function ProfileScreen() {
    const { width: SCREEN_WIDTH } = Dimensions.get('window');
    const { user, signOut } = useAuth();
    const router = useRouter();
    const { theme, setTheme, colors } = useTheme();
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
                .select('*')
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
        }, [fetchSavedPages, loadSettings])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchSavedPages();
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

    const clearCache = async () => {
        try {
            await AsyncStorage.removeItem('sift_pages_cache');
            queryClient.clear();
            if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Success", "Cache Cleared");
        } catch (e) {
            console.error(e);
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
                    <View style={styles.avatarContainer}>
                        {user?.user_metadata?.avatar_url ? (
                            <Image
                                source={{ uri: user.user_metadata.avatar_url }}
                                style={styles.avatarImage}
                            />
                        ) : (
                            <Typography variant="h1" color={colors.stone}>
                                {(user?.user_metadata?.display_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                            </Typography>
                        )}
                    </View>
                    <View style={styles.profileInfo}>
                        <View style={[styles.tierBadge, user?.user_metadata?.plan === 'Unlimited' ? styles.proBadge : styles.plusBadge]}>
                            <Typography variant="label" style={styles.tierText}>
                                {user?.user_metadata?.plan === 'Unlimited' ? 'PRO MEMBER' : 'PLUS MEMBER'}
                            </Typography>
                        </View>
                        <Typography variant="h2" style={[styles.serifTitle, { marginBottom: 0 }]}>
                            {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User'}
                        </Typography>
                        <Typography variant="body" color={colors.stone} numberOfLines={2} style={styles.userBio}>
                            {user?.user_metadata?.bio || 'No bio yet.'}
                        </Typography>
                        {user?.user_metadata?.username && (
                            <Typography variant="label" color={colors.stone} style={styles.handle}>
                                @{user.user_metadata.username.toLowerCase()}
                            </Typography>
                        )}
                    </View>
                </View>

                {/* 2. ACCOUNT SECTION */}
                <View style={styles.sectionHeader}>
                    <Typography variant="label">Account</Typography>
                </View>
                <View style={styles.settingsBox}>
                    <SettingsRow
                        label="Identity"
                        description="Profile, Avatar, and Bio"
                        onPress={() => router.push('/settings/identity')}
                        icon={<UserIcon size={20} color={colors.ink} />}
                    />
                    <SettingsRow
                        label="History"
                        description="Activity log and recent actions"
                        onPress={() => router.push('/settings/history')}
                        icon={<ClockCounterClockwise size={20} color={colors.ink} />}
                    />
                </View>

                {/* 3. PREFERENCES SECTION */}
                <View style={styles.sectionHeader}>
                    <Typography variant="label">Preferences</Typography>
                </View>
                <View style={styles.settingsBox}>
                    <SettingsRow
                        label="Haptic Feedback"
                        description="Tactile response to actions"
                        type="toggle"
                        value={hapticsEnabled}
                        onValueChange={toggleHaptics}
                        icon={<Vibrate size={20} color={colors.ink} />}
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
                </View>

                {/* 4. APPEARANCE SECTION */}
                <View style={styles.sectionHeader}>
                    <Typography variant="label">Appearance</Typography>
                </View>
                <View style={styles.settingsBox}>
                    <TouchableOpacity
                        style={[styles.appearanceOption, theme === 'light' && styles.selectedOption, { borderColor: colors.separator }]}
                        onPress={() => setTheme('light')}
                    >
                        <Typography variant="body" color={theme === 'light' ? colors.accent : colors.ink}>Light Mode</Typography>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.appearanceOption, theme === 'dark' && styles.selectedOption, { borderColor: colors.separator }]}
                        onPress={() => setTheme('dark')}
                    >
                        <Typography variant="body" color={theme === 'dark' ? colors.accent : colors.ink}>Midnight Mode</Typography>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.appearanceOption, theme === 'system' && styles.selectedOption, { borderBottomWidth: 0, borderColor: colors.separator }]}
                        onPress={() => setTheme('system')}
                    >
                        <Typography variant="body" color={theme === 'system' ? colors.accent : colors.ink}>System Mode</Typography>
                    </TouchableOpacity>
                </View>

                {/* 5. LEGAL & SUPPORT SECTION */}
                <View style={styles.sectionHeader}>
                    <Typography variant="label">Legal & Support</Typography>
                </View>
                <View style={styles.settingsBox}>
                    <SettingsRow
                        label="Privacy Policy"
                        onPress={() => router.push('/settings/privacy')}
                        icon={<Shield size={20} color={colors.ink} />}
                    />
                    <SettingsRow
                        label="Terms of Service"
                        onPress={() => Linking.openURL('https://sift-rho.vercel.app/terms')}
                        icon={<FileText size={20} color={colors.ink} />}
                    />
                </View>

                {/* 4. SAVED ITEMS SECTION */}
                <View style={styles.sectionHeader}>
                    <Typography variant="label">Pinned Artifacts</Typography>
                </View>

                <View style={styles.feedWrapper}>
                    <SiftFeed pages={savedPages} loading={loading} />

                    {savedPages.length === 0 && !loading && (
                        <View style={styles.emptyState}>
                            <Typography variant="body" color={colors.stone}>No pinned items yet.</Typography>
                        </View>
                    )}
                </View>

                <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
                    <SignOut size={18} color="#C67D63" style={{ marginRight: 8 }} />
                    <Typography variant="label" style={{ color: '#C67D63' }}>Sign Out</Typography>
                </TouchableOpacity>

            </ScrollView>
        </ScreenWrapper>
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
        backgroundColor: COLORS.paper,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.separator,
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
        color: COLORS.stone,
        marginBottom: 2,
    },
    serifTitle: {
        fontSize: 24,
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
    proBadge: {
        backgroundColor: COLORS.ink,
    },
    plusBadge: {
        backgroundColor: COLORS.subtle,
        borderWidth: 1,
        borderColor: COLORS.separator,
    },
    tierText: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.paper,
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
        backgroundColor: COLORS.paper, // White on Oatmeal
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
        color: COLORS.ink,
        fontFamily: 'System', // Keep clean sans
    },
    settingsBox: {
        marginHorizontal: 20,
        backgroundColor: COLORS.paper,
        borderRadius: RADIUS.m,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.separator,
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
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    selectedOption: {
        backgroundColor: 'rgba(110, 124, 148, 0.05)', // Subtle accent tint
    },
    logoutButton: {
        marginTop: 40,
        marginBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        paddingVertical: 14,
        paddingHorizontal: 32,
        backgroundColor: COLORS.paper,
        borderRadius: RADIUS.pill,
        ...Theme.shadows.soft,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.separator,
    },
    emptyState: {
        padding: SPACING.xl,
        alignItems: 'center',
    }
});
