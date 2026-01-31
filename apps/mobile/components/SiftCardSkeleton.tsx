import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ShimmerSkeleton } from './ShimmerSkeleton';
import { RADIUS, COLORS } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';

export function SiftCardSkeleton() {
    const { colors } = useTheme();
    const shimmerColor = colors.subtle;

    return (
        <View style={styles.cardContainer}>
            <View style={[styles.imageWrapper, { backgroundColor: colors.subtle }]}>
                <ShimmerSkeleton width="100%" height="100%" borderRadius={RADIUS.l} backgroundColor={colors.stone} style={{ opacity: 0.1 }} />
            </View>
            <View style={styles.meta}>
                {/* Title Skeletons */}
                <ShimmerSkeleton width="100%" height={18} borderRadius={RADIUS.s} backgroundColor={shimmerColor} style={{ marginBottom: 6 }} />
                <ShimmerSkeleton width="70%" height={18} borderRadius={RADIUS.s} backgroundColor={shimmerColor} style={{ marginBottom: 10 }} />

                {/* Meta details row (Category • Source) */}
                <View style={{ flexDirection: 'row', alignItems: 'center', opacity: 0.6 }}>
                    <ShimmerSkeleton width={60} height={10} borderRadius={RADIUS.s} backgroundColor={shimmerColor} />
                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.stone, marginHorizontal: 8, opacity: 0.3 }} />
                    <ShimmerSkeleton width={40} height={10} borderRadius={RADIUS.s} backgroundColor={shimmerColor} />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        marginBottom: 24,
        paddingHorizontal: 8,
    },
    imageWrapper: {
        aspectRatio: 16 / 9,
        borderRadius: RADIUS.l,
        overflow: 'hidden',
    },
    meta: {
        marginTop: 10,
        gap: 2,
    },
});
