import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from './design-system/Skeleton';
import { COLORS, RADIUS, Theme } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';

export function SiftCardSkeleton() {
    const { colors } = useTheme();

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
            <Skeleton height={180} width="100%" borderRadius={0} />

            <View style={styles.content}>
                {/* Domain Label */}
                <Skeleton height={12} width={80} style={{ marginBottom: 8 }} />

                {/* Title (2 lines) */}
                <Skeleton height={20} width="90%" style={{ marginBottom: 6 }} />
                <Skeleton height={20} width="70%" style={{ marginBottom: 12 }} />

                {/* Summary (2 lines) */}
                <Skeleton height={16} width="100%" style={{ marginBottom: 6 }} />
                <Skeleton height={16} width="85%" />
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
    content: {
        padding: 16,
        paddingTop: 12,
    },
});
