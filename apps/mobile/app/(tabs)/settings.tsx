import React, { useState, useCallback } from "react";
import { View, ScrollView, RefreshControl, TouchableOpacity, StyleSheet, Pressable, Dimensions } from "react-native";
import { Typography } from "../../components/design-system/Typography";
import { COLORS, SPACING, BORDER, RADIUS, Theme } from "../../lib/theme";
import { Shield, Bell, User as UserIcon, SignOut, ClockCounterClockwise, ClipboardText, Vibrate, Trash } from 'phosphor-react-native';
import { supabase } from "../../lib/supabase";
import SiftFeed from "../../components/SiftFeed";
import ScreenWrapper from "../../components/ScreenWrapper";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "../../lib/auth";
import { SettingsRow } from "../../components/design-system/SettingsRow";
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import AsyncStorage from "@react-native-async-storage/async-storage";



export default function ProfileScreen() {
    const { width: SCREEN_WIDTH } = Dimensions.get('window');
    const { user, signOut } = useAuth();
    const router = useRouter();
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
            if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            // Optional: Alert user
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
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.ink} />
                }
            >
                {/* 1. USER HEADER */}
                <View style={styles.header}>
                    <Typography variant="label" style={styles.smallCapsLabel}>PRO MEMBER</Typography>
                    <Typography variant="h1" style={styles.serifTitle}>{user?.email ? user.email.split('@')[0] : "Guest"}</Typography>

                    <View style={styles.profileMeta}>
                        <Typography variant="subhead">{user?.email || "Guest"}</Typography>
                    </View>
                </View>

                {/* 2. DOSSIER ACTIONS (2x2 GRID) */}
                <View style={styles.gridContainer}>
                    <DossierTile
                        icon={UserIcon}
                        title="IDENTITY"
                        width={(SCREEN_WIDTH - 52) / 2}
                        onPress={() => { }} // Could show user email/details
                    />
                    <DossierTile
                        icon={Shield}
                        title="PRIVACY"
                        width={(SCREEN_WIDTH - 52) / 2}
                        onPress={() => Linking.openURL('https://sift-rho.vercel.app/privacy')}
                    />
                    <DossierTile
                        icon={Bell}
                        title="ALERTS"
                        width={(SCREEN_WIDTH - 52) / 2}
                        onPress={() => Linking.openSettings()}
                    />
                    <DossierTile
                        icon={ClockCounterClockwise}
                        title="HISTORY"
                        width={(SCREEN_WIDTH - 52) / 2}
                        onPress={() => router.push('/archive')}
                    />
                </View>

                {/* 3. SETTINGS ROWS */}
                <View style={styles.sectionHeader}>
                    <Typography variant="label">Preferences</Typography>
                </View>

                <View style={styles.settingsBox}>
                    <SettingsRow
                        label="Haptic Feedback"
                        description="Physical response to actions"
                        type="toggle"
                        value={hapticsEnabled}
                        onValueChange={toggleHaptics}
                        icon={<Vibrate size={20} color={COLORS.ink} />}
                    />
                    <SettingsRow
                        label="Auto-grab Clipboard"
                        description="Scan for links on app launch"
                        type="toggle"
                        value={autoClipboard}
                        onValueChange={toggleClipboard}
                        icon={<ClipboardText size={20} color={COLORS.ink} />}
                    />
                    <SettingsRow
                        label="Clear Cache"
                        description="Purge local storage and refresh"
                        onPress={clearCache}
                        icon={<Trash size={20} color={COLORS.ink} />}
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
                            <Typography variant="body" color={COLORS.stone}>No pinned items yet.</Typography>
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

const DossierTile = ({ icon: Icon, title, width, onPress }: { icon: any, title: string, width: number, onPress?: () => void }) => (
    <Pressable
        onPress={onPress}
        style={({ pressed }) => [
            styles.tile,
            { width },
            pressed && { backgroundColor: '#F2F2F7', transform: [{ scale: 0.98 }] }
        ]}
    >
        <Icon size={32} color={COLORS.ink} weight="regular" />
        <Typography variant="label" style={styles.tileLabel}>{title}</Typography>
    </Pressable>
);

const styles = StyleSheet.create({
    scrollContent: {
        paddingBottom: 160,
    },
    header: {
        paddingHorizontal: 20,
        marginTop: SPACING.m,
        marginBottom: 24,
    },
    smallCapsLabel: {
        color: COLORS.stone,
        marginBottom: 4,
    },
    serifTitle: {
        marginBottom: 4,
    },
    profileMeta: {
        marginTop: 2,
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
    logoutButton: {
        marginTop: 60,
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        paddingVertical: 16,
        paddingHorizontal: 32,
        backgroundColor: COLORS.paper, // White Pills
        borderRadius: RADIUS.pill, // Full Pill
        ...Theme.shadows.soft,
    },
    emptyState: {
        padding: SPACING.xl,
        alignItems: 'center',
    }
});
