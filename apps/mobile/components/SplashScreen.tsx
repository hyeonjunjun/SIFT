import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Image } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    Easing,
    withDelay
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Typography } from './design-system/Typography';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
    onFinish?: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
    const containerOpacity = useSharedValue(1);
    const contentOpacity = useSharedValue(0);

    useEffect(() => {
        // 1. Reveal content gently
        contentOpacity.value = withDelay(300, withTiming(1, { duration: 1000, easing: Easing.bezier(0.25, 0.1, 0.25, 1.0) }));

        // 2. Start fade out sequence
        const timeout = setTimeout(() => {
            containerOpacity.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.ease) });
        }, 2200);

        // 3. Finish logic
        const finishTimeout = setTimeout(() => {
            if (onFinish) onFinish();
        }, 2800);

        return () => {
            clearTimeout(timeout);
            clearTimeout(finishTimeout);
        };
    }, []);

    const containerStyle = useAnimatedStyle(() => ({
        opacity: containerOpacity.value
    }));

    const contentStyle = useAnimatedStyle(() => ({
        opacity: contentOpacity.value,
        transform: [{ scale: withTiming(1.02, { duration: 2500 }) }] // Subtle zoom
    }));

    return (
        <Animated.View style={[styles.container, containerStyle]}>
            {/* Direct match to native splash image */}
            <Image
                source={require('../assets/splash-icon.png')}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
            />

            {/* Animated Logo & Tagline (if we want to layer it) */}
            <Animated.View style={[styles.content, contentStyle]}>
                {/* The image already has 'sift' in it, so we can either keep it blank 
                    or overlay a high-quality text layer if we want to animate it. 
                    Given the request for a 'smooth circular gradient', the image handles it best. */}
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FDFCF8',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
