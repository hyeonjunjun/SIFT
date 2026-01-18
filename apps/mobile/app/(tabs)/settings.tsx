import React, { useState, useCallback } from "react";
import { View, ScrollView, RefreshControl, TouchableOpacity, StyleSheet, Pressable, Dimensions } from "react-native";
import { Typography } from "../../components/design-system/Typography";
import { COLORS, SPACING, BORDER } from "../../lib/theme";
import { Shield, Bell, User as UserIcon, SignOut, ClockCounterClockwise } from 'phosphor-react-native';
import { supabase } from "../../lib/supabase";
import SiftFeed from "../../components/SiftFeed";
import ScreenWrapper from "../../components/ScreenWrapper";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../../lib/auth";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProfileScreen() {
    const { user, signOut } = useAuth();
    const [savedPages, setSavedPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

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
                    <Typography variant="label" style={styles.smallCapsLabel}>PRO MEMBER</Typography>
                    <Typography variant="h1" style={styles.serifTitle}>{user?.email?.split('@')[0] || "Guest"}</Typography>

                    <View style={styles.profileMeta}>
                        <Typography variant="subhead">{user?.email || "Guest"}</Typography>
                    </View>
                </View>

                {/* 2. DOSSIER ACTIONS (2x2 GRID) */}
                <View style={styles.gridContainer}>
                    <DossierTile icon={UserIcon} title="IDENTITY" />
                    <DossierTile icon={Shield} title="PRIVACY" />
                    <DossierTile icon={Bell} title="ALERTS" />
                    <DossierTile icon={ClockCounterClockwise} title="HISTORY" />
                </View>

                {/* 3. SAVED ITEMS SECTION */}
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

const DossierTile = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <Pressable
        style={({ pressed }) => [
            styles.tile,
            pressed && { backgroundColor: '#F2F2F7' }
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
        width: (SCREEN_WIDTH - 52) / 2, // 20px padding * 2 + 12px gap
        aspectRatio: 1, // FORCE SQUARE
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: BORDER.hairline, // Apple Standard Border
        borderColor: '#E5E5E5',
        borderRadius: 4, // Sharp/Native look
        padding: 16,
        // @ts-ignore
        cornerCurve: 'continuous',
    },
    tileLabel: {
        marginTop: 12,
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.ink,
    },
    sectionHeader: {
        paddingHorizontal: 20,
        marginBottom: SPACING.s,
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
        borderRadius: 20,
        // @ts-ignore
        cornerCurve: 'continuous',
    },
    emptyState: {
        padding: SPACING.xl,
        alignItems: 'center',
    }
});
