import React, { useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, ScrollView, Animated as RNAnimated, SafeAreaView, Platform, Image } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Typography } from './design-system/Typography';
import { COLORS, RADIUS } from '../lib/theme';
import { ArrowRight } from 'phosphor-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View as MotiView } from 'moti';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

// Import illustrations
const ILLUSTRATIONS = {
    chaos: require('../assets/illustrations/onboarding_chaos.png'),
    signal: require('../assets/illustrations/onboarding_signal.png'),
    share: require('../assets/illustrations/onboarding_share.png'),
};

interface OnboardingProps {
    onComplete: () => void;
}

const SLIDES = [
    {
        id: 'chaos',
        title: 'Calm the\nchaos.',
        subtitle: 'The digital world is loud.\nSift captures only what resonates.',
        illustration: ILLUSTRATIONS.chaos,
        accentColor: 'rgba(110, 124, 148, 0.12)',
    },
    {
        id: 'sift',
        title: 'Find the\nsignal.',
        subtitle: 'We distill your links and images\ninto clean, actionable gems.',
        illustration: ILLUSTRATIONS.signal,
        accentColor: 'rgba(125, 147, 137, 0.12)',
    },
    {
        id: 'action',
        title: 'Seamlessly\nSift.',
        subtitle: 'Tap Share in any app.\nThat\'s it.',
        illustration: ILLUSTRATIONS.share,
        accentColor: 'rgba(181, 110, 86, 0.10)',
    }
];

