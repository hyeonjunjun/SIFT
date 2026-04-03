import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from './design-system/Skeleton';
import { COLORS, RADIUS, SPACING, Theme } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';
import { Typography } from './design-system/Typography';

const SIFT_STEPS = [
    'Fetching recipe...',
    'Extracting ingredients...',
    'Building your recipe card...',
];

const STEP_INTERVAL = 6000; // 6s per step

export function SiftCardSkeleton() {
    const { colors } = useTheme();
    const [stepIndex, setStepIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setStepIndex(prev => Math.min(prev + 1, SIFT_STEPS.length - 1));
        }, STEP_INTERVAL);
        return () => clearInterval(interval);
    }, []);

    const progress = (stepIndex + 1) / SIFT_STEPS.length;

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    ...Theme.shadows.soft,
                }
            ]}
        >
            {/* Image Placeholder */}
            <View style={[styles.imagePlaceholder, { backgroundColor: colors.subtle }]}>
                <View style={styles.stepContainer}>
                    <Typography variant="caption" style={[styles.stepText, { color: colors.stone }]}>
                        {SIFT_STEPS[stepIndex]}
                    </Typography>
                    <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.accent }]} />
                    </View>
                </View>
            </View>

            <View style={styles.content}>
                <Skeleton height={12} width={80} style={{ marginBottom: 8 }} />
                <Skeleton height={20} width="90%" style={{ marginBottom: 6 }} />
                <Skeleton height={20} width="70%" />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: RADIUS.l,
        overflow: 'hidden',
        borderWidth: 1,
    },
    imagePlaceholder: {
        height: 180,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepContainer: {
        alignItems: 'center',
        gap: SPACING.s,
        paddingHorizontal: SPACING.l,
        width: '100%',
    },
    stepText: {
        fontFamily: 'Satoshi-Medium',
        fontSize: 13,
        letterSpacing: 0.3,
    },
    progressTrack: {
        width: '60%',
        height: 3,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
    content: {
        padding: SPACING.m,
        paddingTop: SPACING.m - 4,
    },
});
