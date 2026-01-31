import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { ShimmerSkeleton } from './ShimmerSkeleton';
import { RADIUS, COLORS, SPACING } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';

export function SiftDetailSkeleton() {
    const { colors } = useTheme();
    const shimmerColor = colors.subtle;

    return (
        <View style={styles.container}>
            {/* Nav Bar Skeleton */}
            <View style={styles.navBar}>
                <ShimmerSkeleton width={30} height={30} borderRadius={15} backgroundColor={shimmerColor} />
                <View style={{ flex: 1, marginHorizontal: 16 }}>
                    <ShimmerSkeleton width={80} height={10} borderRadius={RADIUS.s} backgroundColor={shimmerColor} style={{ marginBottom: 4 }} />
                    <ShimmerSkeleton width="100%" height={24} borderRadius={RADIUS.s} backgroundColor={shimmerColor} />
                </View>
                <ShimmerSkeleton width={30} height={30} borderRadius={15} backgroundColor={shimmerColor} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Image Skeleton */}
                <View style={styles.imageWrapper}>
                    <ShimmerSkeleton width="100%" height={240} borderRadius={RADIUS.l} backgroundColor={colors.stone} style={{ opacity: 0.1 }} />
                </View>

                {/* Header Card Skeleton */}
                <View style={[styles.card, { backgroundColor: colors.paper }]}>
                    <ShimmerSkeleton width={120} height={12} borderRadius={RADIUS.s} backgroundColor={shimmerColor} style={{ marginBottom: 16 }} />
                    <ShimmerSkeleton width="90%" height={32} borderRadius={RADIUS.s} backgroundColor={shimmerColor} style={{ marginBottom: 8 }} />
                    <ShimmerSkeleton width="50%" height={16} borderRadius={RADIUS.s} backgroundColor={shimmerColor} />
                </View>

                {/* Action Cards Skeleton */}
                <View style={{ flexDirection: 'row', gap: 16 }}>
                    <View style={[styles.card, styles.actionCard, { backgroundColor: colors.paper }]}>
                        <ShimmerSkeleton width={24} height={24} borderRadius={12} backgroundColor={shimmerColor} style={{ marginBottom: 12 }} />
                        <ShimmerSkeleton width={60} height={12} borderRadius={RADIUS.s} backgroundColor={shimmerColor} />
                    </View>
                    <View style={[styles.card, styles.actionCard, { backgroundColor: colors.paper }]}>
                        <ShimmerSkeleton width={24} height={24} borderRadius={12} backgroundColor={shimmerColor} style={{ marginBottom: 12 }} />
                        <ShimmerSkeleton width={60} height={12} borderRadius={RADIUS.s} backgroundColor={shimmerColor} />
                    </View>
                </View>

                {/* Content Skeleton */}
                <View style={[styles.card, { minHeight: 300, backgroundColor: colors.paper }]}>
                    <ShimmerSkeleton width="100%" height={20} borderRadius={RADIUS.s} backgroundColor={shimmerColor} style={{ marginBottom: 12 }} />
                    <ShimmerSkeleton width="95%" height={20} borderRadius={RADIUS.s} backgroundColor={shimmerColor} style={{ marginBottom: 12 }} />
                    <ShimmerSkeleton width="90%" height={20} borderRadius={RADIUS.s} backgroundColor={shimmerColor} style={{ marginBottom: 24 }} />

                    <ShimmerSkeleton width="80%" height={20} borderRadius={RADIUS.s} backgroundColor={shimmerColor} style={{ marginBottom: 12 }} />
                    <ShimmerSkeleton width="85%" height={20} borderRadius={RADIUS.s} backgroundColor={shimmerColor} style={{ marginBottom: 12 }} />
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
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 12,
        alignItems: 'center',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 140,
        gap: 16,
    },
    card: {
        borderRadius: 8,
        padding: 20,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(0,0,0,0.05)',
        flex: 1,
    },
    imageWrapper: {
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    actionCard: {
        alignItems: 'center',
        justifyContent: 'center',
    }
});
