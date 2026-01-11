import React from 'react';
import { View, ScrollView } from 'react-native';
import { GridPageCard } from '../../components/GridPageCard';

interface MasonryListProps {
    pages: any[];
    onDelete: (id: string) => void;
    onPin: (id: string) => void;
}

export function MasonryList({ pages, onDelete, onPin }: MasonryListProps) {
    if (!pages || pages.length === 0) return null;

    // Split pages into two columns
    const columns: [any[], any[]] = [[], []];

    pages.forEach((page, index) => {
        // Distribute to left (0) or right (1) column based on index
        const columnIndex = index % 2;
        columns[columnIndex].push({ ...page, originalIndex: index });
    });

    return (
        <View className="flex-row px-5 justify-between">
            {/* Left Column */}
            <View className="flex-1 mr-2">
                {columns[0].map((item) => (
                    <GridPageCard
                        key={item.id}
                        index={item.originalIndex}
                        id={item.id}
                        title={item.title}
                        url={item.url}
                        imageUrl={item.metadata?.image_url}
                        isPinned={item.is_pinned}
                        onDelete={onDelete}
                        onPin={onPin}
                    />
                ))}
            </View>

            {/* Right Column */}
            <View className="flex-1 ml-2">
                {columns[1].map((item) => (
                    <GridPageCard
                        key={item.id}
                        index={item.originalIndex}
                        id={item.id}
                        title={item.title}
                        url={item.url}
                        imageUrl={item.metadata?.image_url}
                        isPinned={item.is_pinned}
                        onDelete={onDelete}
                        onPin={onPin}
                    />
                ))}
            </View>
        </View>
    );
}
