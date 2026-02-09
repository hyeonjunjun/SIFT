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
    onTogglePin?: (id: string) => void;
}

const HeroCardComponent = ({ id, title, tags = [], imageUrl, isPinned, onTogglePin }: HeroCardProps) => {
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

    const handlePinPress = (e: any) => {
        e.stopPropagation();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onTogglePin?.(id);
    };

    return (
        <Animated.View style={[animatedStyle, styles.outerContainer]}>
            <Pressable
                onPress={handlePress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={styles.container}
            >
                <View style={[styles.imageContainer, { backgroundColor: colors.subtle }]}>
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

                    <Pressable
                        onPress={handlePinPress}
                        hitSlop={12}
                        style={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            backgroundColor: isPinned ? colors.paper : 'rgba(255,255,255,0.85)',
                            padding: 6,
                            borderRadius: RADIUS.pill,
                            ...Theme.shadows.sharp
                        }}
                    >
                        <PinIcon
                            size={12}
                            color={isPinned ? colors.ink : 'rgba(0,0,0,0.5)'}
                            weight={isPinned ? "fill" : "regular"}
                        />
                    </Pressable>
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
    outerContainer: {
        width: 240,
        marginRight: 16,
    },
    container: {
        width: '100%',
    },
    imageContainer: {
        width: '100%',
        height: 140,
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
    },
    textContainer: {
        marginTop: 10,
        paddingHorizontal: 2, // Minor breathing room
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
        minHeight: 40, // Ensure space for 2 lines to prevent cut-off issues
    },
});
