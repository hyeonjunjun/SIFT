import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { MotiView } from 'moti';
import { Typography } from './design-system/Typography';
import { useSubscription } from '../hooks/useSubscription';
import { COLORS, RADIUS, SPACING, Theme } from '../lib/theme';
import { Books, Warning, ArrowUp } from 'phosphor-react-native';
import { useRouter } from 'expo-router';

interface UsageTrackerProps {
    variant?: 'compact' | 'detailed';
    showUpgradeButton?: boolean;
}

export function UsageTracker({ variant = 'detailed', showUpgradeButton = true }: UsageTrackerProps) {
    const { currentCount, maxSiftsTotal, isUnlimited, loadingCount } = useSubscription();
    const router = useRouter();

    if (isUnlimited || loadingCount) return null;

    const progress = Math.min(currentCount / maxSiftsTotal, 1);
    const percentage = Math.round(progress * 100);

    // Enhanced color logic with warning at 80%
    const getBarColor = () => {
        if (progress >= 1) return COLORS.danger;
        if (progress >= 0.9) return COLORS.danger;
        if (progress >= 0.8) return '#F59E0B'; // Warning yellow
        return COLORS.ink;
    };

    const getWarningMessage = () => {
        if (progress >= 1) return "You've reached your limit. Upgrade to continue sifting.";
        if (progress >= 0.9) return `Only ${maxSiftsTotal - currentCount} sifts remaining. Consider upgrading.`;
        if (progress >= 0.8) return "Running low on storage space.";
        return null;
    };

    const warningMessage = getWarningMessage();

    if (variant === 'compact') {
        return (
            <View style={styles.compactContainer}>
                <View style={styles.compactContent}>
                    <View style={styles.iconContainer}>
                        {progress >= 0.9 ? (
                            <Warning size={18} color={COLORS.danger} weight="fill" />
                        ) : (
                            <Books size={18} color={COLORS.ink} weight="regular" />
                        )}
                    </View>
                    <View style={styles.textContainer}>
                        <Typography variant="label" color={COLORS.ink} style={{ fontSize: 11 }}>
                            {currentCount} / {maxSiftsTotal} sifts
                        </Typography>
                    </View>
                </View>
                <View style={styles.progressBar}>
                    <MotiView
                        from={{ width: '0%' }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ type: 'timing', duration: 800 }}
                        style={[
                            styles.progressFill,
                            { backgroundColor: getBarColor() }
                        ]}
                    />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Typography variant="label" color={COLORS.stone}>
                        Storage Used
                    </Typography>
                    {progress >= 0.9 && (
                        <MotiView
                            from={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', delay: 300 }}
                            style={{ marginLeft: 8 }}
                        >
                            <Warning size={16} color={COLORS.danger} weight="fill" />
                        </MotiView>
                    )}
                </View>
                <Typography variant="label" color={COLORS.ink}>
                    {currentCount} / {maxSiftsTotal} sifts
                </Typography>
            </View>

            <View style={styles.track}>
                <MotiView
                    from={{ width: '0%' }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ type: 'timing', duration: 1000 }}
                    style={[
                        styles.bar,
                        { backgroundColor: getBarColor() }
                    ]}
                />
            </View>

            {warningMessage && (
                <MotiView
                    from={{ opacity: 0, translateY: -10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 300 }}
                    style={{ marginTop: 12 }}
                >
                    <Typography variant="caption" style={{ color: progress >= 0.9 ? COLORS.danger : '#F59E0B' }}>
                        {warningMessage}
                    </Typography>
                </MotiView>
            )}

            {showUpgradeButton && progress >= 0.8 && (
                <MotiView
                    from={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', delay: 200 }}
                >
                    <TouchableOpacity
                        style={styles.upgradeButton}
                        onPress={() => router.push('/settings/subscription')}
                        activeOpacity={0.7}
                    >
                        <ArrowUp size={16} color={COLORS.paper} weight="bold" />
                        <Typography variant="label" style={{ color: COLORS.paper, fontSize: 12, marginLeft: 6 }}>
                            UPGRADE NOW
                        </Typography>
                    </TouchableOpacity>
                </MotiView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        marginHorizontal: 20,
        marginVertical: SPACING.m,
        backgroundColor: COLORS.paper,
        borderRadius: RADIUS.m,
        ...Theme.shadows.soft,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.separator,
    },
    compactContainer: {
        padding: 16,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.m,
        marginBottom: SPACING.m,
        ...Theme.shadows.soft,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.border,
    },
    compactContent: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: COLORS.surfaceSecondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    track: {
        height: 6,
        backgroundColor: COLORS.subtle,
        borderRadius: RADIUS.pill,
        overflow: 'hidden',
    },
    bar: {
        height: '100%',
        borderRadius: RADIUS.pill,
    },
    progressBar: {
        height: 6,
        backgroundColor: COLORS.subtle,
        borderRadius: RADIUS.pill,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: RADIUS.pill,
    },
    upgradeButton: {
        marginTop: 16,
        backgroundColor: COLORS.ink,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: RADIUS.m,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        ...Theme.shadows.soft,
    },
});
