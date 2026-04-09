import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Alert, Share as RNShare } from 'react-native';
import { Typography } from '../../components/design-system/Typography';
import { EmptyState } from '../../components/design-system/EmptyState';
import { SPACING, RADIUS, Theme } from '../../lib/theme';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ScreenWrapper from '../../components/ScreenWrapper';
import { CaretLeft, CaretRight, Plus, Trash, CalendarBlank, CookingPot, Bell, BellSimple, Copy, Export, ArrowsClockwise } from 'phosphor-react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { SiftPickerModal } from '../../components/modals/SiftPickerModal';
import { MacroSummary } from '../../components/plan/MacroSummary';
import { MonthView } from '../../components/plan/MonthView';
import { GroceryList } from '../../components/plan/GroceryList';
import { MealReminderPicker } from '../../components/plan/MealReminderPicker';
import { ViewToggle } from '../../components/plan/ViewToggle';
import { MealOptionsSheet } from '../../components/plan/MealOptionsSheet';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Types ---
const DEFAULT_MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
type ViewMode = 'day' | 'week' | 'month';

const DAY_NAMES_SUN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_MON = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getWeekDates(baseDate: Date, mondayStart = false): Date[] {
    const start = new Date(baseDate);
    const dayOfWeek = start.getDay();
    const offset = mondayStart ? (dayOfWeek === 0 ? -6 : 1 - dayOfWeek) : -dayOfWeek;
    start.setDate(start.getDate() + offset);
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
    meal_type: string;
    reminder_time?: string;
    recurring_rule?: string;
    created_at: string;
    page?: {
        id: string;
        title: string;
        metadata?: {
            image_url?: string;
            smart_data?: {
                preparation_time?: string;
                cook_time?: string;
                total_time?: string;
                calories?: number;
                nutrition_per_serving?: {
                    calories?: number;
                    protein_g?: number;
                    carbs_g?: number;
                    fat_g?: number;
                };
                ingredients?: string[];
                servings?: number;
            };
        };
    };
}

