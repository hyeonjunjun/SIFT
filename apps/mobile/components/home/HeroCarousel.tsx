import React from 'react';
import { View, FlatList, Dimensions } from 'react-native';
import { Typography } from '../design-system/Typography';
import { HeroCard } from './HeroCard';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.75; // Used for snap logic, but Card handles its own width

interface HeroCarouselProps {
    pages: any[];
}

export function HeroCarousel({ pages }: HeroCarouselProps) {
    const recentPages = pages.slice(0, 5); // Start with top 5

    if (recentPages.length === 0) return null;

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
