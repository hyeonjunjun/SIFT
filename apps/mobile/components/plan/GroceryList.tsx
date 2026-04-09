import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Share, Modal } from 'react-native';
import { Typography } from '../design-system/Typography';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, RADIUS, Theme } from '../../lib/theme';
import { X, CheckSquare, Square, Export, Basket } from 'phosphor-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

interface GroceryItem {
    ingredient: string;
    fromRecipe: string;
    category: string;
}

interface GroceryListProps {
    visible: boolean;
    onClose: () => void;
    meals: Array<{
        page?: {
            title?: string;
            metadata?: {
                smart_data?: {
                    ingredients?: string[];
                };
            };
        };
    }>;
    weekKey: string;
}

const CATEGORY_PATTERNS: Record<string, RegExp> = {
    'Produce': /lettuce|tomato|onion|garlic|pepper|avocado|lemon|lime|cilantro|parsley|basil|spinach|kale|potato|carrot|celery|cucumber|mushroom|ginger|jalapeño|scallion|green onion|broccoli|zucchini|squash|corn|bean sprout|cabbage|radish/i,
    'Protein': /chicken|beef|pork|salmon|shrimp|tofu|egg|turkey|lamb|fish|steak|bacon|sausage|ground|breast|thigh/i,
    'Dairy': /milk|cheese|butter|cream|yogurt|sour cream|mozzarella|parmesan|cheddar|ricotta|whip/i,
    'Grains & Bread': /flour|bread|rice|pasta|noodle|tortilla|pita|wrap|oat|quinoa|couscous|panko|breadcrumb/i,
    'Spices & Seasoning': /salt|pepper|cumin|paprika|oregano|thyme|cinnamon|chili|cayenne|turmeric|coriander|nutmeg|powder|seasoning|spice/i,
    'Oils & Sauces': /oil|vinegar|soy sauce|hot sauce|mayo|mustard|ketchup|sriracha|sesame|dressing|marinade|worcestershire/i,
    'Canned & Pantry': /can |canned|broth|stock|tomato sauce|paste|bean|chickpea|lentil|coconut milk|honey|sugar|syrup/i,
};

function categorize(ingredient: string): string {
    for (const [cat, pattern] of Object.entries(CATEGORY_PATTERNS)) {
        if (pattern.test(ingredient)) return cat;
    }
    return 'Other';
}

