import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { ShimmerSkeleton } from './ShimmerSkeleton';
import { RADIUS, COLORS, SPACING } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';

export function SiftDetailSkeleton() {
    const { colors, isDark } = useTheme();
    const shimmerColor = colors.subtle;

    return (
        <View style={styles.container}>
            {/* Nav Bar Skeleton */}
            <View style={styles.navBar}>
                <ShimmerSkeleton width={30} height={30} borderRadius={RADIUS.pill} backgroundColor={shimmerColor} />
                <View style={{ flex: 1, marginHorizontal: SPACING.m }}>
                    <ShimmerSkeleton width={80} height={10} borderRadius={RADIUS.s} backgroundColor={shimmerColor} style={{ marginBottom: SPACING.xs }} />
                    <ShimmerSkeleton width="100%" height={24} borderRadius={RADIUS.s} backgroundColor={shimmerColor} />
                </View>
                <ShimmerSkeleton width={30} height={30} borderRadius={RADIUS.pill} backgroundColor={shimmerColor} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Image Skeleton */}
                <View style={[styles.imageWrapper, { borderColor: isDark ? colors.separator : colors.separator }]}>
                    <ShimmerSkeleton width="100%" height={240} borderRadius={RADIUS.l} backgroundColor={colors.stone} style={{ opacity: 0.1 }} />
                </View>

                {/* Header Card Skeleton */}
                <View style={[styles.card, { backgroundColor: colors.paper, borderColor: colors.separator }]}>
                    <ShimmerSkeleton width={120} height={12} borderRadius={RADIUS.s} backgroundColor={shimmerColor} style={{ marginBottom: SPACING.m }} />
                    <ShimmerSkeleton width="90%" height={32} borderRadius={RADIUS.s} backgroundColor={shimmerColor} style={{ marginBottom: SPACING.s }} />
                    <ShimmerSkeleton width="50%" height={16} borderRadius={RADIUS.s} backgroundColor={shimmerColor} />
                </View>

                {/* Action Cards Skeleton */}
                <View style={{ flexDirection: 'row', gap: SPACING.m }}>
                    <View style={[styles.card, styles.actionCard, { backgroundColor: colors.paper, borderColor: colors.separator }]}>
                        <ShimmerSkeleton width={24} height={24} borderRadius={RADIUS.pill} backgroundColor={shimmerColor} style={{ marginBottom: SPACING.m - 4 }} />
                        <ShimmerSkeleton width={60} height={12} borderRadius={RADIUS.s} backgroundColor={shimmerColor} />
                    </View>
                    <View style={[styles.card, styles.actionCard, { backgroundColor: colors.paper, borderColor: colors.separator }]}>
                        <ShimmerSkeleton width={24} height={24} borderRadius={RADIUS.pill} backgroundColor={shimmerColor} style={{ marginBottom: SPACING.m - 4 }} />
                        <ShimmerSkeleton width={60} height={12} borderRadius={RADIUS.s} backgroundColor={shimmerColor} />
                    </View>
                </View>

                {/* Content Skeleton */}
                <View style={[styles.card, { minHeight: 300, backgroundColor: colors.paper, borderColor: colors.separator }]}>
                    <ShimmerSkeleton width="100%" height={20} borderRadius={RADIUS.s} backgroundColor={shimmerColor} style={{ marginBottom: SPACING.m - 4 }} />
                    <ShimmerSkeleton width="95%" height={20} borderRadius={RADIUS.s} backgroundColor={shimmerColor} style={{ marginBottom: SPACING.m - 4 }} />
                    <ShimmerSkeleton width="90%" height={20} borderRadius={RADIUS.s} backgroundColor={shimmerColor} style={{ marginBottom: SPACING.l }} />

                    <ShimmerSkeleton width="80%" height={20} borderRadius={RADIUS.s} backgroundColor={shimmerColor} style={{ marginBottom: SPACING.m - 4 }} />
                    <ShimmerSkeleton width="85%" height={20} borderRadius={RADIUS.s} backgroundColor={shimmerColor} style={{ marginBottom: SPACING.m - 4 }} />
                    <ShimmerSkeleton width="40%" height={20} borderRadius={RADIUS.s} backgroundColor={shimmerColor} />
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    navBar: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.l,
        paddingTop: 60,
        paddingBottom: SPACING.m - 4,
        alignItems: 'center',
    },
    scrollContent: {
        paddingHorizontal: SPACING.l,
        paddingBottom: 140,
        gap: SPACING.m,
    },
    card: {
        borderRadius: RADIUS.s,
        padding: SPACING.l,
        borderWidth: StyleSheet.hairlineWidth,
        flex: 1,
    },
    imageWrapper: {
        borderRadius: RADIUS.l,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
    },
    actionCard: {
        alignItems: 'center',
        justifyContent: 'center',
    }
});
