import React, { useRef, useEffect } from 'react';
import { ScrollView, View, Pressable } from 'react-native';
import { Typography } from '../design-system/Typography';
import { Theme } from '../../lib/theme';

interface FilterBarProps {
    filters: string[];
    activeFilter: string;
    onSelect: (filter: string) => void;
}

export function FilterBar({ filters, activeFilter, onSelect }: FilterBarProps) {
    const scrollViewRef = useRef<ScrollView>(null);

    // reset scroll when All is selected or filters change dramatically?
    // For now simple.

    return (
        <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-6 pl-5"
            contentContainerStyle={{ paddingRight: 20 }}
        >
            <Pressable
                onPress={() => onSelect('All')}
                className={`mr-3 px-5 py-2 rounded-full border ${activeFilter === 'All' ? 'bg-ink border-ink' : 'bg-transparent border-border'}`}
            >
                <Typography
                    variant="caption"
                    style={{
                        color: activeFilter === 'All' ? 'white' : Theme.colors.text.primary,
                        fontWeight: '600',
                        fontSize: 13
                    }}
                >
                    All
                </Typography>
            </Pressable>

            {filters.map((filter, index) => {
                const isActive = filter === activeFilter;
                return (
                    <Pressable
                        key={`${filter}-${index}`}
                        onPress={() => onSelect(filter)}
                        className={`mr-3 px-5 py-2 rounded-full border ${isActive ? 'bg-ink border-ink' : 'bg-transparent border-border'}`}
                    >
                        <Typography
                            variant="caption"
                            style={{
                                color: isActive ? 'white' : Theme.colors.text.primary,
                                fontWeight: '600',
                                fontSize: 13
                            }}
                        >
                            {filter}
                        </Typography>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}
