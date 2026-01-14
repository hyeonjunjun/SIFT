import React, { useState, useCallback } from "react";
import { View, ScrollView, RefreshControl, Image, TouchableOpacity, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Typography } from "../../components/design-system/Typography";
import { Theme } from "../../lib/theme";
import { Gear, Shield, Bell, CaretRight, User as UserIcon } from 'phosphor-react-native';
import { supabase } from "../../lib/supabase";
import SiftFeed from "../../components/SiftFeed";
import { useFocusEffect } from "expo-router";

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

            if (error) {
                console.error('Error fetching saved pages:', error);
            } else if (data) {
                setSavedPages(data as any);
            }
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
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.text.primary} />
                }
            >
                {/* 1. USER HEADER */}
                <View style={styles.header}>
                    <Image
                        source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400' }}
                        style={styles.avatar}
                    />
                    <Typography variant="h1" style={styles.name}>Ryan Jun</Typography>
                    <Typography variant="body" style={styles.handle}>@ryanjun • Pro Member</Typography>

                    <View style={styles.statsRow}>
                        <Stat label="Sifts" value="1,240" />
                        <Stat label="Lists" value="12" />
                        <Stat label="Following" value="84" />
                    </View>
                </View>

                {/* 2. BENTO ACTIONS */}
                <Typography variant="caption" style={styles.sectionTitle}>Account</Typography>
                <View style={styles.bentoGrid}>
                    {/* Big Settings Tile */}
                    <BentoTile icon={UserIcon} title="Personal Info" subtitle="Edit details" wide />

                    {/* Smaller Tiles */}
                    <View style={styles.row}>
                        <BentoTile icon={Bell} title="Notifications" />
                        <BentoTile icon={Shield} title="Privacy" />
                    </View>

                    {/* Long Tile */}
                    <BentoTile icon={Gear} title="App Settings" subtitle="Preferences & Display" wide />
                </View>

                {/* 3. SAVED ITEMS (RE-INTEGRATED) */}
                <View style={[styles.sectionHeader, { marginTop: 40 }]}>
                    <Typography variant="h1" style={styles.sectionTitleLarge}>Saved</Typography>
                    <TouchableOpacity>
                        <Typography variant="action" style={{ color: Theme.colors.text.tertiary }}>VIEW ALL</Typography>
                    </TouchableOpacity>
                </View>

                <SiftFeed pages={savedPages} loading={loading} />

                {savedPages.length === 0 && !loading && (
                    <View style={styles.emptyState}>
                        <Typography variant="body" style={{ textAlign: 'center', opacity: 0.5 }}>No saved items yet.</Typography>
                    </View>
                )}

                <TouchableOpacity style={styles.logoutButton}>
                    <Typography variant="action" style={styles.logoutText}>Log Out</Typography>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

// Sub-components
const Stat = ({ label, value }: { label: string, value: string }) => (
    <View style={styles.statItem}>
        <Typography variant="h3" style={styles.statValue}>{value}</Typography>
        <Typography variant="caption" style={styles.statLabel}>{label}</Typography>
    </View>
);

const BentoTile = ({ icon: Icon, title, subtitle, wide }: { icon: any, title: string, subtitle?: string, wide?: boolean }) => (
    <Pressable
        style={({ pressed }) => [
            styles.tile,
            wide ? styles.tileWide : styles.tileHalf,
            pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
        ]}
    >
        <View style={styles.tileHeader}>
            <View style={styles.iconBox}>
                <Icon size={20} color={Theme.colors.text.primary} weight="duotone" />
            </View>
            {wide && <CaretRight size={16} color={Theme.colors.text.tertiary} />}
        </View>
        <View>
            <Typography variant="h3" style={styles.tileTitle}>{title}</Typography>
            {subtitle && <Typography variant="caption" style={styles.tileSubtitle}>{subtitle}</Typography>}
        </View>
    </Pressable>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.background,
    },
    scrollContent: {
        paddingBottom: 140, // Space for nav bar
    },
    header: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 15,
        borderWidth: 3,
        borderColor: '#FFF',
    },
    name: {
        fontSize: 24,
        color: Theme.colors.text.primary,
    },
    handle: {
        fontSize: 14,
        color: Theme.colors.text.tertiary,
        marginTop: 4,
    },
    statsRow: {
        flexDirection: 'row',
        marginTop: 20,
        gap: 30,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        color: Theme.colors.text.primary,
    },
    statLabel: {
        fontSize: 12,
        color: Theme.colors.text.tertiary,
        marginTop: 2,
    },

    sectionTitle: {
        marginLeft: 20,
        marginBottom: 10,
        fontWeight: '700',
        letterSpacing: 1,
        color: Theme.colors.text.tertiary,
        textTransform: 'uppercase',
    },
    sectionTitleLarge: {
        fontSize: 24,
    },
    bentoGrid: {
        paddingHorizontal: 20,
        gap: 12,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    tile: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 16,
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: Theme.colors.border,
        ...Theme.shadows.card,
    },
    tileWide: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
    },
    tileHalf: {
        flex: 1,
        height: 140,
        flexDirection: 'column',
    },
    tileHeader: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tileTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Theme.colors.text.primary,
    },
    tileSubtitle: {
        fontSize: 13,
        color: Theme.colors.text.tertiary,
        marginTop: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Theme.spacing.l,
        marginBottom: Theme.spacing.m,
    },
    logoutButton: {
        marginTop: 40,
        alignSelf: 'center',
    },
    logoutText: {
        color: Theme.colors.danger,
        fontSize: 14,
        fontWeight: '600',
    },
    emptyState: {
        padding: Theme.spacing.xl,
    }
});
