import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
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
    { id: 'baking', text: 'Baking' },
    { id: 'tech', text: 'Tech' },
    { id: 'health', text: 'Health' },
];

export function FilterBar({ filters = DEFAULT_FILTERS, activeFilter = 'all', onSelect }: Props) {
    const { colors } = useTheme();
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

                    const isActive = item.id === activeFilter;

                    return (
                        <Pressable
                            key={item.id || index}
                            style={({ pressed }) => [
                                styles.chip,
                                {
                                    backgroundColor: isActive ? colors.ink : colors.subtle,
                                    opacity: pressed ? 0.8 : 1,
                                },
                            ]}
                            onPress={() => {
                                Haptics.selectionAsync();
                                onSelect?.(item.id);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`Filter by ${item.text}`}
                        >
                            <Typography
                                variant="bodyMedium"
                                style={{ color: isActive ? colors.paper : colors.stone }}
                            >
                                {item.text || 'Unknown'}
                            </Typography>
                        </Pressable>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        minHeight: 48,
        marginBottom: SPACING.s,
    },
    scrollContent: {
        gap: SPACING.s,
        alignItems: 'center',
    },
    chip: {
        paddingHorizontal: SPACING.l - 4,
        paddingVertical: SPACING.m - 4,
        borderRadius: RADIUS.pill,
        marginRight: SPACING.s,
    },
});
