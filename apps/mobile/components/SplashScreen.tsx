import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, ImageBackground } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
    withDelay,
    FadeIn,
    runOnJS
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';

interface SplashScreenProps {
    onFinish?: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
    const { colors, isDark } = useTheme();
    const logoOpacity = useSharedValue(0);
    const logoScale = useSharedValue(0.9);
    const containerOpacity = useSharedValue(1);

    // Shared value for noise to animate in if needed, or just static to match app base
    const noiseOpacity = useSharedValue(isDark ? 0.08 : 0.04);

    useEffect(() => {
        // Logo Animation Sequence: Scale + Fade
        logoOpacity.value = withTiming(1, {
            duration: 1000,
            easing: Easing.bezier(0.33, 1, 0.68, 1)
        });

        logoScale.value = withTiming(1, {
            duration: 1400,
            easing: Easing.out(Easing.back(1.0)) // Muted springiness
        });

        // 3. Exit Sequence
        const exitTimeout = setTimeout(() => {
            containerOpacity.value = withTiming(0, {
                duration: 600,
                easing: Easing.bezier(0.45, 0, 0.55, 1)
            }, (finished) => {
                if (finished && onFinish) {
                    runOnJS(onFinish)();
                }
            });
        }, 2200);

        return () => clearTimeout(exitTimeout);
    }, []);

    const containerStyle = useAnimatedStyle(() => ({
        opacity: containerOpacity.value,
        backgroundColor: colors.canvas,
    }));

    const logoStyle = useAnimatedStyle(() => ({
        opacity: logoOpacity.value,
        transform: [{ scale: logoScale.value }],
    }));

    return (
        <Animated.View style={[StyleSheet.absoluteFill, containerStyle, { zIndex: 9999 }]}>
            {/* 1. Underlying Canvas */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.canvas }]} />

            {/* 2. Tactile Grain Layer */}
            <ImageBackground
                source={require('../assets/noise.png')}
                style={StyleSheet.absoluteFill}
                imageStyle={{ opacity: isDark ? 0.08 : 0.04 }}
                resizeMode="repeat"
            />

            {/* 3. Centered Logo Layer */}
            <View style={styles.center}>
                <Animated.View style={logoStyle}>
                    <Image
                        source={require('../assets/sift-logo.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </Animated.View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        width: 120,
        height: 120,
    }
});