export function GroceryList({ visible, onClose, meals, weekKey }: GroceryListProps) {
    const { colors, isDark } = useTheme();
    const [checked, setChecked] = useState<Set<string>>(new Set());
    const storageKey = `grocery_checked_${weekKey}`;

    // Load checked state
    useEffect(() => {
        if (visible) {
            AsyncStorage.getItem(storageKey).then(val => {
                if (val) setChecked(new Set(JSON.parse(val)));
            }).catch(() => {});
        }
    }, [visible, storageKey]);

    // Save checked state
    const toggleItem = (key: string) => {
        Haptics.selectionAsync();
        setChecked(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            AsyncStorage.setItem(storageKey, JSON.stringify([...next])).catch(() => {});
            return next;
        });
    };

    const items = useMemo(() => {
        // Parse quantity from ingredient string: "2 cups flour" → { qty: 2, unit: "cups", name: "flour" }
        const parseIngredient = (raw: string) => {
            const match = raw.match(/^([\d./½¼¾⅓⅔]+)\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|ml|liters?|cloves?|slices?|cans?|pieces?)?\s*(.+)/i);
            if (match) {
                let qty = 0;
                const qtyStr = match[1];
                if (qtyStr.includes('/')) {
                    const [n, d] = qtyStr.split('/');
                    qty = parseInt(n) / parseInt(d);
                } else if (qtyStr === '½') qty = 0.5;
                else if (qtyStr === '¼') qty = 0.25;
                else if (qtyStr === '¾') qty = 0.75;
                else if (qtyStr === '⅓') qty = 0.333;
                else if (qtyStr === '⅔') qty = 0.667;
                else qty = parseFloat(qtyStr);
                return { qty, unit: (match[2] || '').toLowerCase(), name: match[3].trim().toLowerCase() };
            }
            return { qty: 0, unit: '', name: raw.toLowerCase().trim() };
        };

        // Collect all ingredients
        const rawItems: Array<{ raw: string; recipe: string; parsed: ReturnType<typeof parseIngredient> }> = [];
        for (const meal of meals) {
            const ingredients = meal.page?.metadata?.smart_data?.ingredients;
            if (ingredients && Array.isArray(ingredients)) {
                for (const ing of ingredients) {
                    rawItems.push({ raw: ing, recipe: meal.page?.title || 'Recipe', parsed: parseIngredient(ing) });
                }
            }
        }

        // Merge duplicates by name + unit
        const merged = new Map<string, GroceryItem & { qty: number; unit: string; recipes: Set<string> }>();
        for (const item of rawItems) {
            const key = `${item.parsed.name}|${item.parsed.unit}`;
            if (merged.has(key) && item.parsed.qty > 0) {
                const existing = merged.get(key)!;
                existing.qty += item.parsed.qty;
                existing.recipes.add(item.recipe);
                // Rebuild display string
                const qtyStr = existing.qty % 1 === 0 ? String(existing.qty) : existing.qty.toFixed(1);
                existing.ingredient = `${qtyStr} ${existing.unit} ${item.parsed.name}`.trim();
                existing.fromRecipe = [...existing.recipes].join(', ');
            } else {
                merged.set(key, {
                    ingredient: item.raw,
                    fromRecipe: item.recipe,
                    category: categorize(item.raw),
                    qty: item.parsed.qty,
                    unit: item.parsed.unit,
                    recipes: new Set([item.recipe]),
                });
            }
        }

        return [...merged.values()].map(({ ingredient, fromRecipe, category }) => ({ ingredient, fromRecipe, category }));
    }, [meals]);

    const grouped = useMemo(() => {
        const groups: Record<string, GroceryItem[]> = {};
        for (const item of items) {
            if (!groups[item.category]) groups[item.category] = [];
            groups[item.category].push(item);
        }
        // Sort categories, putting "Other" last
        return Object.entries(groups).sort(([a], [b]) => {
            if (a === 'Other') return 1;
            if (b === 'Other') return -1;
            return a.localeCompare(b);
        });
    }, [items]);

    const handleShare = async () => {
        const lines = grouped.flatMap(([cat, items]) => [
            `\n${cat}:`,
            ...items.map(i => `  ${checked.has(i.ingredient) ? '✓' : '○'} ${i.ingredient}`)
        ]);
        try {
            await Share.share({ message: `Grocery List\n${lines.join('\n')}` });
        } catch {}
    };

    const checkedCount = items.filter(i => checked.has(i.ingredient)).length;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <View style={[styles.overlay]}>
                <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={onClose} />
                <View style={[styles.sheet, { backgroundColor: colors.canvas }]}>
                    <View style={styles.header}>
                        <View style={{ flex: 1 }}>
                            <Typography variant="h3">Grocery List</Typography>
                            <Typography variant="caption" color="stone">
                                {checkedCount}/{items.length} items checked
                            </Typography>
                        </View>
                        <TouchableOpacity onPress={handleShare} style={[styles.iconBtn, { backgroundColor: colors.subtle }]} hitSlop={8}>
                            <Export size={18} color={colors.ink} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onClose} style={[styles.iconBtn, { backgroundColor: colors.subtle, marginLeft: 8 }]} hitSlop={8}>
                            <X size={18} color={colors.ink} />
                        </TouchableOpacity>
                    </View>

                    {items.length === 0 ? (
                        <View style={styles.empty}>
                            <Basket size={48} color={colors.stone} weight="thin" />
                            <Typography variant="body" color="stone" style={{ marginTop: SPACING.m, textAlign: 'center' }}>
                                No ingredients found. Add recipes with ingredients to your meal plan.
                            </Typography>
                        </View>
                    ) : (
                        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                            {grouped.map(([category, categoryItems]) => (
                                <View key={category} style={styles.categorySection}>
                                    <Typography variant="label" color="stone" style={styles.categoryLabel}>
                                        {category.toUpperCase()}
                                    </Typography>
                                    {categoryItems.map((item, idx) => {
                                        const isChecked = checked.has(item.ingredient);
                                        return (
                                            <TouchableOpacity
                                                key={`${item.ingredient}-${idx}`}
                                                style={[styles.groceryItem, { backgroundColor: colors.surface }]}
                                                onPress={() => toggleItem(item.ingredient)}
                                                activeOpacity={0.7}
                                            >
                                                {isChecked ? (
                                                    <CheckSquare size={20} color={colors.accent} weight="fill" />
                                                ) : (
                                                    <Square size={20} color={colors.stone} />
                                                )}
                                                <View style={{ flex: 1, marginLeft: SPACING.s }}>
                                                    <Typography
                                                        variant="body"
                                                        style={[{ fontSize: 14 }, isChecked && { textDecorationLine: 'line-through', opacity: 0.5 }]}
                                                    >
                                                        {item.ingredient}
                                                    </Typography>
                                                    <Typography variant="caption" color="stone" style={{ fontSize: 11 }}>
                                                        from {item.fromRecipe}
                                                    </Typography>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            ))}
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    dismissArea: { flex: 1 },
    sheet: {
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
        maxHeight: '85%',
        paddingTop: SPACING.l,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.l,
        marginBottom: SPACING.m,
    },
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    empty: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    listContent: {
        paddingHorizontal: SPACING.l,
        paddingBottom: 40,
    },
    categorySection: {
        marginBottom: SPACING.l,
    },
    categoryLabel: {
        fontSize: 11,
        letterSpacing: 1,
        marginBottom: SPACING.s,
    },
    groceryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.m - 2,
        borderRadius: RADIUS.m,
        marginBottom: 6,
        ...Theme.shadows.soft,
    },
});
