import React, { useRef } from 'react';
import { View, FlatList, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Typography } from '../design-system/Typography';
import { HeroCard } from './HeroCard';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.75; // Used for snap logic, but Card handles its own width

interface HeroCarouselProps {
    pages: any[];
    onTogglePin?: (id: string) => void;
}

export function HeroCarousel({ pages, onTogglePin }: HeroCarouselProps) {
    const recentPages = (pages || []).slice(0, 5); // Start with top 5
    const lastIndex = useRef(0);

    if (!recentPages || recentPages.length === 0) return null;

    const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const currentIndex = Math.round(contentOffsetX / (240 + 16));

        if (currentIndex !== lastIndex.current) {
            Haptics.selectionAsync();
            lastIndex.current = currentIndex;
        }
    };

    return (
        <View style={{ marginBottom: 24 }}>
            <Typography variant="h3" style={{ paddingHorizontal: 20, marginBottom: 16 }}>Recently Sifted</Typography>
            <FlatList
                data={recentPages}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={240 + 16} // Card Width (240) + Margin (16)
                decelerationRate="fast"
                contentContainerStyle={{ paddingHorizontal: 20 }}
                onScroll={onScroll}
                scrollEventThrottle={16}
                renderItem={({ item }) => (
                    <HeroCard
                        id={item.id}
                        title={item.title}
                        tags={item.tags}
                        imageUrl={item.metadata?.image_url}
                        isPinned={item.is_pinned}
                        onTogglePin={onTogglePin}
                    />
                )}
                keyExtractor={(item) => item.id}
            />
        </View>
    );
}
