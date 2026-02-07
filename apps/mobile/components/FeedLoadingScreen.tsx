import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Typography } from './design-system/Typography';
import { useTheme } from '../context/ThemeContext';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withSequence } from 'react-native-reanimated';
import { Sparkle } from 'phosphor-react-native';

interface FeedLoadingScreenProps {
    message?: string;
}

export function FeedLoadingScreen({ message = 'Loading your sifts...' }: FeedLoadingScreenProps) {
    const { colors } = useTheme();
    const scale = useSharedValue(1);
    const rotation = useSharedValue(0);
    const opacity = useSharedValue(0.8);

    React.useEffect(() => {
        // Gentle pulsing animation
        scale.value = withRepeat(
            withTiming(1.15, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
            -1,
            true
        );

        // Slow rotation
        rotation.value = withRepeat(
            withTiming(360, { duration: 4000, easing: Easing.linear }),
            -1,
            false
        );

        // Subtle opacity pulse
        opacity.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            false
        );
    }, []);

    const animatedIconStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { rotate: `${rotation.value}deg` }
        ] as const,
        opacity: opacity.value,
    }));

    return (
        <View style={[styles.container, { backgroundColor: colors.canvas }]}>
            <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
                <Sparkle size={48} color={colors.stone} weight="duotone" />
            </Animated.View>
            <Typography variant="body" style={[styles.message, { color: colors.stone }]}>
                {message}
            </Typography>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
        minHeight: 300,
    },
    iconContainer: {
        marginBottom: 20,
    },
    message: {
        textAlign: 'center',
        fontSize: 16,
        letterSpacing: 0.3,
    },
});