export default function Onboarding({ onComplete }: OnboardingProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollX = useRef(new RNAnimated.Value(0)).current;
    const scrollViewRef = useRef<ScrollView>(null);
    const buttonScale = useSharedValue(1);

    const handleScroll = RNAnimated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        { useNativeDriver: false }
    );

    const handleMomentumScrollEnd = (event: any) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / width);
        setActiveIndex(index);
    };

    const scrollToIndex = (index: number) => {
        Haptics.selectionAsync();
        scrollViewRef.current?.scrollTo({ x: index * width, animated: true });
        setActiveIndex(index);
    };

    const finishOnboarding = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            await AsyncStorage.setItem('has_launched', 'true');
            onComplete();
        } catch (e) {
            console.error("Failed to save onboarding state", e);
            onComplete();
        }
    };

    const handleButtonPressIn = () => {
        buttonScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
    };

    const handleButtonPressOut = () => {
        buttonScale.value = withSpring(1, { damping: 15, stiffness: 400 });
    };

    const buttonAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }]
    }));

    const isLastSlide = activeIndex === SLIDES.length - 1;

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#FAF9F6', '#F5F3EE']}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={styles.safeArea}>
                {/* Skip */}
                <View style={styles.skipContainer}>
                    <TouchableOpacity
                        style={styles.skipButton}
                        onPress={finishOnboarding}
                        activeOpacity={0.5}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <Typography variant="caption" color={COLORS.stone} style={styles.skipText}>
                            Skip
                        </Typography>
                    </TouchableOpacity>
                </View>

                {/* Main content */}
                <View style={styles.contentWrapper}>
                    <ScrollView
                        ref={scrollViewRef}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={handleScroll}
                        onMomentumScrollEnd={handleMomentumScrollEnd}
                        scrollEventThrottle={16}
                        decelerationRate="fast"
                    >
                        {SLIDES.map((slide, index) => (
                            <View key={slide.id} style={styles.slide}>
                                {/* Illustration with glow */}
                                <MotiView
                                    from={{ opacity: 0, scale: 0.85 }}
                                    animate={{
                                        opacity: activeIndex === index ? 1 : 0.3,
                                        scale: activeIndex === index ? 1 : 0.85,
                                    }}
                                    transition={{ type: 'timing', duration: 450, easing: Easing.out(Easing.cubic) }}
                                    style={styles.illustrationContainer}
                                >
                                    {/* Soft glow behind illustration */}
                                    <View style={[styles.glowCircle, { backgroundColor: slide.accentColor }]} />

                                    <Image
                                        source={slide.illustration}
                                        style={styles.illustration}
                                        resizeMode="contain"
                                    />
                                </MotiView>

                                {/* Typography */}
                                <MotiView
                                    from={{ opacity: 0, translateY: 20 }}
                                    animate={{
                                        opacity: activeIndex === index ? 1 : 0,
                                        translateY: activeIndex === index ? 0 : 20
                                    }}
                                    transition={{ type: 'timing', duration: 400, delay: 60 }}
                                    style={styles.textStack}
                                >
                                    <Typography variant="h1" style={styles.title}>
                                        {slide.title}
                                    </Typography>
                                    <Typography variant="body" style={styles.subtitle}>
                                        {slide.subtitle}
                                    </Typography>
                                </MotiView>
                            </View>
                        ))}
                    </ScrollView>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    {/* Pagination */}
                    <View style={styles.pagination}>
                        {SLIDES.map((_, i) => {
                            const scale = scrollX.interpolate({
                                inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                                outputRange: [1, 1.4, 1],
                                extrapolate: 'clamp',
                            });
                            const opacity = scrollX.interpolate({
                                inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                                outputRange: [0.25, 1, 0.25],
                                extrapolate: 'clamp',
                            });
                            return (
                                <TouchableOpacity
                                    key={i}
                                    onPress={() => scrollToIndex(i)}
                                    activeOpacity={0.7}
                                    hitSlop={{ top: 16, bottom: 16, left: 8, right: 8 }}
                                >
                                    <RNAnimated.View
                                        style={[styles.dot, { opacity, transform: [{ scale }] }]}
                                    />
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* CTA */}
                    <Animated.View style={[styles.buttonWrapper, buttonAnimatedStyle]}>
                        <TouchableOpacity
                            style={[styles.button, isLastSlide && styles.buttonPrimary]}
                            onPress={isLastSlide ? finishOnboarding : () => scrollToIndex(activeIndex + 1)}
                            onPressIn={handleButtonPressIn}
                            onPressOut={handleButtonPressOut}
                            activeOpacity={1}
                        >
                            <Typography
                                variant="label"
                                style={[styles.buttonText, isLastSlide && styles.buttonTextPrimary]}
                            >
                                {isLastSlide ? 'Get Started' : 'Continue'}
                            </Typography>
                            <ArrowRight
                                size={20}
                                color={isLastSlide ? COLORS.paper : COLORS.ink}
                                weight="bold"
                            />
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.canvas,
    },
    safeArea: {
        flex: 1,
    },
    skipContainer: {
        paddingHorizontal: 24,
        paddingTop: 8,
        alignItems: 'flex-end',
    },
    skipButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    skipText: {
        fontSize: 14,
        fontWeight: '500',
        letterSpacing: 0.2,
    },
    contentWrapper: {
        flex: 1,
        justifyContent: 'center',
    },
    slide: {
        width,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    illustrationContainer: {
        width: 240,
        height: 240,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    glowCircle: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
    },
    illustration: {
        width: 200,
        height: 200,
    },
    textStack: {
        alignItems: 'center',
    },
    title: {
        fontSize: 48,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: -1.5,
        color: COLORS.ink,
        lineHeight: 52,
        marginBottom: 16,
    },
    subtitle: {
        fontSize: 16,
        lineHeight: 24,
        textAlign: 'center',
        color: COLORS.stone,
        fontWeight: '400',
    },
    footer: {
        paddingBottom: Platform.OS === 'ios' ? 50 : 40,
        paddingHorizontal: 32,
        alignItems: 'center',
    },
    pagination: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 28,
        gap: 12,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.ink,
    },
    buttonWrapper: {
        width: '100%',
    },
    button: {
        height: 56,
        borderRadius: RADIUS.pill,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        borderWidth: 1.5,
        borderColor: COLORS.ink,
        backgroundColor: 'transparent',
    },
    buttonPrimary: {
        backgroundColor: COLORS.ink,
        borderColor: COLORS.ink,
    },
    buttonText: {
        fontSize: 17,
        fontWeight: '600',
        letterSpacing: 0.2,
        color: COLORS.ink,
    },
    buttonTextPrimary: {
        color: COLORS.paper,
    },
});
