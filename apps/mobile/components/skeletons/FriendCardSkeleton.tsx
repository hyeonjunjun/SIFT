import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '../design-system/Skeleton';
import { RADIUS, SPACING } from '../../lib/theme';
import { useTheme } from '../../context/ThemeContext';

export function FriendCardSkeleton() {
    const { colors } = useTheme();

    return (
        <View style={[styles.container, { borderBottomColor: colors.separator }]}>
            {/* Avatar Placeholder */}
            <Skeleton height={48} width={48} borderRadius={24} />

            <View style={styles.textContainer}>
                {/* Display Name */}
                <Skeleton height={20} width={140} style={{ marginBottom: 6 }} />
                {/* Username */}
                <Skeleton height={14} width={90} />
            </View>

            {/* Action / Chevron Placeholder */}
            <Skeleton height={16} width={16} borderRadius={8} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    textContainer: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'center',
    },
});
