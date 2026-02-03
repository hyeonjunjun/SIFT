import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Typography } from './design-system/Typography';
import { useSubscription } from '../hooks/useSubscription';
import { COLORS, RADIUS, SPACING } from '../lib/theme';

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
                        { backgroundColor: progress > 0.9 ? COLORS.danger : COLORS.ink }
                    ]}
                />
            </View>

            {progress > 0.8 && (
                <Typography variant="caption" style={{ color: COLORS.danger, marginTop: 8 }}>
                    {progress >= 1 ? "You've reached your limit. Upgrade for unlimited sifting." : "Running low on sifts."}
                </Typography>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        marginVertical: SPACING.m,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 8,
    },
    track: {
        height: 8,
        backgroundColor: COLORS.subtle,
        borderRadius: RADIUS.pill,
        overflow: 'hidden',
    },
    bar: {
        height: '100%',
        borderRadius: RADIUS.pill,
    }
});
