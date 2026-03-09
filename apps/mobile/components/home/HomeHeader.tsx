import React from 'react';
import { View, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Typography } from '../design-system/Typography';
import { COLORS, SPACING, RADIUS } from '../../lib/theme';
import { API_URL } from '../../lib/config';
import Constants from 'expo-constants';

interface HomeHeaderProps {
    user: any;
    tier: string;
    pagesCount: number;
}

export function HomeHeader({ user, tier, pagesCount }: HomeHeaderProps) {
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
                <View style={styles.bentoHeader}>
                    <TouchableOpacity
                        activeOpacity={1}
                        onLongPress={showDiagnostics}
                        style={styles.greetingWrapper}
                    >
                        <Typography variant="body" style={styles.greetingText}>
                            {getGreeting()}
                        </Typography>
                        <Typography variant="h2" style={styles.userName}>
                            {user?.email?.split('@')[0] || "friend"}
                        </Typography>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingTop: SPACING.m,
    },
    bentoContainer: {
        paddingHorizontal: SPACING.m,
        marginBottom: SPACING.m,
    },
    bentoHeader: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.l,
        padding: SPACING.l,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 2,
    },
    greetingWrapper: {
        gap: SPACING.xs,
    },
    greetingText: {
        color: COLORS.textSecondary,
        textTransform: 'lowercase',
        opacity: 0.8,
    },
    userName: {
        color: COLORS.text,
        fontSize: 32,
        lineHeight: 38,
    }
});
