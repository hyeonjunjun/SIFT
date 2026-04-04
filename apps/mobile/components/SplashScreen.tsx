import React, { useEffect } from 'react';
import { View, StyleSheet, Image, ImageBackground } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    withRepeat,
    Easing,
    runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { Typography } from './design-system/Typography';

interface SplashScreenProps {
    onFinish?: () => void;
}

const EASE = Easing.bezier(0.4, 0, 0.2, 1);

export default function SplashScreen({ onFinish }: SplashScreenProps) {
    const { colors, isDark } = useTheme();

    const iconOpacity = useSharedValue(0);
    const iconScale = useSharedValue(0.92);
    const iconRotation = useSharedValue(0);
    const textOpacity = useSharedValue(0);
    const textY = useSharedValue(8);
    const containerOpacity = useSharedValue(1);

    useEffect(() => {
        // 1. Icon fades in and scales up
        iconOpacity.value = withTiming(1, { duration: 600, easing: EASE });
        iconScale.value = withTiming(1, { duration: 700, easing: EASE });

        // 2. Continuous gentle rotation
        iconRotation.value = withRepeat(
            withTiming(360, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
            -1, // infinite
            false
        );

        // 3. "sift" text fades in (600ms delay)
        textOpacity.value = withDelay(600, withTiming(1, { duration: 500, easing: EASE }));
        textY.value = withDelay(600, withTiming(0, { duration: 500, easing: EASE }));

        // 4. Hold, then fade out
        const exitTimeout = setTimeout(() => {
            containerOpacity.value = withTiming(0, {
                duration: 350,
                easing: EASE,
            }, (finished) => {
                if (onFinish) runOnJS(onFinish)();
            });
        }, 2200);

        return () => clearTimeout(exitTimeout);
    }, []);

    const containerStyle = useAnimatedStyle(() => ({
        opacity: containerOpacity.value,
    }));

    const iconStyle = useAnimatedStyle(() => ({
        opacity: iconOpacity.value,
        transform: [
            { scale: iconScale.value },
            { rotate: `${iconRotation.value}deg` },
        ],
    }));

    const textStyle = useAnimatedStyle(() => ({
        opacity: textOpacity.value,
        transform: [{ translateY: textY.value }],
    }));

    return (
        <Animated.View style={[StyleSheet.absoluteFill, containerStyle, { zIndex: 9999 }]}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.canvas }]} />

            <ImageBackground
                source={require('../assets/noise.png')}
                style={StyleSheet.absoluteFill}
                imageStyle={{ opacity: isDark ? 0.08 : 0.04 }}
                resizeMode="repeat"
            />

            <View style={styles.center}>
                <Animated.View style={iconStyle}>
                    <Image
                        source={require('../assets/sift-icon-transparent.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </Animated.View>

                <Animated.View style={[styles.textContainer, textStyle]}>
                    <Typography variant="h1" style={[styles.brandText, { color: colors.ink }]}>
                        sift
                    </Typography>
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
    },
    textContainer: {
        marginTop: 16,
    },
    brandText: {
        fontSize: 32,
        letterSpacing: 3,
        textTransform: 'lowercase',
    },
});
