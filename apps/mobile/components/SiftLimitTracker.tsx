import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Typography } from './design-system/Typography';
import { COLORS, SPACING, RADIUS, Theme } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Books } from 'phosphor-react-native';

export const SiftLimitTracker = () => {
    const { user, tier } = useAuth();

    const { data: count = 0 } = useQuery({
        queryKey: ['sift-count', user?.id],
        queryFn: async () => {
            if (!user) return 0;
            const { count, error } = await supabase
                .from('pages')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id);
            if (error) throw error;
            return count || 0;
        },
        enabled: !!user,
    });

    if (!user || tier === 'admin' || tier === 'unlimited') return null;

    const limit = 10;
    const remaining = Math.max(0, limit - count);
    const progress = Math.min(1, count / limit);

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Books size={16} color={COLORS.stone} weight="duotone" />
                </View>
                <View style={styles.textContainer}>
                    <Typography variant="caption" color="secondary">
                        {count} / {limit} sifts used
                    </Typography>
                    <Typography variant="label" color="tertiary">
                        {remaining} remaining this month
                    </Typography>
                </View>
            </View>
            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: SPACING.m,
        backgroundColor: COLORS.paper,
        borderRadius: RADIUS.m,
        marginBottom: SPACING.m,
        ...Theme.shadows.sharp,
        borderWidth: 1,
        borderColor: COLORS.separator,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.s,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: RADIUS.s,
        backgroundColor: COLORS.subtle,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.s,
    },
    textContainer: {
        flex: 1,
    },
    progressBar: {
        height: 4,
        backgroundColor: COLORS.subtle,
        borderRadius: RADIUS.pill,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: COLORS.stone,
        borderRadius: RADIUS.pill,
    },
});
