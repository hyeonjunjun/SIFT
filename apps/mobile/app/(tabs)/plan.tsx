import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Alert } from 'react-native';
import { Typography } from '../../components/design-system/Typography';
import { EmptyState } from '../../components/design-system/EmptyState';
import { SPACING, RADIUS, Theme } from '../../lib/theme';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ScreenWrapper from '../../components/ScreenWrapper';
import { CaretLeft, CaretRight, Plus, Trash, CalendarBlank, CookingPot } from 'phosphor-react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SiftPickerModal } from '../../components/modals/SiftPickerModal';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;
type MealType = typeof MEAL_TYPES[number];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function getWeekDates(baseDate: Date): Date[] {
    const start = new Date(baseDate);
    start.setDate(start.getDate() - start.getDay()); // Sunday
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return d;
    });
}

function formatDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isToday(date: Date): boolean {
    const now = new Date();
    return date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

interface MealPlanEntry {
    id: string;
    user_id: string;
    page_id: string;
    date: string;
    meal_type: MealType;
    reminder_time?: string;
    created_at: string;
    page?: {
        id: string;
        title: string;
        metadata?: { image_url?: string; smart_data?: { preparation_time?: string; calories?: number } };
    };
}

export default function PlanScreen() {
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [weekOffset, setWeekOffset] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickerMealType, setPickerMealType] = useState<MealType>('Dinner');

    const weekDates = useMemo(() => {
        const base = new Date();
        base.setDate(base.getDate() + weekOffset * 7);
        return getWeekDates(base);
    }, [weekOffset]);

    const weekStart = formatDateKey(weekDates[0]);
    const weekEnd = formatDateKey(weekDates[6]);

    // Fetch meal plans for current week
    const { data: mealPlans = [], isLoading } = useQuery({
        queryKey: ['meal_plans', user?.id, weekStart, weekEnd],
        queryFn: async () => {
            if (!user?.id) return [];
            const { data, error } = await supabase
                .from('meal_plans')
                .select('*')
                .eq('user_id', user.id)
                .gte('date', weekStart)
                .lte('date', weekEnd)
                .order('meal_type');

            if (error) throw error;
            if (!data || data.length === 0) return [];

            // Fetch page details
            const pageIds = [...new Set(data.map((m: any) => m.page_id))];
            const { data: pages } = await supabase
                .from('pages')
                .select('id, title, metadata')
                .in('id', pageIds);

            const pageMap = new Map((pages || []).map((p: any) => [p.id, p]));

            return data.map((m: any) => ({
                ...m,
                page: pageMap.get(m.page_id) || null,
            })) as MealPlanEntry[];
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 2,
    });

    const selectedDateKey = formatDateKey(selectedDate);
    const dayMeals = useMemo(() => {
        return mealPlans.filter(m => m.date === selectedDateKey);
    }, [mealPlans, selectedDateKey]);

    const mealsByType = useMemo(() => {
        const grouped: Record<MealType, MealPlanEntry[]> = {
            Breakfast: [], Lunch: [], Dinner: [], Snack: [],
        };
        for (const m of dayMeals) {
            if (grouped[m.meal_type as MealType]) {
                grouped[m.meal_type as MealType].push(m);
            }
        }
        return grouped;
    }, [dayMeals]);

    // Count meals per day for the week dots
    const mealCountByDay = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const m of mealPlans) {
            counts[m.date] = (counts[m.date] || 0) + 1;
        }
        return counts;
    }, [mealPlans]);

    const handleAddMeal = (mealType: MealType) => {
        Haptics.selectionAsync();
        setPickerMealType(mealType);
        setPickerVisible(true);
    };

    const handlePickerSave = async (selectedPageIds: string[]) => {
        if (!user?.id || selectedPageIds.length === 0) return;
        try {
            const inserts = selectedPageIds.map(pageId => ({
                user_id: user.id,
                page_id: pageId,
                date: selectedDateKey,
                meal_type: pickerMealType,
            }));
            const { error } = await supabase.from('meal_plans').insert(inserts);
            if (error) throw error;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            queryClient.invalidateQueries({ queryKey: ['meal_plans', user.id] });
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    const handleRemoveMeal = async (mealPlanId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            const { error } = await supabase.from('meal_plans').delete().eq('id', mealPlanId);
            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['meal_plans', user?.id] });
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await queryClient.invalidateQueries({ queryKey: ['meal_plans', user?.id] });
        setRefreshing(false);
    }, [user?.id]);

    const monthLabel = (() => {
        const months = new Set(weekDates.map(d => MONTH_NAMES[d.getMonth()]));
        const years = new Set(weekDates.map(d => d.getFullYear()));
        const monthStr = [...months].join(' – ');
        const yearStr = [...years].join('/');
        return `${monthStr} ${yearStr}`;
    })();

    return (
        <ScreenWrapper edges={['top']}>
            <View style={styles.header}>
                <Typography variant="h2" style={{ fontSize: 24 }}>Meal Plan</Typography>
            </View>

            {/* Week Navigation */}
            <View style={styles.weekNav}>
                <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setWeekOffset(w => w - 1); }} hitSlop={12}>
                    <CaretLeft size={20} color={colors.ink} weight="bold" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setWeekOffset(0); setSelectedDate(new Date()); }}>
                    <Typography variant="label" style={{ fontSize: 14, letterSpacing: 0.5 }}>
                        {monthLabel}
                    </Typography>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setWeekOffset(w => w + 1); }} hitSlop={12}>
                    <CaretRight size={20} color={colors.ink} weight="bold" />
                </TouchableOpacity>
            </View>

            {/* Day Selector */}
            <View style={styles.dayRow}>
                {weekDates.map((date, i) => {
                    const key = formatDateKey(date);
                    const isSelected = key === selectedDateKey;
                    const today = isToday(date);
                    const hasMeals = (mealCountByDay[key] || 0) > 0;
                    return (
                        <TouchableOpacity
                            key={key}
                            onPress={() => { Haptics.selectionAsync(); setSelectedDate(date); }}
                            style={[
                                styles.dayCell,
                                isSelected && { backgroundColor: colors.ink },
                                today && !isSelected && { borderWidth: 1.5, borderColor: colors.ink },
                            ]}
                        >
                            <Typography variant="caption" style={[
                                styles.dayLabel,
                                { color: isSelected ? colors.paper : colors.stone },
                            ]}>
                                {DAY_NAMES[i]}
                            </Typography>
                            <Typography variant="bodyMedium" style={[
                                styles.dayNumber,
                                { color: isSelected ? colors.paper : colors.ink },
                            ]}>
                                {date.getDate()}
                            </Typography>
                            {hasMeals && !isSelected && (
                                <View style={[styles.mealDot, { backgroundColor: colors.accent }]} />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Meal Slots */}
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />}
            >
                {MEAL_TYPES.map(mealType => (
                    <View key={mealType} style={styles.mealSection}>
                        <View style={styles.mealHeader}>
                            <Typography variant="label" color="stone" style={{ fontSize: 11, letterSpacing: 1 }}>
                                {mealType.toUpperCase()}
                            </Typography>
                            <TouchableOpacity onPress={() => handleAddMeal(mealType)} hitSlop={10}>
                                <Plus size={18} color={colors.stone} />
                            </TouchableOpacity>
                        </View>

                        {mealsByType[mealType].length > 0 ? (
                            mealsByType[mealType].map(meal => (
                                <TouchableOpacity
                                    key={meal.id}
                                    style={[styles.mealCard, { backgroundColor: colors.surface, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}
                                    onPress={() => meal.page?.id && router.push(`/page/${meal.page.id}`)}
                                    activeOpacity={0.7}
                                >
                                    {meal.page?.metadata?.image_url && (
                                        <Image
                                            source={{ uri: meal.page.metadata.image_url }}
                                            style={styles.mealImage}
                                        />
                                    )}
                                    <View style={styles.mealInfo}>
                                        <Typography variant="bodyMedium" numberOfLines={2} style={{ fontSize: 14 }}>
                                            {meal.page?.title || 'Untitled'}
                                        </Typography>
                                        {meal.page?.metadata?.smart_data?.preparation_time && (
                                            <Typography variant="caption" color="stone" style={{ marginTop: 2 }}>
                                                {meal.page.metadata.smart_data.preparation_time}
                                            </Typography>
                                        )}
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => handleRemoveMeal(meal.id)}
                                        hitSlop={10}
                                        style={styles.removeButton}
                                    >
                                        <Trash size={16} color={colors.stone} />
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <TouchableOpacity
                                style={[styles.emptySlot, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}
                                onPress={() => handleAddMeal(mealType)}
                                activeOpacity={0.6}
                            >
                                <Plus size={16} color={colors.stone} />
                                <Typography variant="caption" color="stone" style={{ marginLeft: 6 }}>
                                    Add recipe
                                </Typography>
                            </TouchableOpacity>
                        )}
                    </View>
                ))}

                {dayMeals.length === 0 && !isLoading && (
                    <View style={{ paddingTop: 20 }}>
                        <EmptyState
                            icon={<CalendarBlank size={40} color={colors.stone} />}
                            title="No meals planned"
                            description="Tap + to add recipes from your library to this day."
                        />
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            <SiftPickerModal
                visible={pickerVisible}
                onClose={() => setPickerVisible(false)}
                onSelect={handlePickerSave}
                currentCollectionSiftIds={dayMeals.map(m => m.page_id)}
            />
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 20,
        paddingTop: SPACING.s,
        paddingBottom: SPACING.s,
    },
    weekNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: SPACING.m,
    },
    dayRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: SPACING.m,
    },
    dayCell: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 64,
        borderRadius: RADIUS.l,
        gap: 4,
    },
    dayLabel: {
        fontSize: 10,
        fontFamily: 'Satoshi-Medium',
        letterSpacing: 0.5,
    },
    dayNumber: {
        fontSize: 16,
        fontFamily: 'Satoshi-Bold',
    },
    mealDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    mealSection: {
        marginBottom: SPACING.l,
    },
    mealHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.s,
    },
    mealCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.s,
        borderRadius: RADIUS.m,
        borderWidth: 1,
        marginBottom: SPACING.xs,
    },
    mealImage: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.s,
    },
    mealInfo: {
        flex: 1,
        marginLeft: SPACING.s,
    },
    removeButton: {
        padding: 8,
    },
    emptySlot: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: RADIUS.m,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
});
