import React, { useEffect } from 'react';
import { Image, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
} from 'react-native-reanimated';

interface CroissantSpinnerProps {
    size?: number;
    speed?: number;
    style?: ViewStyle;
}

export function CroissantSpinner({ size = 48, speed = 2400, style }: CroissantSpinnerProps) {
    const rotation = useSharedValue(0);

    useEffect(() => {
        rotation.value = withRepeat(
            withTiming(360, { duration: speed, easing: Easing.inOut(Easing.ease) }),
            -1,
            false
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }] as any,
    }));

    return (
        <Animated.View style={[{ width: size, height: size }, animatedStyle, style]}>
            <Image
                source={require('../../assets/sift-icon-transparent.png')}
                style={{ width: size, height: size }}
                resizeMode="contain"
            />
        </Animated.View>
    );
}
