import React from 'react';
import { View, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Typography } from '../design-system/Typography';
import { COLORS, SPACING, RADIUS, Theme } from '../../lib/theme';
import { useTheme } from '../../context/ThemeContext';
import { API_URL } from '../../lib/config';
import Constants from 'expo-constants';

interface HomeHeaderProps {
    user: any;
    tier: string;
    pagesCount: number;
    profile?: { display_name?: string; [key: string]: any };
}

export function HomeHeader({ user, tier, pagesCount, profile }: HomeHeaderProps) {
    const { colors } = useTheme();
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "good morning";
        if (hour < 18) return "good afternoon";
        return "good evening";
    };

    const showDiagnostics = () => {
        const buildNum = Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '102';
        Alert.alert(
            "SIFT Diagnostics",
            `API: ${API_URL}\nUser: ${user?.id}\nTier: ${tier}\nEnv: ${__DEV__ ? 'Dev' : 'Prod'}\nBuild: ${buildNum}\nSifts: ${pagesCount}`,
            [
                { text: "OK" },
                {
                    text: "Test Connection",
                    onPress: async () => {
                        try {
                            const res = await fetch(`${API_URL}/api/archive?user_id=${user?.id}`);
                            if (res.ok) {
                                Alert.alert("Success", "API is reachable!");
                            } else {
                                const txt = await res.text();
                                Alert.alert("Failed", `Status: ${res.status}\nBody: ${txt.substring(0, 100)}`);
                            }
                        } catch (e: any) {
                            Alert.alert("Error", e.message);
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.bentoContainer}>
                <View style={[styles.bentoHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <TouchableOpacity
                        activeOpacity={1}
                        onLongPress={showDiagnostics}
                        style={styles.greetingWrapper}
                    >
                        <Typography variant="body" color="stone" style={styles.greetingText}>
                            {getGreeting()}
                        </Typography>
                        <Typography variant="h2" style={styles.userName}>
                            {profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || "friend"}
                        </Typography>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        // Removed paddingTop to let parent control vertical rhythm
    },
    bentoContainer: {
        // Removed paddingHorizontal to prevent double-padding when placed in index.tsx
        marginBottom: SPACING.m,
    },
    bentoHeader: {
        borderRadius: RADIUS.l,
        padding: SPACING.l,
        borderWidth: 1,
        ...Theme.shadows.soft,
    },
    greetingWrapper: {
        gap: SPACING.xs,
    },
    greetingText: {
        textTransform: 'lowercase',
    },
    userName: {
        fontSize: 32,
        lineHeight: 34,
    }
});
