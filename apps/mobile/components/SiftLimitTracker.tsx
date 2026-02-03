import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Typography } from './design-system/Typography';
import { COLORS, SPACING, RADIUS, Theme } from '../lib/theme';
import { useSubscription } from '../hooks/useSubscription';
import { Books } from 'phosphor-react-native';

export const SiftLimitTracker = () => {
    const { currentCount, maxSiftsTotal, isUnlimited, loadingCount } = useSubscription();

    if (isUnlimited || loadingCount) return null;

    const progress = Math.min(1, currentCount / maxSiftsTotal);

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Books size={18} color={COLORS.ink} weight="regular" />
                </View>
                <View style={styles.textContainer}>
                    <Typography variant="label" color={COLORS.ink}>
                        Usage: {currentCount} / {maxSiftsTotal} sifts
                    </Typography>
                </View>
            </View>
            <View style={styles.progressBar}>
                <View
                    style={[
                        styles.progressFill,
                        { width: `${progress * 100}%`, backgroundColor: progress > 0.9 ? COLORS.danger : COLORS.ink }
                    ]}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: COLORS.paper,
        borderRadius: RADIUS.m,
        marginBottom: SPACING.m,
        ...Theme.shadows.soft,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.separator,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: COLORS.subtle,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
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
});
