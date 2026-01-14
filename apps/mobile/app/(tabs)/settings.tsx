import React, { useState, useEffect, useCallback } from "react";
import { View, ScrollView, RefreshControl, Dimensions, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Typography } from "../../components/design-system/Typography";
import { Theme } from "../../lib/theme";
import { User, Shield, Moon, CircleHelp } from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import SiftFeed from "../../components/SiftFeed";
import { useFocusEffect } from "expo-router";

const { width } = Dimensions.get('window');
const GAP = 16;
const ITEM_WIDTH = (width - (Theme.spacing.l * 2) - GAP) / 2;

export default function Profile() {
    const [savedPages, setSavedPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchSavedPages = useCallback(async () => {
        try {
            // Fetch Pinned (Saved) pages
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
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.text.primary} />
                }
            >
                <View style={styles.header}>
                    <Typography variant="h1">Profile</Typography>
                </View>

                {/* 2x2 Bento Grid Actions */}
                <View style={styles.grid}>
                    <ActionCard label="Account" icon={<User size={24} color={Theme.colors.text.primary} />} />
                    <ActionCard label="Privacy" icon={<Shield size={24} color={Theme.colors.text.primary} />} />
                    <ActionCard label="Appearance" icon={<Moon size={24} color={Theme.colors.text.primary} />} />
                    <ActionCard label="Help" icon={<CircleHelp size={24} color={Theme.colors.text.primary} />} />
                </View>

                {/* Saved Items Section */}
                <View style={styles.sectionHeader}>
                    <Typography variant="h1" style={styles.sectionTitle}>Saved</Typography>
                    <Typography variant="action" style={{ color: Theme.colors.text.tertiary }}>VIEW ALL</Typography>
                </View>

                <SiftFeed pages={savedPages} loading={loading} />

                {savedPages.length === 0 && !loading && (
                    <View style={styles.emptyState}>
                        <Typography variant="body" style={{ textAlign: 'center' }}>No saved items yet.</Typography>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

function ActionCard({ label, icon }: { label: string, icon: React.ReactNode }) {
    return (
        <Pressable
            style={({ pressed }) => [
                styles.card,
                pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
            ]}
        >
            <View style={styles.iconContainer}>
                {icon}
            </View>
            <Typography variant="h2" style={styles.cardLabel}>{label}</Typography>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.background,
    },
    content: {
        paddingBottom: 140, // Space for floating nav
    },
    header: {
        paddingHorizontal: Theme.spacing.l,
        marginBottom: Theme.spacing.l,
        marginTop: Theme.spacing.m,
    },
    grid: {
        paddingHorizontal: Theme.spacing.l,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: GAP,
        marginBottom: Theme.spacing.xl,
    },
    card: {
        width: ITEM_WIDTH,
        height: ITEM_WIDTH, // Square aspect ratio
        backgroundColor: Theme.colors.surface,
        borderRadius: Theme.borderRadius.card,
        padding: 20,
        justifyContent: 'space-between',
        ...Theme.shadows.card,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
    },
    cardLabel: {
        fontSize: 18,
    },
    iconContainer: {
        alignSelf: 'flex-start',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Theme.spacing.l,
        marginBottom: Theme.spacing.m,
    },
    sectionTitle: {
        fontSize: 24, // Slightly smaller than page title
    },
    emptyState: {
        padding: Theme.spacing.xl,
        opacity: 0.6,
    }
});
