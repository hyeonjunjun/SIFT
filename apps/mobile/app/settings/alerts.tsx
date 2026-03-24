
import * as React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { CaretLeft, BellSimple, PaperPlaneTilt, UserPlus, FolderPlus, Sparkle, ShieldCheck, CheckCircle } from 'phosphor-react-native';
import { Typography } from '../../components/design-system/Typography';
import { COLORS, SPACING, RADIUS } from '../../lib/theme';
import { useTheme } from '../../context/ThemeContext';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useNotificationPreferences, NotificationPreferences } from '../../hooks/useNotificationPreferences';

interface AlertRowProps {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    value: boolean;
    onValueChange: (val: boolean) => void;
    disabled?: boolean;
}

const AlertRow = ({ icon, title, subtitle, value, onValueChange, disabled }: AlertRowProps) => {
    const { colors } = useTheme();
    return (
        <View style={[styles.row, { backgroundColor: colors.paper, borderColor: colors.border, opacity: disabled ? 0.6 : 1 }]}>
            <View style={[styles.iconBox, { backgroundColor: colors.subtle }]}>
                {icon}
            </View>
            <View style={styles.rowContent}>
                <Typography variant="body" weight="medium">{title}</Typography>
                <Typography variant="caption" color="stone">{subtitle}</Typography>
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                disabled={disabled}
                trackColor={{ false: '#767577', true: COLORS.ink }}
                accessibilityLabel={`${title} notifications`}
                accessibilityRole="switch"
            />
        </View>
    );
};

export default function AlertsScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const { preferences, updatePreference, loading } = useNotificationPreferences();

    const toggle = (key: keyof NotificationPreferences) => (val: boolean) => updatePreference(key, val);

    if (loading) {
        return (
            <ScreenWrapper edges={['top']}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <CaretLeft size={28} color={colors.ink} />
                    </TouchableOpacity>
                    <Typography variant="h3">Alerts</Typography>
                    <View style={{ width: 28 }} />
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator color={colors.stone} />
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <CaretLeft size={28} color={colors.ink} />
                </TouchableOpacity>
                <Typography variant="h3">Alerts</Typography>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Typography variant="label" style={[styles.sectionTitle, { color: colors.stone }]}>ACTIVITY</Typography>

                    <AlertRow
                        icon={<CheckCircle size={24} color={colors.stone} />}
                        title="Sift Complete"
                        subtitle="When your sift finishes processing"
                        value={preferences.sift_complete}
                        onValueChange={toggle('sift_complete')}
                    />

                    <AlertRow
                        icon={<PaperPlaneTilt size={24} color={colors.stone} />}
                        title="Shared Sifts"
                        subtitle="Someone shares a sift with you"
                        value={preferences.sift_shared}
                        onValueChange={toggle('sift_shared')}
                    />

                    <AlertRow
                        icon={<UserPlus size={24} color={colors.stone} />}
                        title="Friend Requests"
                        subtitle="New requests and acceptances"
                        value={preferences.friend_requests}
                        onValueChange={toggle('friend_requests')}
                    />

                    <AlertRow
                        icon={<FolderPlus size={24} color={colors.stone} />}
                        title="Collection Activity"
                        subtitle="Invites and new sifts in your collections"
                        value={preferences.collection_activity}
                        onValueChange={toggle('collection_activity')}
                    />
                </View>

                <View style={styles.section}>
                    <Typography variant="label" style={[styles.sectionTitle, { color: colors.stone }]}>GENERAL</Typography>

                    <AlertRow
                        icon={<BellSimple size={24} color={colors.stone} />}
                        title="Weekly Digest"
                        subtitle="Summary of your sifts"
                        value={preferences.weekly_digest}
                        onValueChange={toggle('weekly_digest')}
                    />

                    <AlertRow
                        icon={<Sparkle size={24} color={colors.stone} />}
                        title="Product Updates"
                        subtitle="New features and news"
                        value={preferences.product_updates}
                        onValueChange={toggle('product_updates')}
                    />

                    <AlertRow
                        icon={<ShieldCheck size={24} color={colors.stone} />}
                        title="Security Alerts"
                        subtitle="Always enabled for your safety"
                        value={true}
                        onValueChange={() => {}}
                        disabled
                    />
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    backButton: {
        padding: 4,
    },
    content: {
        padding: 20,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: RADIUS.m,
        marginBottom: 12,
        borderWidth: StyleSheet.hairlineWidth,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    rowContent: {
        flex: 1,
    },
});
