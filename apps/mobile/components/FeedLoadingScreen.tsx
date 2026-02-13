import React from 'react';
import { View, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { SiftCardSkeleton } from './SiftCardSkeleton';

interface FeedLoadingScreenProps {
    message?: string;
}

export function FeedLoadingScreen({ message = 'Loading your sifts...' }: FeedLoadingScreenProps) {
    const { width } = useWindowDimensions();

    // Replicate grid logic
    const GRID_PADDING = 20;
    const GRID_GAP = 15;
    const isWeb = Platform.OS === 'web';
    const maxAppWidth = isWeb ? 800 : width;
    const effectiveWidth = Math.min(width, maxAppWidth);

    let numColumns = 2;
    if (isWeb && width > 600) numColumns = 3;
    if (isWeb && width > 900) numColumns = 4;

    const columnWidth = (effectiveWidth - (GRID_PADDING * 2) - (GRID_GAP * (numColumns - 1))) / numColumns;

    // Generate 6 skeleton items
    const skeletons = Array(6).fill(0);

    return (
        <View style={styles.container}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20 }}>
                {skeletons.map((_, index) => (
                    <View
                        key={index}
                        style={{
                            width: columnWidth,
                            marginBottom: GRID_GAP,
                            marginRight: (index + 1) % numColumns === 0 ? 0 : GRID_GAP
                        }}
                    >
                        <SiftCardSkeleton />
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
    },
});
