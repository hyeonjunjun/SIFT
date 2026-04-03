import React, { useEffect } from 'react';
import { View, StyleSheet, Image, ImageBackground } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    withDelay,
    withSequence,
    Easing,
    runOnJS,
    interpolate,
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { Typography } from './design-system/Typography';

interface SplashScreenProps {
    onFinish?: () => void;
}

// Animated sugar particle
function SugarParticle({ delay, x, size, duration }: { delay: number; x: number; size: number; duration: number }) {
    const { colors, isDark } = useTheme();
    const progress = useSharedValue(0);
    const opacity = useSharedValue(0);

    useEffect(() => {
        opacity.value = withDelay(delay, withSequence(
            withTiming(0.8, { duration: duration * 0.3 }),
            withTiming(0.3, { duration: duration * 0.4 }),
            withTiming(0, { duration: duration * 0.3 }),
        ));
        progress.value = withDelay(delay, withTiming(1, {
            duration,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        }));
    }, []);

    const style = useAnimatedStyle(() => ({
        position: 'absolute' as const,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(180,150,120,0.4)',
        left: x,
        top: interpolate(progress.value, [0, 1], [-5, 55]),
        opacity: opacity.value,
    }));

    return <Animated.View style={style} />;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
    const { colors, isDark } = useTheme();

    // Animation values
    const sifterY = useSharedValue(-80);
    const sifterOpacity = useSharedValue(0);
    const textOpacity = useSharedValue(0);
    const textY = useSharedValue(10);
    const containerOpacity = useSharedValue(1);
    const wholeScale = useSharedValue(1);

    useEffect(() => {
        // 1. Sifter drops in from top with spring bounce (0ms)
        sifterOpacity.value = withTiming(1, { duration: 400 });
        sifterY.value = withSpring(0, {
            damping: 12,
            stiffness: 100,
            mass: 0.8,
        });

        // 2. "sift" text fades in (800ms delay)
        textOpacity.value = withDelay(800, withTiming(1, {
            duration: 500,
            easing: Easing.out(Easing.ease),
        }));
        textY.value = withDelay(800, withTiming(0, {
            duration: 500,
            easing: Easing.out(Easing.ease),
        }));

        // 3. Exit: scale up + fade out (1800ms)
        const exitTimeout = setTimeout(() => {
            wholeScale.value = withTiming(1.1, {
                duration: 400,
                easing: Easing.bezier(0.4, 0, 0.2, 1),
            });
            containerOpacity.value = withTiming(0, {
                duration: 400,
                easing: Easing.bezier(0.4, 0, 0.2, 1),
            }, (finished) => {
                if (onFinish) runOnJS(onFinish)();
            });
        }, 1800);

        return () => clearTimeout(exitTimeout);
    }, []);

    const containerStyle = useAnimatedStyle(() => ({
        opacity: containerOpacity.value,
        transform: [{ scale: wholeScale.value }],
    }));

    const sifterStyle = useAnimatedStyle(() => ({
        opacity: sifterOpacity.value,
        transform: [{ translateY: sifterY.value }],
    }));

    const textStyle = useAnimatedStyle(() => ({
        opacity: textOpacity.value,
        transform: [{ translateY: textY.value }],
    }));

    // Generate sugar particles
    const particles = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        delay: 500 + i * 80,
        x: 30 + Math.random() * 60,
        size: 2 + Math.random() * 3,
        duration: 600 + Math.random() * 400,
    }));

    return (
        <Animated.View style={[StyleSheet.absoluteFill, containerStyle, { zIndex: 9999 }]}>
            {/* Canvas */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.canvas }]} />

            {/* Grain texture */}
            <ImageBackground
                source={require('../assets/noise.png')}
                style={StyleSheet.absoluteFill}
                imageStyle={{ opacity: isDark ? 0.08 : 0.04 }}
                resizeMode="repeat"
            />

            {/* Centered content */}
            <View style={styles.center}>
                <View style={styles.iconContainer}>
                    {/* Sifter (top half of icon) */}
                    <Animated.View style={sifterStyle}>
                        <View style={styles.sifterArea}>
                            <Image
                                source={require('../assets/sift-icon.png')}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        </View>
                    </Animated.View>

                    {/* Sugar particles falling between sifter and croissant */}
                    <View style={styles.particleContainer}>
                        {particles.map(p => (
                            <SugarParticle key={p.id} delay={p.delay} x={p.x} size={p.size} duration={p.duration} />
                        ))}
                    </View>
                </View>

                {/* Brand text */}
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
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    sifterArea: {
        alignItems: 'center',
    },
    logo: {
        width: 140,
        height: 140,
    },
    particleContainer: {
        position: 'absolute',
        bottom: -10,
        width: 120,
        height: 60,
        overflow: 'hidden',
    },
    textContainer: {
        marginTop: 20,
    },
    brandText: {
        fontSize: 36,
        letterSpacing: 4,
        textTransform: 'lowercase',
    },
});