// --- Main Screen ---
export default function PlanScreen() {
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [weekOffset, setWeekOffset] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickerMealType, setPickerMealType] = useState('Dinner');
    const [groceryVisible, setGroceryVisible] = useState(false);
    const [reminderVisible, setReminderVisible] = useState(false);
    const [reminderMeal, setReminderMeal] = useState<MealPlanEntry | null>(null);
    const [copySourceDate, setCopySourceDate] = useState<string | null>(null);
    const [mealTypes, setMealTypes] = useState<string[]>(DEFAULT_MEAL_TYPES);
    const [weekStartsMonday, setWeekStartsMonday] = useState(false);
    const [optionsVisible, setOptionsVisible] = useState(false);
    const [optionsMeal, setOptionsMeal] = useState<MealPlanEntry | null>(null);

    // Load preferences
    React.useEffect(() => {
        AsyncStorage.getItem('meal_types').then(val => {
            if (val) setMealTypes(JSON.parse(val));
        }).catch(() => {});
        AsyncStorage.getItem('week_starts_monday').then(val => {
            if (val === 'true') setWeekStartsMonday(true);
        }).catch(() => {});
    }, []);

    const DAY_NAMES = weekStartsMonday ? DAY_NAMES_MON : DAY_NAMES_SUN;

    const weekDates = useMemo(() => {
        const base = new Date();
        base.setDate(base.getDate() + weekOffset * 7);
        return getWeekDates(base, weekStartsMonday);
    }, [weekOffset, weekStartsMonday]);

    const weekStart = formatDateKey(weekDates[0]);
    const weekEnd = formatDateKey(weekDates[6]);

    // Fetch meal plans for current week (or wider range for month view)
    const fetchStart = viewMode === 'month'
        ? formatDateKey(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
        : weekStart;
    const fetchEnd = viewMode === 'month'
        ? formatDateKey(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0))
        : weekEnd;

    const { data: mealPlans = [], isLoading } = useQuery({
        queryKey: ['meal_plans', user?.id, fetchStart, fetchEnd],
        queryFn: async () => {
            if (!user?.id) return [];
            const { data, error } = await supabase
                .from('meal_plans')
                .select('*')
                .eq('user_id', user.id)
                .gte('date', fetchStart)
                .lte('date', fetchEnd)
                .order('meal_type');

            if (error) throw error;
            if (!data || data.length === 0) return [];

            const pageIds = [...new Set(data.map((m: any) => m.page_id))];
            const { data: pages } = await supabase
                .from('pages')
                .select('id, title, metadata')
                .in('id', pageIds);

            const pageMap = new Map((pages || []).map((p: any) => [p.id, p]));
            return data.map((m: any) => ({ ...m, page: pageMap.get(m.page_id) || null })) as MealPlanEntry[];
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 2,
    });

    // Auto-populate recurring meals for the current week
    React.useEffect(() => {
        if (!user?.id || mealPlans.length === 0) return;
        const recurring = mealPlans.filter(m => m.recurring_rule?.startsWith('weekly:'));
        if (recurring.length === 0) return;

        const populate = async () => {
            const inserts: any[] = [];
            for (const meal of recurring) {
                const targetDay = parseInt(meal.recurring_rule!.split(':')[1]);
                // Find the date in the current week that matches this day
                for (const date of weekDates) {
                    if (date.getDay() !== targetDay) continue;
                    const dateKey = formatDateKey(date);
                    if (dateKey === meal.date) continue; // Don't duplicate the source
                    // Check if this recurring meal already exists on this date
                    const exists = mealPlans.some(m => m.page_id === meal.page_id && m.date === dateKey && m.meal_type === meal.meal_type);
                    if (!exists) {
                        inserts.push({
                            user_id: user.id,
                            page_id: meal.page_id,
                            date: dateKey,
                            meal_type: meal.meal_type,
                            recurring_rule: meal.recurring_rule,
                        });
                    }
                }
            }
            if (inserts.length > 0) {
                const { error } = await supabase.from('meal_plans').insert(inserts);
                if (!error) {
                    queryClient.invalidateQueries({ queryKey: ['meal_plans', user.id] });
                }
            }
        };
        populate();
    }, [mealPlans.length, weekStart]);

    const selectedDateKey = formatDateKey(selectedDate);
    const dayMeals = useMemo(() => mealPlans.filter(m => m.date === selectedDateKey), [mealPlans, selectedDateKey]);

    const mealsByType = useMemo(() => {
        const grouped: Record<string, MealPlanEntry[]> = {};
        for (const t of mealTypes) grouped[t] = [];
        for (const m of dayMeals) {
            if (grouped[m.meal_type]) grouped[m.meal_type].push(m);
            else {
                // Unknown meal type — add to end
                if (!grouped[m.meal_type]) grouped[m.meal_type] = [];
                grouped[m.meal_type].push(m);
            }
        }
        return grouped;
    }, [dayMeals, mealTypes]);

    const mealCountByDate = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const m of mealPlans) counts[m.date] = (counts[m.date] || 0) + 1;
        return counts;
    }, [mealPlans]);

    // --- Handlers ---
    const handleAddMeal = (mealType: string) => {
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

    const handleMoveMeal = async (mealPlanId: string, newMealType: string) => {
        try {
            const { error } = await supabase.from('meal_plans').update({ meal_type: newMealType }).eq('id', mealPlanId);
            if (error) throw error;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            queryClient.invalidateQueries({ queryKey: ['meal_plans', user?.id] });
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    const handleToggleRecurring = async (meal: MealPlanEntry) => {
        try {
            const dayOfWeek = new Date(meal.date + 'T00:00:00').getDay();
            const dayName = FULL_DAY_NAMES[dayOfWeek];
            if (meal.recurring_rule) {
                // Remove recurring
                await supabase.from('meal_plans').update({ recurring_rule: null }).eq('id', meal.id);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                // Set recurring
                await supabase.from('meal_plans').update({ recurring_rule: `weekly:${dayOfWeek}` }).eq('id', meal.id);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Recurring Set', `This meal will repeat every ${dayName}.`);
            }
            queryClient.invalidateQueries({ queryKey: ['meal_plans', user?.id] });
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    const handleShareMealWithFriend = async (friendId: string, friendName: string, meal: MealPlanEntry) => {
        if (!user?.id) return;
        try {
            // Create meal plan entry on friend's calendar
            const { error } = await supabase.from('meal_plans').insert({
                user_id: friendId,
                page_id: meal.page_id,
                date: meal.date,
                meal_type: meal.meal_type,
            });
            if (error) throw error;

            // Create notification for the friend
            await supabase.from('notifications').insert({
                user_id: friendId,
                actor_id: user.id,
                type: 'meal_shared',
                reference_id: meal.page_id,
                metadata: {
                    meal_type: meal.meal_type,
                    date: meal.date,
                    recipe_title: meal.page?.title || 'A recipe',
                },
            });

            // Send push notification
            const { sendPush } = await import('../../lib/pushHelper');
            sendPush({
                receiverId: friendId,
                actorName: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Someone',
                type: 'meal_shared',
                recipeTitle: meal.page?.title || 'a recipe',
            }).catch(() => {});

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Shared!', `${meal.page?.title || 'Recipe'} added to ${friendName}'s ${meal.meal_type} plan.`);
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    const handleInviteFriendToMeal = async (meal: MealPlanEntry) => {
        if (!user?.id) return;
        // Fetch friends list
        try {
            const { data: friendships } = await supabase
                .from('friendships')
                .select('user_id, friend_id')
                .eq('status', 'accepted')
                .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

            if (!friendships || friendships.length === 0) {
                Alert.alert('No Friends', 'Add friends in the Social tab to share meals.');
                return;
            }

            const friendIds = friendships.map(f => f.user_id === user.id ? f.friend_id : f.user_id);
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, display_name, username')
                .in('id', friendIds);

            if (!profiles || profiles.length === 0) return;

            Alert.alert(
                `Share "${meal.page?.title || 'Recipe'}"`,
                `Add to a friend's ${meal.meal_type} plan for ${FULL_DAY_NAMES[new Date(meal.date + 'T00:00:00').getDay()]}`,
                [
                    ...profiles.map(p => ({
                        text: p.display_name || p.username || 'Friend',
                        onPress: () => handleShareMealWithFriend(p.id, p.display_name || p.username, meal),
                    })),
                    { text: 'Cancel', style: 'cancel' as const },
                ]
            );
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    // Series editing — delete all instances of a recurring meal
    const handleDeleteAllInstances = async (meal: MealPlanEntry) => {
        if (!user?.id || !meal.recurring_rule) return;
        try {
            const { error } = await supabase
                .from('meal_plans')
                .delete()
                .eq('user_id', user.id)
                .eq('page_id', meal.page_id)
                .eq('meal_type', meal.meal_type)
                .eq('recurring_rule', meal.recurring_rule);
            if (error) throw error;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            queryClient.invalidateQueries({ queryKey: ['meal_plans', user.id] });
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    // Delete this instance and all future ones
    const handleDeleteFutureInstances = async (meal: MealPlanEntry) => {
        if (!user?.id || !meal.recurring_rule) return;
        try {
            const { error } = await supabase
                .from('meal_plans')
                .delete()
                .eq('user_id', user.id)
                .eq('page_id', meal.page_id)
                .eq('meal_type', meal.meal_type)
                .eq('recurring_rule', meal.recurring_rule)
                .gte('date', meal.date);
            if (error) throw error;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            queryClient.invalidateQueries({ queryKey: ['meal_plans', user.id] });
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    // Delete past instances only
    const handleDeletePastInstances = async (meal: MealPlanEntry) => {
        if (!user?.id || !meal.recurring_rule) return;
        try {
            const { error } = await supabase
                .from('meal_plans')
                .delete()
                .eq('user_id', user.id)
                .eq('page_id', meal.page_id)
                .eq('meal_type', meal.meal_type)
                .eq('recurring_rule', meal.recurring_rule)
                .lt('date', meal.date);
            if (error) throw error;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            queryClient.invalidateQueries({ queryKey: ['meal_plans', user.id] });
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    // Stop repeating but keep existing instances
    const handleStopRepeating = async (meal: MealPlanEntry) => {
        if (!user?.id || !meal.recurring_rule) return;
        try {
            // Remove recurring_rule from ALL instances of this series
            const { error } = await supabase
                .from('meal_plans')
                .update({ recurring_rule: null })
                .eq('user_id', user.id)
                .eq('page_id', meal.page_id)
                .eq('meal_type', meal.meal_type)
                .eq('recurring_rule', meal.recurring_rule);
            if (error) throw error;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            queryClient.invalidateQueries({ queryKey: ['meal_plans', user.id] });
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    // Copy meal to another day via date picker
    const handleCopyMealToDay = (meal: MealPlanEntry) => {
        // Use the existing copy mechanism
        setCopySourceDate(meal.date);
        Alert.alert('Meal Copied', 'Select a destination day and use "Paste Day" from the menu.');
    };

    const handleOpenMealOptions = (meal: MealPlanEntry) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setOptionsMeal(meal);
        setOptionsVisible(true);
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

    const handleCopyDay = () => {
        if (dayMeals.length === 0) {
            Alert.alert('Nothing to copy', 'Add some meals first.');
            return;
        }
        Haptics.selectionAsync();
        setCopySourceDate(selectedDateKey);
        Alert.alert('Day Copied', 'Now select a destination day and tap "Paste Day" to duplicate these meals.');
    };

    const handlePasteDay = async () => {
        if (!copySourceDate || !user?.id) return;
        try {
            const sourceMeals = mealPlans.filter(m => m.date === copySourceDate);
            if (sourceMeals.length === 0) return;

            const inserts = sourceMeals.map(m => ({
                user_id: user.id,
                page_id: m.page_id,
                date: selectedDateKey,
                meal_type: m.meal_type,
            }));
            const { error } = await supabase.from('meal_plans').insert(inserts);
            if (error) throw error;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setCopySourceDate(null);
            queryClient.invalidateQueries({ queryKey: ['meal_plans', user.id] });
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    const handleCopyWeek = async () => {
        if (!user?.id || mealPlans.length === 0) return;
        try {
            const inserts = mealPlans.map(m => {
                const originalDate = new Date(m.date + 'T00:00:00');
                originalDate.setDate(originalDate.getDate() + 7);
                return {
                    user_id: user.id,
                    page_id: m.page_id,
                    date: formatDateKey(originalDate),
                    meal_type: m.meal_type,
                };
            });
            const { error } = await supabase.from('meal_plans').insert(inserts);
            if (error) throw error;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Week Copied', 'Meals duplicated to next week.');
            queryClient.invalidateQueries({ queryKey: ['meal_plans', user.id] });
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    const handleSetReminder = async (minutesBefore: number | null) => {
        if (!reminderMeal) return;
        try {
            if (minutesBefore === null) {
                // Remove reminder
                await supabase.from('meal_plans').update({ reminder_time: null }).eq('id', reminderMeal.id);
                await Notifications.cancelScheduledNotificationAsync(reminderMeal.id).catch(() => {});
            } else {
                const reminderTime = `${minutesBefore}`;
                await supabase.from('meal_plans').update({ reminder_time: reminderTime }).eq('id', reminderMeal.id);

                // Schedule local notification
                const mealDate = new Date(reminderMeal.date + 'T12:00:00'); // Default noon
                mealDate.setMinutes(mealDate.getMinutes() - minutesBefore);

                if (mealDate > new Date()) {
                    await Notifications.scheduleNotificationAsync({
                        content: {
                            title: `Time to cook: ${reminderMeal.page?.title || 'Your meal'}`,
                            body: minutesBefore > 0 ? `Starting in ${minutesBefore} minutes` : 'Time to start cooking!',
                            sound: true,
                        },
                        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: mealDate },
                        identifier: reminderMeal.id,
                    });
                }
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            queryClient.invalidateQueries({ queryKey: ['meal_plans', user?.id] });
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    const handleSharePlan = async () => {
        const dayNames = FULL_DAY_NAMES;
        let text = `My Meal Plan\n${monthLabel}\n\n`;
        for (const date of weekDates) {
            const key = formatDateKey(date);
            const dayIdx = date.getDay();
            const meals = mealPlans.filter(m => m.date === key);
            if (meals.length === 0) continue;
            text += `${dayNames[dayIdx]}:\n`;
            for (const m of meals) {
                text += `  ${m.meal_type}: ${m.page?.title || 'Recipe'}\n`;
            }
            text += '\n';
        }
        text += 'Shared from Sift';
        try { await RNShare.share({ message: text }); } catch {}
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await queryClient.invalidateQueries({ queryKey: ['meal_plans', user?.id] });
        setRefreshing(false);
    }, [user?.id]);

    const monthLabel = (() => {
        const months = new Set(weekDates.map(d => MONTH_NAMES[d.getMonth()]));
        const years = new Set(weekDates.map(d => d.getFullYear()));
        return `${[...months].join(' – ')} ${[...years].join('/')}`;
    })();

    const handleDateSelect = (date: Date) => {
        setSelectedDate(date);
        if (viewMode === 'month') setViewMode('day');
    };

    // --- Render ---
    return (
        <ScreenWrapper edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Typography variant="h2" style={{ fontSize: 24, flex: 1 }}>Meal Plan</Typography>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <ViewToggle value={viewMode} onChange={setViewMode} />
                    {/* Actions menu */}
                    <TouchableOpacity
                        onPress={() => {
                            Alert.alert('Meal Plan Actions', undefined, [
                                { text: 'Copy This Day', onPress: handleCopyDay },
                                ...(copySourceDate ? [{ text: 'Paste Day Here', onPress: handlePasteDay }] : []),
                                { text: 'Copy Week → Next Week', onPress: handleCopyWeek },
                                { text: 'Grocery List', onPress: () => setGroceryVisible(true) },
                                { text: 'Meal Prep Mode', onPress: () => router.push({ pathname: '/meal-prep', params: { weekStart, weekEnd } }) },
                                { text: 'Share Plan', onPress: handleSharePlan },
                                { text: 'Cancel', style: 'cancel' as const },
                            ]);
                        }}
                        style={[styles.headerBtn, { backgroundColor: colors.subtle }]}
                    >
                        <Typography variant="label" style={{ fontSize: 18 }}>•••</Typography>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Month View */}
            {viewMode === 'month' && (
                <MonthView
                    selectedDate={selectedDate}
                    onSelectDate={handleDateSelect}
                    mealCountByDate={mealCountByDate}
                    weekStartsMonday={weekStartsMonday}
                />
            )}

            {/* Week Navigation (week + day views) */}
            {viewMode !== 'month' && (
                <>
                    <View style={styles.weekNav}>
                        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setWeekOffset(w => w - 1); }} hitSlop={12}>
                            <CaretLeft size={20} color={colors.ink} weight="bold" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setWeekOffset(0); setSelectedDate(new Date()); }}>
                            <Typography variant="label" style={{ fontSize: 14, letterSpacing: 0.5 }}>
                                {viewMode === 'day'
                                    ? `${FULL_DAY_NAMES[selectedDate.getDay()]}, ${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getDate()}`
                                    : monthLabel}
                            </Typography>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setWeekOffset(w => w + 1); }} hitSlop={12}>
                            <CaretRight size={20} color={colors.ink} weight="bold" />
                        </TouchableOpacity>
                    </View>

                    {/* Day Selector (week view only) */}
                    {viewMode === 'week' && (
                        <View style={styles.dayRow}>
                            {weekDates.map((date, i) => {
                                const key = formatDateKey(date);
                                const isSelected = key === selectedDateKey;
                                const today = isToday(date);
                                const hasMeals = (mealCountByDate[key] || 0) > 0;
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
                                        <Typography variant="caption" style={[styles.dayLabel, { color: isSelected ? colors.paper : colors.stone }]}>
                                            {DAY_NAMES[i]}
                                        </Typography>
                                        <Typography variant="bodyMedium" style={[styles.dayNumber, { color: isSelected ? colors.paper : colors.ink }]}>
                                            {date.getDate()}
                                        </Typography>
                                        {hasMeals && !isSelected && (
                                            <View style={[styles.mealDot, { backgroundColor: colors.accent }]} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </>
            )}

            {/* Macro Summary */}
            <MacroSummary meals={dayMeals} />

            {/* Copy indicator */}
            {copySourceDate && (
                <View style={[styles.copyBanner, { backgroundColor: colors.accent + '15' }]}>
                    <Copy size={14} color={colors.accent} />
                    <Typography variant="caption" style={{ color: colors.accent, marginLeft: 6 }}>
                        Day copied — select a day and tap "Paste Day" from the menu
                    </Typography>
                </View>
            )}

            {/* Meal Slots */}
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />}
            >
                {mealTypes.map(mealType => (
                    <View key={mealType} style={styles.mealSection}>
                        <View style={styles.mealHeader}>
                            <Typography variant="label" color="stone" style={{ fontSize: 11, letterSpacing: 1 }}>
                                {mealType.toUpperCase()}
                            </Typography>
                            <TouchableOpacity onPress={() => handleAddMeal(mealType)} hitSlop={10}>
                                <Plus size={18} color={colors.stone} />
                            </TouchableOpacity>
                        </View>

                        {(mealsByType[mealType] || []).length > 0 ? (
                            (mealsByType[mealType] || []).map(meal => (
                                <TouchableOpacity
                                    key={meal.id}
                                    style={[styles.mealCard, { backgroundColor: colors.surface, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}
                                    onPress={() => meal.page?.id && router.push(`/page/${meal.page.id}`)}
                                    onLongPress={() => handleOpenMealOptions(meal)}
                                    delayLongPress={400}
                                    activeOpacity={0.7}
                                >
                                    {meal.page?.metadata?.image_url && (
                                        <Image source={{ uri: meal.page.metadata.image_url }} style={styles.mealImage} />
                                    )}
                                    <View style={styles.mealInfo}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <Typography variant="bodyMedium" numberOfLines={2} style={{ fontSize: 14, flex: 1 }}>
                                                {meal.page?.title || 'Untitled'}
                                            </Typography>
                                            {meal.recurring_rule && (
                                                <ArrowsClockwise size={12} color={colors.accent} weight="bold" />
                                            )}
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                                            {meal.page?.metadata?.smart_data?.total_time && (
                                                <Typography variant="caption" color="stone" style={{ fontSize: 11 }}>
                                                    {meal.page.metadata.smart_data.total_time}
                                                </Typography>
                                            )}
                                            {meal.page?.metadata?.smart_data?.nutrition_per_serving?.calories && (
                                                <Typography variant="caption" color="stone" style={{ fontSize: 11 }}>
                                                    {meal.page.metadata.smart_data.nutrition_per_serving.calories} cal
                                                </Typography>
                                            )}
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => { setReminderMeal(meal); setReminderVisible(true); }}
                                        hitSlop={8}
                                        style={{ padding: 6 }}
                                    >
                                        {meal.reminder_time ? (
                                            <Bell size={16} color={colors.accent} weight="fill" />
                                        ) : (
                                            <BellSimple size={16} color={colors.stone} />
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleRemoveMeal(meal.id)} hitSlop={10} style={styles.removeButton}>
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

            {/* Modals */}
            <SiftPickerModal
                visible={pickerVisible}
                onClose={() => setPickerVisible(false)}
                onSelect={handlePickerSave}
                currentCollectionSiftIds={dayMeals.map(m => m.page_id)}
            />

            <GroceryList
                visible={groceryVisible}
                onClose={() => setGroceryVisible(false)}
                meals={mealPlans}
                weekKey={weekStart}
            />

            <MealReminderPicker
                visible={reminderVisible}
                onClose={() => { setReminderVisible(false); setReminderMeal(null); }}
                onSelect={handleSetReminder}
                currentReminder={reminderMeal?.reminder_time}
                mealTitle={reminderMeal?.page?.title || 'Meal'}
            />

            <MealOptionsSheet
                visible={optionsVisible}
                onClose={() => { setOptionsVisible(false); setOptionsMeal(null); }}
                meal={optionsMeal}
                mealTypes={mealTypes}
                onViewRecipe={() => optionsMeal?.page?.id && router.push(`/page/${optionsMeal.page.id}`)}
                onStartCooking={() => optionsMeal?.page?.id && router.push(`/page/${optionsMeal.page.id}`)}
                onMoveTo={(newType) => optionsMeal && handleMoveMeal(optionsMeal.id, newType)}
                onSetReminder={() => { if (optionsMeal) { setReminderMeal(optionsMeal); setReminderVisible(true); } }}
                onRemoveReminder={() => { if (optionsMeal) { setReminderMeal(optionsMeal); handleSetReminder(null); } }}
                onShareWithFriend={() => optionsMeal && handleInviteFriendToMeal(optionsMeal)}
                onToggleRecurring={() => optionsMeal && handleToggleRecurring(optionsMeal)}
                onStopRepeating={() => optionsMeal && handleStopRepeating(optionsMeal)}
                onDeleteThis={() => optionsMeal && handleRemoveMeal(optionsMeal.id)}
                onDeleteAllInstances={() => optionsMeal && handleDeleteAllInstances(optionsMeal)}
                onDeleteFutureInstances={() => optionsMeal && handleDeleteFutureInstances(optionsMeal)}
                onDeletePastInstances={() => optionsMeal && handleDeletePastInstances(optionsMeal)}
                onCopyToDay={() => optionsMeal && handleCopyMealToDay(optionsMeal)}
            />
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: SPACING.s,
        paddingBottom: SPACING.s,
    },
    headerBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
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
    copyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginBottom: SPACING.s,
        padding: SPACING.s,
        borderRadius: RADIUS.s,
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
