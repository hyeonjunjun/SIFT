import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Typography } from '../design-system/Typography';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, RADIUS } from '../../lib/theme';

interface FilterItem {
    id: string;
    text: string;
    active?: boolean;
}

interface Props {
    filters?: FilterItem[];
    activeFilter?: string;
    onSelect?: (id: string) => void;
}

const DEFAULT_FILTERS: FilterItem[] = [
    { id: 'all', text: 'All', active: true },
    { id: 'cooking', text: 'Cooking' },
    { id: 'tech', text: 'Tech' },
    { id: 'health', text: 'Health' },
    { id: 'lifestyle', text: 'Lifestyle' },
    { id: 'finance', text: 'Finance' },
    { id: 'design', text: 'Design' },
    { id: 'travel', text: 'Travel' },
];

function FilterChip({ item, isActive, colors, isDark, onPress }: {
    item: FilterItem;
    isActive: boolean;
    colors: any;
    isDark: boolean;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={onPress}
            style={[
                styles.chip,
                isActive
                    ? { backgroundColor: colors.ink }
                    : {
                        backgroundColor: isDark ? '#2D2725' : '#FFFFFF',
                        borderWidth: 1.5,
                        borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#C8C3BB',
                    },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Filter by ${item.text}`}
        >
            <Typography
                variant="caption"
                style={[
                    styles.chipLabel,
                    { color: isActive ? colors.paper : colors.ink },
                ]}
            >
                {item.text || 'Unknown'}
            </Typography>
        </TouchableOpacity>
    );
}

export function FilterBar({ filters = DEFAULT_FILTERS, activeFilter = 'all', onSelect }: Props) {
    const { colors, isDark } = useTheme();
    const safeFilters = Array.isArray(filters) ? filters : DEFAULT_FILTERS;

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {safeFilters.map((item, index) => {
                    if (!item || !item.text) return null;

                    return (
                        <FilterChip
                            key={item.id || index}
                            item={item}
                            isActive={item.id === activeFilter}
                            colors={colors}
                            isDark={isDark}
                            onPress={() => {
                                Haptics.selectionAsync();
                                onSelect?.(item.id);
                            }}
                        />
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        minHeight: 48,
    },
    scrollContent: {
        alignItems: 'center',
        paddingRight: SPACING.m,
        paddingVertical: SPACING.xs,
        gap: SPACING.s,
    },
    chip: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: RADIUS.pill,
    },
    chipLabel: {
        fontSize: 13,
        fontFamily: 'Satoshi-Medium',
        letterSpacing: 0.2,
    },
});
