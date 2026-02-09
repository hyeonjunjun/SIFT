import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Typography } from '../design-system/Typography';
import { useRouter } from 'expo-router';
import { COLORS, BORDER, RADIUS, Theme } from '../../lib/theme';
import { useTheme } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import PinIcon from '../PinIcon';

interface HeroCardProps {
    id: string;
    title: string;
    tags?: string[];
    imageUrl?: string;
    isPinned?: boolean;
}

const HeroCardComponent = ({ id, title, tags = [], imageUrl, isPinned }: HeroCardProps) => {
    const { colors } = useTheme();
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
                style={[
                    styles.container,
                    {
                        backgroundColor: colors.paper,
                        ...Theme.shadows.soft
                    }
                ]}
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
                        <View style={[styles.placeholder, { backgroundColor: colors.subtle }]} />
                    )}

                    {isPinned && (
                        <View style={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            backgroundColor: colors.paper,
                            padding: 6,
                            borderRadius: RADIUS.pill,
                            ...Theme.shadows.sharp
                        }}>
                            <PinIcon size={12} color={colors.ink} weight="fill" />
                        </View>
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
};

export const HeroCard = React.memo(HeroCardComponent);

const styles = StyleSheet.create({
    container: {
        width: 240,
        marginRight: 16,
        borderRadius: RADIUS.m,
        overflow: 'hidden',
    },
    imageContainer: {
        width: 240,
        height: 140, // 16:9ish
        borderRadius: RADIUS.m,
        overflow: 'hidden',
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
        color: COLORS.stone,
        marginBottom: 2,
    },
    heroTitle: {
        color: COLORS.ink,
        fontSize: 15,
        fontWeight: '600',
        lineHeight: 20,
    },
});
