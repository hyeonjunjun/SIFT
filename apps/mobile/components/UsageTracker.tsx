import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Typography } from './design-system/Typography';
import { useSubscription } from '../hooks/useSubscription';
import { COLORS, RADIUS, SPACING, Theme } from '../lib/theme';

export function UsageTracker() {
    const { currentCount, maxSiftsTotal, isUnlimited, loadingCount } = useSubscription();

    if (isUnlimited || loadingCount) return null;

    const progress = Math.min(currentCount / maxSiftsTotal, 1);
    const percentage = Math.round(progress * 100);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Typography variant="label" color={COLORS.stone}>
                    Storage Used
                </Typography>
                <Typography variant="label" color={COLORS.ink}>
                    {currentCount} / {maxSiftsTotal} gems
                </Typography>
            </View>

            <View style={styles.track}>
                <MotiView
                    from={{ width: '0%' }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ type: 'timing', duration: 1000 }}
                    style={[
                        styles.bar,
                        { backgroundColor: progress > 0.9 ? COLORS.danger : COLORS.ink }
                    ]}
                />
            </View>

            {progress > 0.8 && (
                <Typography variant="caption" style={{ color: COLORS.danger, marginTop: 8 }}>
                    {progress >= 1 ? "You've reached your limit. Upgrade for unlimited collection." : "Running low on storage space."}
                </Typography>
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
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
    }
});
