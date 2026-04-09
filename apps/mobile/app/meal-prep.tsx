import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { CaretLeft, CookingPot, CheckSquare, Square } from 'phosphor-react-native';
import { Typography } from '../components/design-system/Typography';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { SPACING, RADIUS, Theme } from '../lib/theme';
import ScreenWrapper from '../components/ScreenWrapper';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MealPrepScreen() {
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const router = useRouter();
    const { weekStart, weekEnd } = useLocalSearchParams<{ weekStart: string; weekEnd: string }>();

    const { data: mealPlans = [] } = useQuery({
        queryKey: ['meal_plans', user?.id, weekStart, weekEnd],
        queryFn: async () => {
            if (!user?.id || !weekStart || !weekEnd) return [];
            const { data, error } = await supabase
                .from('meal_plans')
                .select('*')
                .eq('user_id', user.id)
                .gte('date', weekStart)
                .lte('date', weekEnd);
            if (error) throw error;
            if (!data || data.length === 0) return [];

            const pageIds = [...new Set(data.map((m: any) => m.page_id))];
            const { data: pages } = await supabase
                .from('pages')
                .select('id, title, metadata')
                .in('id', pageIds);
            const pageMap = new Map((pages || []).map((p: any) => [p.id, p]));
            return data.map((m: any) => ({ ...m, page: pageMap.get(m.page_id) || null }));
        },
        enabled: !!user?.id && !!weekStart && !!weekEnd,
    });

    // Get unique recipes
    const uniqueRecipes = useMemo(() => {
        const seen = new Set<string>();
        return mealPlans.filter((m: any) => {
            if (seen.has(m.page_id)) return false;
            seen.add(m.page_id);
            return true;
        }).map((m: any) => m.page).filter(Boolean);
    }, [mealPlans]);

    // Combined ingredient list (deduplicated)
    const combinedIngredients = useMemo(() => {
        const all: string[] = [];
        for (const recipe of uniqueRecipes) {
            const ingredients = recipe?.metadata?.smart_data?.ingredients;
            if (ingredients && Array.isArray(ingredients)) {
                for (const ing of ingredients) {
                    // Simple dedup — exact match only
                    if (!all.some(existing => existing.toLowerCase() === ing.toLowerCase())) {
                        all.push(ing);
                    }
                }
            }
        }
        return all;
    }, [uniqueRecipes]);

    const [checkedItems, setCheckedItems] = React.useState<Set<number>>(new Set());

    return (
        <ScreenWrapper edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <CaretLeft size={28} color={colors.ink} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Typography variant="h3">Meal Prep</Typography>
                    <Typography variant="caption" color="stone">
                        {uniqueRecipes.length} recipes, {combinedIngredients.length} ingredients
                    </Typography>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Recipes overview */}
                <Typography variant="label" color="stone" style={styles.sectionLabel}>
                    RECIPES THIS WEEK
                </Typography>
                {uniqueRecipes.map((recipe: any) => (
                    <TouchableOpacity
                        key={recipe.id}
                        style={[styles.recipeCard, { backgroundColor: colors.surface, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}
                        onPress={() => router.push(`/page/${recipe.id}`)}
                        activeOpacity={0.7}
                    >
                        {recipe.metadata?.image_url && (
                            <Image source={{ uri: recipe.metadata.image_url }} style={styles.recipeImage} />
                        )}
                        <View style={{ flex: 1, marginLeft: SPACING.s }}>
                            <Typography variant="bodyMedium" numberOfLines={2} style={{ fontSize: 14 }}>
                                {recipe.title}
                            </Typography>
                            {recipe.metadata?.smart_data?.total_time && (
                                <Typography variant="caption" color="stone" style={{ marginTop: 2 }}>
                                    {recipe.metadata.smart_data.total_time}
                                </Typography>
                            )}
                        </View>
                    </TouchableOpacity>
                ))}

                {/* Combined ingredients */}
                <Typography variant="label" color="stone" style={[styles.sectionLabel, { marginTop: SPACING.xl }]}>
                    COMBINED INGREDIENTS
                </Typography>
                {combinedIngredients.map((ing, idx) => {
                    const isChecked = checkedItems.has(idx);
                    return (
                        <TouchableOpacity
                            key={idx}
                            style={styles.ingredientRow}
                            onPress={() => {
                                setCheckedItems(prev => {
                                    const next = new Set(prev);
                                    if (next.has(idx)) next.delete(idx);
                                    else next.add(idx);
                                    return next;
                                });
                            }}
                        >
                            {isChecked ? (
                                <CheckSquare size={20} color={colors.accent} weight="fill" />
                            ) : (
                                <Square size={20} color={colors.stone} />
                            )}
                            <Typography
                                variant="body"
                                style={[{ marginLeft: SPACING.s, fontSize: 14, flex: 1 }, isChecked && { textDecorationLine: 'line-through', opacity: 0.5 }]}
                            >
                                {ing}
                            </Typography>
                        </TouchableOpacity>
                    );
                })}

                {uniqueRecipes.length === 0 && (
                    <View style={{ alignItems: 'center', paddingTop: 60 }}>
                        <CookingPot size={48} color={colors.stone} weight="thin" />
                        <Typography variant="body" color="stone" style={{ marginTop: SPACING.m, textAlign: 'center' }}>
                            No recipes planned for this week yet.
                        </Typography>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        height: 60,
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    content: {
        paddingHorizontal: 20,
    },
    sectionLabel: {
        fontSize: 11,
        letterSpacing: 1,
        marginBottom: SPACING.s,
    },
    recipeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.s,
        borderRadius: RADIUS.m,
        borderWidth: 1,
        marginBottom: SPACING.xs,
    },
    recipeImage: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.s,
    },
    ingredientRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.06)',
    },
});
