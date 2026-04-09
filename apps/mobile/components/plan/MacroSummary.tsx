import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Typography } from '../design-system/Typography';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, RADIUS } from '../../lib/theme';

interface MacroSummaryProps {
    meals: Array<{
        page?: {
            metadata?: {
                smart_data?: {
                    nutrition_per_serving?: {
                        calories?: number;
                        protein_g?: number;
                        carbs_g?: number;
                        fat_g?: number;
                        fiber_g?: number;
                    };
                    servings?: number;
                };
            };
        };
    }>;
}

export function MacroSummary({ meals }: MacroSummaryProps) {
    const { colors, isDark } = useTheme();

    const totals = React.useMemo(() => {
        let calories = 0, protein = 0, carbs = 0, fat = 0;
        let hasData = false;

        for (const meal of meals) {
            const n = meal.page?.metadata?.smart_data?.nutrition_per_serving;
            if (n) {
                hasData = true;
                calories += n.calories || 0;
                protein += n.protein_g || 0;
                carbs += n.carbs_g || 0;
                fat += n.fat_g || 0;
            }
        }

        return { calories: Math.round(calories), protein: Math.round(protein), carbs: Math.round(carbs), fat: Math.round(fat), hasData };
    }, [meals]);

    if (!totals.hasData || meals.length === 0) return null;

    return (
        <View style={[styles.container, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
            <View style={styles.macroRow}>
                <MacroItem label="Calories" value={totals.calories} unit="" color={colors.accent} isDark={isDark} />
                <MacroItem label="Protein" value={totals.protein} unit="g" color="#4ECDC4" isDark={isDark} />
                <MacroItem label="Carbs" value={totals.carbs} unit="g" color="#FFB347" isDark={isDark} />
                <MacroItem label="Fat" value={totals.fat} unit="g" color="#FF6B6B" isDark={isDark} />
            </View>
        </View>
    );
}

function MacroItem({ label, value, unit, color, isDark }: { label: string; value: number; unit: string; color: string; isDark: boolean }) {
    return (
        <View style={styles.macroItem}>
            <View style={[styles.macroIndicator, { backgroundColor: color }]} />
            <Typography variant="caption" color="stone" style={{ fontSize: 10, letterSpacing: 0.5 }}>
                {label.toUpperCase()}
            </Typography>
            <Typography variant="bodyMedium" style={{ fontSize: 16, marginTop: 2 }}>
                {value}{unit}
            </Typography>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: SPACING.l,
        marginBottom: SPACING.m,
        borderRadius: RADIUS.l,
        borderWidth: 1,
        padding: SPACING.m,
    },
    macroRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    macroItem: {
        alignItems: 'center',
        gap: 2,
    },
    macroIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginBottom: 4,
    },
});
