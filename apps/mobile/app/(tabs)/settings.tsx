import React, { useState, useCallback } from "react";
import { View, ScrollView, RefreshControl, Image, TouchableOpacity, StyleSheet, Pressable, Dimensions } from "react-native";
import { Typography } from "../../components/design-system/Typography";
import { COLORS, SPACING, Theme, RADIUS } from "../../lib/theme";
import { TEXT } from "../../lib/typography";
import { Gear, Shield, Bell, CaretRight, User as UserIcon, SignOut } from 'phosphor-react-native';
import { supabase } from "../../lib/supabase";
import SiftFeed from "../../components/SiftFeed";
import ScreenWrapper from "../../components/ScreenWrapper";
import { useFocusEffect } from "expo-router";

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
    const [savedPages, setSavedPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchSavedPages = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('pages')
                .select('*')
                .eq('is_pinned', true)
                .order('created_at', { ascending: false });

            if (data) setSavedPages(data as any);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchSavedPages();
        }, [fetchSavedPages])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchSavedPages();
    }

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
                    <View style={styles.avatarContainer}>
                        <Image
                            source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400' }}
                            style={styles.avatar}
                        />
                    </View>
                    <Typography variant="h1" style={styles.name}>Ryan Jun</Typography>
                    <Typography variant="body" color={COLORS.stone}>@ryanjun • Pro Member</Typography>

                    <View style={styles.statsRow}>
                        <Stat label="Sifts" value="1.2k" />
                        <Stat label="Lists" value="12" />
                        <Stat label="Karma" value="84" />
                    </View>
                </View>

                {/* 2. BENTO ACTIONS */}
                <View style={styles.sectionHeader}>
                    <Typography variant="label" color={COLORS.stone}>Account Settings</Typography>
                </View>

                <View style={styles.bentoGrid}>
                    <BentoTile icon={UserIcon} title="Personal Info" subtitle="Profile & Identity" wide />
                    <View style={styles.row}>
                        <BentoTile icon={Bell} title="Notifications" />
                        <BentoTile icon={Shield} title="Privacy" />
                    </View>
                    <BentoTile icon={Gear} title="Preferences" subtitle="Display & Interface" wide />
                </View>

                {/* 3. SAVED ITEMS SECTION */}
                <View style={[styles.sectionHeader, { marginTop: SPACING.xl }]}>
                    <Typography variant="label" color={COLORS.stone}>Pinned Artifacts</Typography>
                </View>

                <View style={styles.feedWrapper}>
                    <SiftFeed pages={savedPages} loading={loading} />

                    {savedPages.length === 0 && !loading && (
                        <View style={styles.emptyState}>
                            <Typography variant="body" color={COLORS.stone}>No pinned items yet.</Typography>
                        </View>
                    )}
                </View>

                <TouchableOpacity style={styles.logoutButton}>
                    <SignOut size={18} color={COLORS.terracotta} style={{ marginRight: 8 }} />
                    <Typography variant="bodyMedium" color={COLORS.terracotta}>Sign Out</Typography>
                </TouchableOpacity>

            </ScrollView>
        </ScreenWrapper>
    );
}

const Stat = ({ label, value }: { label: string, value: string }) => (
    <View style={styles.statItem}>
        <Typography variant="h2" style={styles.statValue}>{value}</Typography>
        <Typography variant="label" style={styles.statLabel}>{label}</Typography>
    </View>
);

const BentoTile = ({ icon: Icon, title, subtitle, wide }: { icon: any, title: string, subtitle?: string, wide?: boolean }) => (
    <Pressable
        style={({ pressed }) => [
            styles.tile,
            wide ? styles.tileWide : styles.tileHalf,
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
        ]}
    >
        <View style={styles.tileHeader}>
            <View style={styles.iconBox}>
                <Icon size={20} color={COLORS.ink} weight="duotone" />
            </View>
            {wide && <CaretRight size={16} color={COLORS.stone} />}
        </View>
        <View>
            <Typography variant="bodyMedium" style={styles.tileTitle}>{title}</Typography>
            {subtitle && <Typography variant="caption" color={COLORS.stone}>{subtitle}</Typography>}
        </View>
    </Pressable>
);

const styles = StyleSheet.create({
    scrollContent: {
        paddingBottom: 160,
    },
    header: {
        alignItems: 'center',
        marginTop: SPACING.m,
        marginBottom: SPACING.xl,
    },
    avatarContainer: {
        padding: 4,
        backgroundColor: COLORS.paper,
        borderRadius: 54,
        marginBottom: SPACING.m,
        ...Theme.shadows.soft,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    name: {
        marginBottom: 2,
    },
    statsRow: {
        flexDirection: 'row',
        marginTop: SPACING.l,
        gap: 40,
        backgroundColor: COLORS.paper,
        paddingVertical: SPACING.m,
        paddingHorizontal: SPACING.xl,
        borderRadius: RADIUS.l,
        ...Theme.shadows.soft,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
    },
    statLabel: {
        fontSize: 9,
        marginTop: 2,
    },
    sectionHeader: {
        paddingHorizontal: SPACING.l,
        marginBottom: SPACING.s,
    },
    bentoGrid: {
        paddingHorizontal: SPACING.l,
        gap: 12,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    tile: {
        backgroundColor: COLORS.paper,
        borderRadius: RADIUS.l,
        padding: SPACING.m,
        justifyContent: 'space-between',
        ...Theme.shadows.soft,
    },
    tileWide: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
    },
    tileHalf: {
        flex: 1,
        height: 130,
        flexDirection: 'column',
    },
    tileHeader: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.m,
        backgroundColor: COLORS.vapor,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tileTitle: {
        fontSize: 15,
    },
    feedWrapper: {
        marginTop: SPACING.s,
    },
    logoutButton: {
        marginTop: 60,
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: 'rgba(198, 125, 99, 0.08)',
        borderRadius: RADIUS.pill,
    },
    emptyState: {
        padding: SPACING.xl,
        alignItems: 'center',
    }
});
