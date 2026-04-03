import React from 'react';
import { View, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Typography } from '../design-system/Typography';
import { SPACING } from '../../lib/theme';
import { useTheme } from '../../context/ThemeContext';
import { API_URL } from '../../lib/config';
import { Bell } from 'phosphor-react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';

interface HomeHeaderProps {
    user: any;
    tier: string;
    pagesCount: number;
    profile?: { display_name?: string; [key: string]: any };
    unreadCount?: number;
}

export function HomeHeader({ user, tier, pagesCount, profile, unreadCount = 0 }: HomeHeaderProps) {
    const { colors } = useTheme();
    const router = useRouter();

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
            <TouchableOpacity
                activeOpacity={1}
                onLongPress={showDiagnostics}
                style={styles.greetingSection}
            >
                <Typography variant="body" color="stone" style={styles.greetingText}>
                    {getGreeting()}
                </Typography>
                <Typography variant="h2" style={styles.userName}>
                    {profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || "friend"}
                </Typography>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => router.push('/notifications')}
                style={styles.bellButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Bell size={24} color={colors.ink} weight={unreadCount > 0 ? 'fill' : 'regular'} />
                {unreadCount > 0 && (
                    <View style={[styles.badge, { backgroundColor: '#EF4444' }]}>
                        {unreadCount <= 9 && (
                            <Typography variant="caption" style={styles.badgeText}>
                                {unreadCount}
                            </Typography>
                        )}
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.s,
    },
    greetingSection: {
        flex: 1,
        gap: SPACING.xs,
    },
    greetingText: {
        textTransform: 'lowercase',
    },
    userName: {
        fontSize: 28,
        lineHeight: 32,
    },
    bellButton: {
        padding: 8,
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 4,
        right: 4,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 3,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontFamily: 'Satoshi-Bold',
        lineHeight: 12,
    },
});
