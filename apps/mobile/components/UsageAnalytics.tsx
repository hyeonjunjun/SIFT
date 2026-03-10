import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { MotiView } from 'moti';
import { Typography } from './design-system/Typography';
import { useSubscription } from '../hooks/useSubscription';
import { COLORS, RADIUS, SPACING, Theme } from '../lib/theme';
import { ChartLine, CaretDown, CaretUp, TrendUp, Clock } from 'phosphor-react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 80;
const CHART_HEIGHT = 120;

interface MonthlyUsage {
    month: string;
    count: number;
}

export function UsageAnalytics() {
    const { user } = useAuth();
    const { currentCount, maxSiftsTotal, isUnlimited, loadingCount } = useSubscription();
    const [expanded, setExpanded] = useState(false);

    // Fetch usage data for the last 6 months
    const { data: monthlyData = [], isLoading: loadingHistory } = useQuery({
        queryKey: ['usage-history', user?.id],
        queryFn: async () => {
            if (!user) return [];

            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            const { data, error } = await supabase
                .from('pages')
                .select('created_at')
                .eq('user_id', user.id)
                .gte('created_at', sixMonthsAgo.toISOString())
                .order('created_at', { ascending: true });

            if (error) throw error;

            // Group by month
            const monthlyMap = new Map<string, number>();
            data?.forEach(page => {
                const date = new Date(page.created_at);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + 1);
            });

            // Convert to array and fill missing months
            const months: MonthlyUsage[] = [];
            for (let i = 5; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                months.push({
                    month: date.toLocaleDateString('en-US', { month: 'short' }),
                    count: monthlyMap.get(monthKey) || 0
                });
            }

            return months;
        },
        enabled: !!user && !isUnlimited,
        staleTime: 1000 * 60 * 5,
    });

    if (isUnlimited || loadingCount) return null;

    const progress = currentCount / maxSiftsTotal;

    // Calculate predictions
    const recentMonths = monthlyData.slice(-3);
    const avgMonthlyUsage = recentMonths.reduce((sum, m) => sum + m.count, 0) / Math.max(recentMonths.length, 1);
    const remainingSifts = maxSiftsTotal - currentCount;
    const daysUntilLimit = remainingSifts > 0 && avgMonthlyUsage > 0
        ? Math.round((remainingSifts / avgMonthlyUsage) * 30)
        : null;

    const maxCount = Math.max(...monthlyData.map(m => m.count), 1);

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.header}
                onPress={() => setExpanded(!expanded)}
                activeOpacity={0.7}
            >
                <View style={styles.headerLeft}>
                    <View style={styles.iconContainer}>
                        <ChartLine size={18} color={COLORS.ink} weight="duotone" />
                    </View>
                    <View>
                        <Typography variant="label" color={COLORS.ink} style={{ fontSize: 14 }}>
                            Usage Analytics
                        </Typography>
                        {!expanded && (
                            <Typography variant="caption" color={COLORS.stone} style={{ fontSize: 11, marginTop: 2 }}>
                                {currentCount} of {maxSiftsTotal} sifts used
                            </Typography>
                        )}
                    </View>
                </View>
                {expanded ? (
                    <CaretUp size={20} color={COLORS.stone} weight="bold" />
                ) : (
                    <CaretDown size={20} color={COLORS.stone} weight="bold" />
                )}
            </TouchableOpacity>

            {expanded && (
                <MotiView
                    from={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ type: 'timing', duration: 300 }}
                >
                    {/* Insights */}
                    <View style={styles.insights}>
                        <View style={styles.insightCard}>
                            <TrendUp size={16} color={COLORS.ink} weight="duotone" />
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <Typography variant="caption" color={COLORS.stone} style={{ fontSize: 10 }}>
                                    Avg. Monthly Usage
                                </Typography>
                                <Typography variant="label" color={COLORS.ink} style={{ fontSize: 14, marginTop: 2 }}>
                                    {avgMonthlyUsage.toFixed(0)} sifts
                                </Typography>
                            </View>
                        </View>

                        {daysUntilLimit && daysUntilLimit > 0 && (
                            <View style={styles.insightCard}>
                                <Clock size={16} color={progress > 0.8 ? COLORS.danger : COLORS.ink} weight="duotone" />
                                <View style={{ flex: 1, marginLeft: 8 }}>
                                    <Typography variant="caption" color={COLORS.stone} style={{ fontSize: 10 }}>
                                        Estimated Time Left
                                    </Typography>
                                    <Typography variant="label" color={progress > 0.8 ? COLORS.danger : COLORS.ink} style={{ fontSize: 14, marginTop: 2 }}>
                                        ~{daysUntilLimit} days
                                    </Typography>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Chart */}
                    {!loadingHistory && monthlyData.length > 0 && (
                        <View style={styles.chartContainer}>
                            <Typography variant="caption" color={COLORS.stone} style={{ marginBottom: 12, fontSize: 11 }}>
                                Last 6 Months
                            </Typography>
                            <View style={styles.chart}>
                                {monthlyData.map((month, index) => {
                                    const barHeight = (month.count / maxCount) * CHART_HEIGHT;
                                    return (
                                        <View key={index} style={styles.barContainer}>
                                            <View style={styles.barWrapper}>
                                                <MotiView
                                                    from={{ height: 0 }}
                                                    animate={{ height: barHeight || 4 }}
                                                    transition={{ type: 'spring', delay: index * 50 }}
                                                    style={[
                                                        styles.bar,
                                                        {
                                                            backgroundColor: month.count === 0 ? COLORS.subtle : COLORS.ink,
                                                            opacity: month.count === 0 ? 0.3 : 1
                                                        }
                                                    ]}
                                                />
                                            </View>
                                            <Typography variant="caption" style={styles.barLabel}>
                                                {month.month}
                                            </Typography>
                                            <Typography variant="caption" style={styles.barCount}>
                                                {month.count}
                                            </Typography>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    )}

                    {progress > 0.8 && (
                        <View style={styles.upgradePrompt}>
                            <Typography variant="caption" style={{ color: COLORS.stone, textAlign: 'center', lineHeight: 18 }}>
                                At your current pace, you'll reach your limit soon. Consider upgrading to continue sifting.
                            </Typography>
                        </View>
                    )}
                </MotiView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 20,
        marginVertical: SPACING.m,
        backgroundColor: COLORS.paper,
        borderRadius: RADIUS.m,
        ...Theme.shadows.soft,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.separator,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: COLORS.surfaceSecondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    insights: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 12,
    },
    insightCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.s,
    },
    chartContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    chart: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: CHART_HEIGHT + 40,
    },
    barContainer: {
        flex: 1,
        alignItems: 'center',
    },
    barWrapper: {
        width: '100%',
        height: CHART_HEIGHT,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    bar: {
        width: '60%',
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
        minHeight: 4,
    },
    barLabel: {
        marginTop: 6,
        fontSize: 10,
        color: COLORS.stone,
    },
    barCount: {
        marginTop: 2,
        fontSize: 9,
        color: COLORS.ink,
        fontWeight: '600',
    },
    upgradePrompt: {
        padding: 16,
        paddingTop: 0,
    },
});
