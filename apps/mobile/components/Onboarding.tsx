import React, { useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, ScrollView, Animated as RNAnimated, SafeAreaView, Platform } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    Easing,
} from 'react-native-reanimated';
import { Typography } from './design-system/Typography';
import { COLORS, RADIUS, Theme } from '../lib/theme';
import { ArrowRight, CircleDashed, CirclesThree, ShareNetwork } from 'phosphor-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View as MotiView } from 'moti';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');


interface OnboardingProps {
    onComplete: () => void;
}

const SLIDES = [
    {
        id: 'chaos',
        title: 'Calm the\nchaos.',
        subtitle: 'The digital world is loud.\nSift captures only what resonates.',
        icon: 'CircleDashed',
        accentColor: COLORS.ink,
    },
    {
        id: 'sift',
        title: 'Find the\nsignal.',
        subtitle: 'We distill your links and images\ninto clean, actionable gems.',
        icon: 'CirclesThree',
        accentColor: COLORS.ink,
    },
    {
        id: 'action',
        title: 'Seamlessly\nSift.',
        subtitle: 'Tap Share in any app.\nThat\'s it.',
        icon: 'ShareNetwork',
        accentColor: COLORS.ink,
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
            <View
                style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.canvas }]}
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
                                <MotiView
                                    from={{ opacity: 0, scale: 0.9 }}
                                    animate={{
                                        opacity: activeIndex === index ? 1 : 0,
                                        scale: activeIndex === index ? 1 : 0.9,
                                    }}
                                    transition={{ type: 'timing', duration: 400, easing: Easing.out(Easing.quad) }}
                                    style={styles.illustrationContainer}
                                >
                                    {/* Minimalist Icon View */}
                                    <View style={styles.iconCircle}>
                                        {slide.icon === 'CircleDashed' && <CircleDashed size={80} color={COLORS.ink} weight="light" />}
                                        {slide.icon === 'CirclesThree' && <CirclesThree size={80} color={COLORS.ink} weight="light" />}
                                        {slide.icon === 'ShareNetwork' && <ShareNetwork size={80} color={COLORS.ink} weight="light" />}
                                    </View>
                                </MotiView>

                                {/* Typography with enhanced animations */}
                                <View style={styles.textStack}>
                                    <MotiView
                                        from={{ opacity: 0, translateY: 30 }}
                                        animate={{
                                            opacity: activeIndex === index ? 1 : 0,
                                            translateY: activeIndex === index ? 0 : 30
                                        }}
                                        transition={{ type: 'timing', duration: 500, delay: 100, easing: Easing.out(Easing.cubic) }}
                                    >
                                        <Typography variant="h1" style={styles.title}>
                                            {slide.title}
                                        </Typography>
                                    </MotiView>

                                    <MotiView
                                        from={{ opacity: 0, translateY: 20 }}
                                        animate={{
                                            opacity: activeIndex === index ? 1 : 0,
                                            translateY: activeIndex === index ? 0 : 20
                                        }}
                                        transition={{ type: 'timing', duration: 500, delay: 200, easing: Easing.out(Easing.cubic) }}
                                    >
                                        <Typography variant="body" style={styles.subtitle}>
                                            {slide.subtitle}
                                        </Typography>
                                    </MotiView>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    {/* Pagination */}
                    <View style={styles.pagination}>
                        {SLIDES.map((_, i) => (
                            <TouchableOpacity
                                key={i}
                                onPress={() => scrollToIndex(i)}
                                activeOpacity={0.7}
                            >
                                <View
                                    style={[
                                        styles.dot,
                                        {
                                            opacity: activeIndex === i ? 1 : 0.2,
                                            width: activeIndex === i ? 16 : 6,
                                        }
                                    ]}
                                />
                            </TouchableOpacity>
                        ))}
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
    iconCircle: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: COLORS.paper,
        alignItems: 'center',
        justifyContent: 'center',
        ...Theme.shadows.soft,
    },
    glowCircle: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
    },
    gradientCircle: {
        width: 200,
        height: 200,
        borderRadius: 100,
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
