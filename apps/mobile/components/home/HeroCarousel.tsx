import React, { useRef } from 'react';
import { View, FlatList, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Typography } from '../design-system/Typography';
import { HeroCard } from './HeroCard';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.75; // Used for snap logic, but Card handles its own width

interface HeroCarouselProps {
    pages: any[];
}

export function HeroCarousel({ pages }: HeroCarouselProps) {
    const recentPages = pages.slice(0, 5); // Start with top 5
    const lastIndex = useRef(0);

    if (recentPages.length === 0) return null;

    const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const currentIndex = Math.round(contentOffsetX / (280 + 16));

        if (currentIndex !== lastIndex.current) {
            Haptics.selectionAsync();
            lastIndex.current = currentIndex;
        }
    };

    return (
        <View className="mb-6">
            <Typography variant="h3" className="px-5 mb-3 text-ink">Recently Sifted</Typography>
            <FlatList
                data={recentPages}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={280 + 16} // Card Width (280) + Margin (16)
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
                    />
                )}
                keyExtractor={(item) => item.id}
            />
        </View>
    );
}
