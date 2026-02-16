import React, { useRef, useState } from 'react';
import { View, StyleSheet, useWindowDimensions, TouchableOpacity, ScrollView, Animated as RNAnimated, SafeAreaView, Platform, ImageBackground } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { Typography } from './design-system/Typography';
import { COLORS, RADIUS, Theme } from '../lib/theme';
import { ArrowRight, Star, Heart, PushPin } from 'phosphor-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View as MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface OnboardingProps {
    onComplete: () => void;
}

const SLIDES = [
    {
        id: 'mindful',
        title: 'Mindful\nCuration',
        subtitle: 'The internet is overwhelming.\nSift helps you keep what matters.',
        gradient: ['#FDFBF7', '#E8E2D8', '#D3CAB8'] as const,
        icon: Star,
        accentColor: COLORS.ink,
    },
    {
        id: 'signal',
        title: 'Find the\nSignal',
        subtitle: 'We distill noise into clarity.\nEvery link becomes a keepsake.',
        gradient: ['#F5F0E6', '#E0D6C2', '#C2B59B'] as const,
        icon: PushPin,
        accentColor: COLORS.ink,
    },
    {
        id: 'share',
        title: 'Share the\nVibe',
        subtitle: 'Connect with friends.\nBuild a library together.',
        gradient: ['#EBE5D9', '#D1C4B0', '#B0A18E'] as const,
        icon: Heart,
        accentColor: COLORS.ink,
    }
];

export default function Onboarding({ onComplete }: OnboardingProps) {
    const { width, height } = useWindowDimensions();
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollX = useRef(new RNAnimated.Value(0)).current;
    const scrollViewRef = useRef<ScrollView>(null);
    const buttonScale = useSharedValue(1);

    // Dynamic sizing for responsiveness
    const illustrationHeight = Math.min(320, height * 0.35);
    const titleSize = Math.min(56, width * 0.12);

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
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.container}>
            <ImageBackground
                source={require('../assets/noise.png')}
                style={[StyleSheet.absoluteFill, { opacity: 0.03, zIndex: -1 }]}
                resizeMode="repeat"
            />
            <View
                style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.canvas, zIndex: -2 }]}
            />

            <View style={[styles.safeArea, { paddingTop: insets.top }]}>
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
                        {SLIDES.map((slide, index) => {
                            const Icon = slide.icon;
                            return (
                                <View key={slide.id} style={[styles.slide, { width }]}>
                                    <MotiView
                                        from={{ opacity: 0, scale: 0.9, rotate: '-5deg' }}
                                        animate={{
                                            opacity: activeIndex === index ? 1 : 0,
                                            scale: activeIndex === index ? 1 : 0.9,
                                            rotate: activeIndex === index ? '0deg' : '-5deg',
                                        }}
                                        transition={{ type: 'spring', damping: 12 }}
                                        style={[styles.illustrationContainer, { height: illustrationHeight }]}
                                    >
                                        {/* Gradient Card */}
                                        <LinearGradient
                                            colors={slide.gradient}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={styles.gradientCard}
                                        >
                                            {/* Subtle internal shine/border */}
                                            <View style={styles.cardBorder} />

                                            {/* Central Icon/Graphic */}
                                            <MotiView
                                                from={{ scale: 0, opacity: 0 }}
                                                animate={{
                                                    scale: activeIndex === index ? 1 : 0,
                                                    opacity: activeIndex === index ? 1 : 0
                                                }}
                                                transition={{ delay: 200, type: 'spring' }}
                                            >
                                                <Icon size={64} color={COLORS.ink} weight="light" />
                                            </MotiView>
                                        </LinearGradient>
                                    </MotiView>

                                    {/* Typography with enhanced animations */}
                                    <View style={styles.textStack}>
                                        <MotiView
                                            from={{ opacity: 0, translateY: 30 }}
                                            animate={{
                                                opacity: activeIndex === index ? 1 : 0,
                                                translateY: activeIndex === index ? 0 : 30
                                            }}
                                            transition={{ type: 'spring', damping: 15, delay: 100 }}
                                        >
                                            <Typography variant="h1" style={[styles.title, { fontSize: titleSize, lineHeight: titleSize * 1.1 }]}>
                                                {slide.title}
                                            </Typography>
                                        </MotiView>

                                        <MotiView
                                            from={{ opacity: 0, translateY: 20 }}
                                            animate={{
                                                opacity: activeIndex === index ? 1 : 0,
                                                translateY: activeIndex === index ? 0 : 20
                                            }}
                                            transition={{ type: 'spring', damping: 15, delay: 200 }}
                                        >
                                            <Typography variant="body" style={styles.subtitle}>
                                                {slide.subtitle}
                                            </Typography>
                                        </MotiView>
                                    </View>
                                </View>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Footer */}
                <View style={[styles.footer, { paddingBottom: Math.max(32, insets.bottom + 24) }]}>
                    {/* Pagination */}
                    <View style={styles.pagination}>
                        {SLIDES.map((_, i) => (
                            <TouchableOpacity
                                key={i}
                                onPress={() => scrollToIndex(i)}
                                activeOpacity={0.7}
                            >
                                <Animated.View
                                    style={[
                                        styles.dot,
                                        {
                                            opacity: activeIndex === i ? 1 : 0.3,
                                            width: activeIndex === i ? 24 : 8,
                                            backgroundColor: activeIndex === i ? COLORS.ink : COLORS.stone
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
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    skipContainer: {
        paddingHorizontal: 24,
        paddingTop: 8,
        alignItems: 'flex-end',
        zIndex: 10,
    },
    skipButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: 20,
    },
    skipText: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    contentWrapper: {
        flex: 1,
        justifyContent: 'center',
    },
    slide: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    illustrationContainer: {
        width: '100%',
        maxWidth: 320,
        // height set dynamically
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 20,
        },
        shadowOpacity: 0.1,
        shadowRadius: 24,
        elevation: 10,
    },
    gradientCard: {
        width: '100%',
        height: '100%',
        borderRadius: RADIUS.xl, // Increased radius for softer look
        alignItems: 'center',
        justifyContent: 'center',
        borderCurve: 'continuous', // iOS smooth corners
    },
    cardBorder: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    textStack: {
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    title: {
        // fontSize set dynamically
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: -1.5,
        color: COLORS.ink,
        marginBottom: 16,
        fontFamily: 'PlayfairDisplay_700Bold',
    },
    subtitle: {
        fontSize: 17,
        lineHeight: 26,
        textAlign: 'center',
        color: COLORS.stone,
        fontWeight: '400',
        opacity: 0.8,
    },
    footer: {
        paddingHorizontal: 32,
        alignItems: 'center',
    },
    pagination: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
        gap: 8,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        // width and color animated
    },
    buttonWrapper: {
        width: '100%',
        maxWidth: 400,
    },
    button: {
        height: 64, // Taller button
        borderRadius: RADIUS.pill,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: COLORS.ink,
        backgroundColor: 'transparent',
    },
    buttonPrimary: {
        backgroundColor: COLORS.ink,
        borderColor: COLORS.ink,
        shadowColor: COLORS.ink,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6,
    },
    buttonText: {
        fontSize: 18,
        fontWeight: '600',
        letterSpacing: 0.5,
        color: COLORS.ink,
    },
    buttonTextPrimary: {
        color: COLORS.paper,
    },
});
