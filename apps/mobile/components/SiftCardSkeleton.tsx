import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ShimmerSkeleton } from './ShimmerSkeleton';
import { RADIUS, COLORS, SPACING } from '../lib/theme';

export function SiftCardSkeleton() {
    return (
        <View style={styles.cardContainer}>
            <View style={styles.imageWrapper}>
                <ShimmerSkeleton width="100%" height="100%" borderRadius={RADIUS.l} />
            </View>
            <View style={styles.meta}>
                <ShimmerSkeleton width={80} height={12} borderRadius={RADIUS.s} style={{ marginBottom: 8 }} />
                <ShimmerSkeleton width="90%" height={20} borderRadius={RADIUS.s} style={{ marginBottom: 6 }} />
                <ShimmerSkeleton width="60%" height={16} borderRadius={RADIUS.s} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        marginBottom: 24,
    },
    imageWrapper: {
        aspectRatio: 16 / 9,
        borderRadius: RADIUS.l,
        overflow: 'hidden',
        backgroundColor: COLORS.subtle,
    },
    meta: {
        marginTop: 10,
        gap: 2,
    },
});
