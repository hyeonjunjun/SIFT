import React, { useEffect } from 'react';
import { ViewStyle, DimensionValue } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    Easing
} from 'react-native-reanimated';

interface Props {
    width?: DimensionValue;
    height?: DimensionValue;
    style?: ViewStyle;
    borderRadius?: number;
}

export function ShimmerSkeleton({ width = '100%', height = 20, style, borderRadius = 4 }: Props) {
    const opacity = useSharedValue(0.3);

    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(0.3, { duration: 0 }), // Start low
                withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.ease) }), // Fade in
                withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) })  // Fade out
            ),
            -1, // Infinite repeat
            true // Reverse
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    backgroundColor: '#E5E5EA', // System Gray 5 (Subtle)
                    borderRadius,
                },
                animatedStyle,
                style,
            ]}
        />
    );
}
