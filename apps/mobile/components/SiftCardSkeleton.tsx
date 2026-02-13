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
        </View>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        width: '100%',
        aspectRatio: 1, // Match SiftFeed Card
        borderRadius: RADIUS.l,
        overflow: 'hidden',
    },
    imageWrapper: {
        width: '100%',
        height: '100%',
    },
});
