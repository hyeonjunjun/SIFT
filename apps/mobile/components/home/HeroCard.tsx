import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Typography } from '../design-system/Typography';
import { useRouter } from 'expo-router';
import { COLORS, BORDER, Theme } from '../../lib/theme';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

interface HeroCardProps {
    id: string;
    title: string;
    tags?: string[];
    imageUrl?: string;
}

export const HeroCard = React.memo(({ id, title, tags = [], imageUrl }: HeroCardProps) => {
    const router = useRouter();
    const category = tags[0] || 'Uncategorized';
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withTiming(0.97, { duration: 100, easing: Easing.out(Easing.quad) });
    };

    const handlePressOut = () => {
        scale.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.back(1.5)) });
    };

    const handlePress = () => {
        Haptics.selectionAsync();
        router.push(`/page/${id}`);
    };

    return (
        <Animated.View style={animatedStyle}>
            <Pressable
                onPress={handlePress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={styles.container}
            >
                <View style={styles.imageContainer}>
                    {imageUrl ? (
                        <Image
                            source={imageUrl}
                            style={styles.image}
                            contentFit="cover"
                            transition={500}
                        />
                    ) : (
                        <View style={styles.placeholder} />
                    )}
                </View>
                <View style={styles.textContainer}>
                    <Typography variant="label" style={styles.categoryText}>
                        {category.toUpperCase()}
                    </Typography>
                    <Typography style={styles.heroTitle} numberOfLines={2}>
                        {title}
                    </Typography>
                </View>
            </Pressable>
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    container: {
        width: 240, // Slightly smaller than before for cleaner look
        marginRight: 16,
    },
    imageContainer: {
        width: 240,
        height: 140, // 16:9ish
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: BORDER.hairline,
        borderColor: 'rgba(0,0,0,0.08)',
        backgroundColor: '#F2F2F7',
        // Soft Lift Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 4,
        // @ts-ignore
        cornerCurve: 'continuous',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        flex: 1,
        backgroundColor: COLORS.ink,
    },
    textContainer: {
        marginTop: 10,
    },
    categoryText: {
        fontSize: 11,
        color: COLORS.stone, // Secondary Text
        marginBottom: 2,
    },
    heroTitle: {
        color: COLORS.ink,
        fontSize: 15,
        fontWeight: '600',
        lineHeight: 20,
    },
});
