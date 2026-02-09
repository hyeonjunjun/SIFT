import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';

// Define the shape of a filter item
interface FilterItem {
    id: string;
    text: string;
    active?: boolean;
}

interface Props {
    filters?: FilterItem[]; // Make it optional to prevent crashes
    activeFilter?: string;
    onSelect?: (id: string) => void;
}

// Default filters in case none are passed
const DEFAULT_FILTERS: FilterItem[] = [
    { id: 'all', text: 'All', active: true },
    { id: 'cooking', text: 'Cooking' },
    { id: 'baking', text: 'Baking' },
    { id: 'tech', text: 'Tech' },
    { id: 'health', text: 'Health' },
];

import { useTheme } from '../../context/ThemeContext';
import { COLORS } from '../../lib/theme';

export function FilterBar({ filters = DEFAULT_FILTERS, activeFilter = 'all', onSelect }: Props) {
    const { colors } = useTheme();
    // Safety Check: Ensure filters is always an array
    const safeFilters = Array.isArray(filters) ? filters : DEFAULT_FILTERS;

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {safeFilters.map((item, index) => {
                    // CRITICAL CRASH FIX: Guard against undefined items or missing text
                    if (!item || !item.text) return null;

                    const isActive = item.id === activeFilter;

                    return (
                        <Pressable
                            key={item.id || index}
                            style={[
                                styles.chip,
                                { backgroundColor: isActive ? colors.ink : colors.subtle },
                            ]}
                            onPress={() => onSelect?.(item.id)}
                        >
                            <Text style={[
                                styles.text,
                                { color: isActive ? colors.paper : colors.stone },
                            ]}>
                                {item.text || 'Unknown'}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 50,
        marginBottom: 8,
    },
    scrollContent: {
        paddingHorizontal: 20,
        gap: 8,
        alignItems: 'center',
    },
    chip: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 100, // Pill shape
        marginRight: 8,
        // @ts-ignore
        cornerCurve: 'continuous',
    },
    text: {
        fontSize: 14,
        fontWeight: '500',
        fontFamily: 'Inter_500Medium',
    },
    textActive: {
        color: '#FAF9F6', // Keep this as is for contrast on ink background
    },
});
