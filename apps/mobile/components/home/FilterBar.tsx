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

export function FilterBar({ filters = DEFAULT_FILTERS, activeFilter = 'all', onSelect }: Props) {
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
                    // CRITICAL CRASH FIX: Guard against undefined items
                    if (!item) return null;

                    const isActive = item.id === activeFilter;

                    return (
                        <Pressable
                            key={item.id || index}
                            style={[styles.chip, isActive && styles.chipActive]}
                            onPress={() => onSelect?.(item.id)}
                        >
                            <Text style={[styles.text, isActive && styles.textActive]}>
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
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
    },
    chipActive: {
        backgroundColor: '#1A1A1A',
        borderColor: '#1A1A1A',
    },
    text: {
        fontSize: 13,
        color: '#666',
        fontWeight: '500',
    },
    textActive: {
        color: '#FFF',
    },
});
