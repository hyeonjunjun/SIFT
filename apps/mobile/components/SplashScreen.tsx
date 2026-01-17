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
import { BlurView } from 'expo-blur';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

interface SplashScreenProps {
    onFinish?: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
    const logoOpacity = useSharedValue(0);
    const logoScale = useSharedValue(0.9);
    const containerOpacity = useSharedValue(1);
    const noiseOpacity = useSharedValue(0);

    const [isFinished, setIsFinished] = useState(false);

    useEffect(() => {
        // 1. Fade in Noise Texture
        noiseOpacity.value = withTiming(0.04, { duration: 800 });

        // 2. Logo Animation Sequence: Scale + Fade
        logoOpacity.value = withDelay(200, withTiming(1, {
            duration: 800,
            easing: Easing.bezier(0.33, 1, 0.68, 1)
        }));

        logoScale.value = withDelay(200, withTiming(1, {
            duration: 1200,
            easing: Easing.out(Easing.back(1.5))
        }));

        // 3. Exit Sequence
        const exitTimeout = setTimeout(() => {
            containerOpacity.value = withTiming(0, {
                duration: 500,
                easing: Easing.bezier(0.45, 0, 0.55, 1)
            }, (finished) => {
                if (finished && onFinish) {
                    runOnJS(onFinish)();
                }
            });
        }, 1800);

        return () => clearTimeout(exitTimeout);
    }, []);

    const containerStyle = useAnimatedStyle(() => ({
        opacity: containerOpacity.value,
        backgroundColor: '#FDFCF8',
    }));

    const logoStyle = useAnimatedStyle(() => ({
        opacity: logoOpacity.value,
        transform: [{ scale: logoScale.value }],
    }));

    return (
        <Animated.View style={[StyleSheet.absoluteFill, containerStyle, { zIndex: 9999 }]}>
            {/* 1. Underlying Porcelain Canvas */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FDFCF8' }]} />

            {/* 2. Tactile Grain Layer */}
            <Animated.Image
                source={require('../assets/noise.png')}
                style={[StyleSheet.absoluteFill, { opacity: 0.04 }]}
                resizeMode="repeat"
            />

            {/* 3. Centered Logo Layer */}
            <View style={styles.center}>
                <Animated.View style={logoStyle}>
                    <Image
                        source={require('../assets/sift-white.png')}
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

