import React, { useState, useCallback } from "react";
import { View, ScrollView, RefreshControl, Image, TouchableOpacity, StyleSheet, Pressable, Dimensions } from "react-native";
import { Typography } from "../../components/design-system/Typography";
import { COLORS, SPACING, Theme, RADIUS } from "../../lib/theme";
import { TEXT } from "../../lib/typography";
import { Gear, Shield, Bell, CaretRight, User as UserIcon, SignOut, Cube, Fingerprint, BookOpen, ClockCounterClockwise } from 'phosphor-react-native';
import { supabase } from "../../lib/supabase";
import SiftFeed from "../../components/SiftFeed";
import ScreenWrapper from "../../components/ScreenWrapper";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../../lib/auth";

const { width } = Dimensions.get('window');

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
                {/* 1. USER HEADER (Dossier Look) */}
                <View style={styles.header}>
                    <Typography variant="label" color={COLORS.stone} style={styles.smallCapsLabel}>PRO MEMBER</Typography>
                    <Typography variant="h1" style={styles.serifTitle}>Rykjun</Typography>

                    <View style={styles.profileMeta}>
                        <Typography variant="body" color={COLORS.stone}>{user?.email || "Guest"}</Typography>
                    </View>
                </View>

                {/* 2. DOSSIER ACTIONS (MASONRY GRID) */}
                <View style={styles.dossierGrid}>
                    <View style={styles.dossierColumn}>
                        <DossierTile icon={UserIcon} title="IDENTITY" />
                        <DossierTile icon={Bell} title="ALERTS" />
                        <DossierTile icon={BookOpen} title="GUIDES" />
                    </View>
                    <View style={styles.dossierColumn}>
                        <DossierTile icon={Shield} title="PRIVACY" />
                        <DossierTile icon={Gear} title="SETTINGS" />
                        <DossierTile icon={ClockCounterClockwise} title="HISTORY" />
                    </View>
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

                <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
                    <SignOut size={18} color={COLORS.terracotta} style={{ marginRight: 8 }} />
                    <Typography variant="bodyMedium" color={COLORS.terracotta}>Sign Out</Typography>
                </TouchableOpacity>

            </ScrollView>
        </ScreenWrapper>
    );
}



const DossierTile = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <Pressable
        style={({ pressed }) => [
            styles.tile,
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
        ]}
    >
        <Icon size={32} color={COLORS.ink} weight="thin" />
        <Typography variant="label" style={styles.tileLabel}>{title}</Typography>
    </Pressable>
);

const styles = StyleSheet.create({
    scrollContent: {
        paddingBottom: 160,
    },
    header: {
        paddingHorizontal: SPACING.l,
        marginTop: SPACING.m,
        marginBottom: 24,
    },
    smallCapsLabel: {
        fontSize: 11,
        letterSpacing: 1.5,
        color: '#999',
        fontFamily: 'Inter_500Medium',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    serifTitle: {
        fontFamily: 'PlayfairDisplay_700Bold',
        fontSize: 32,
        color: '#1A1A1A',
        lineHeight: 40,
    },
    profileMeta: {
        marginTop: SPACING.xs,
    },
    dossierGrid: {
        paddingHorizontal: SPACING.l,
        flexDirection: 'row',
        gap: 12,
        marginBottom: SPACING.xl,
    },
    dossierColumn: {
        flex: 1,
        gap: 12,
    },
    tile: {
        backgroundColor: '#FFFFFF',
        aspectRatio: 1,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.m,
        ...Theme.shadows.soft,
        shadowOpacity: 0.02,
    },
    tileLabel: {
        position: 'absolute',
        bottom: 12,
        fontSize: 9,
        letterSpacing: 1,
        color: COLORS.stone,
    },
    sectionHeader: {
        paddingHorizontal: SPACING.l,
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
        borderRadius: RADIUS.pill,
    },
    emptyState: {
        padding: SPACING.xl,
        alignItems: 'center',
    }
});
