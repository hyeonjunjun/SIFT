import React from 'react';
import { View } from 'react-native';
import { GridPageCard } from '../../components/GridPageCard';

interface Page {
    id: string;
    title: string;
    url: string;
    metadata?: { image_url?: string };
    is_pinned?: boolean;
    created_at: string;
}

interface MasonryListProps {
    pages: Page[];
    onDelete?: (id: string) => void;
    onDeleteForever?: (id: string) => void;
    onPin?: (id: string) => void;
}

export function MasonryList({ pages, onDelete, onDeleteForever, onPin }: MasonryListProps) {
    if (!pages) return null;

    const leftColumn = pages.filter((_, i) => i % 2 === 0);
    const rightColumn = pages.filter((_, i) => i % 2 !== 0);

    return (
        <View className="flex-row px-5 space-x-3">
            <View className="flex-1 mr-2 space-y-3">
                {leftColumn.map((item, i) => (
                    <GridPageCard
                        key={item.id}
                        index={i * 2}
                        id={item.id}
                        title={item.title}
                        url={item.url}
                        imageUrl={item.metadata?.image_url}
                        isPinned={item.is_pinned}
                        createdAt={item.created_at}
                        onDelete={onDelete}
                        onDeleteForever={onDeleteForever}
                        onPin={onPin}
                    />
                ))}
            </View>

            <View className="flex-1 ml-2 space-y-3">
                {rightColumn.map((item, i) => (
                    <GridPageCard
                        key={item.id}
                        index={i * 2 + 1}
                        id={item.id}
                        title={item.title}
                        url={item.url}
                        imageUrl={item.metadata?.image_url}
                        isPinned={item.is_pinned}
                        createdAt={item.created_at}
                        onDelete={onDelete}
                        onDeleteForever={onDeleteForever}
                        onPin={onPin}
                    />
                ))}
            </View>
        </View>
    );
}
