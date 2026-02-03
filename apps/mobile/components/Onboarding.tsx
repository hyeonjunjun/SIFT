import React, { useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, ScrollView, Animated as RNAnimated, SafeAreaView, Platform } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    withRepeat,
    withSequence,
    Easing
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Typography } from './design-system/Typography';
import { COLORS, RADIUS, Theme } from '../lib/theme';
import { router } from 'expo-router';
import { ShareNetwork, Funnel, CheckCircle, CaretRight, X } from 'phosphor-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const VISUAL_SIZE = isWeb ? Math.min(width * 0.4, 400) : 250;

interface OnboardingProps {
    onComplete: () => void;
}

const SLIDES = [
    {
        id: 'chaos',
        title: 'Too much noise.',
        subtitle: 'The internet is overwhelming. Save only what matters.',
    },
    {
        id: 'sift',
        title: 'Find the signal.',
        subtitle: 'We organize your chaos into glowing gems of insight.',
    },
    {
        id: 'action',
        title: 'Just tap Share.',
        subtitle: 'Sift works seamlessly from any app.',
    }
];

export default function Onboarding({ onComplete }: OnboardingProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollX = useRef(new RNAnimated.Value(0)).current;
    const scrollViewRef = useRef<ScrollView>(null);

    const handleScroll = RNAnimated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        { useNativeDriver: false }
    );

    const handleMomentumScrollEnd = (event: any) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / width);
        setActiveIndex(index);
    };

    const scrollToIndex = (index: number) => {
        scrollViewRef.current?.scrollTo({ x: index * width, animated: true });
        setActiveIndex(index);
    };

    const finishOnboarding = async () => {
        try {
            await AsyncStorage.setItem('has_launched', 'true');
            onComplete();
        } catch (e) {
            console.error("Failed to save onboarding state", e);
            onComplete(); // proceed anyway
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Skip Button */}
            <TouchableOpacity
                style={styles.skipButton}
                onPress={finishOnboarding}
                activeOpacity={0.7}
            >
                <Typography variant="caption" style={{ color: COLORS.stone }}>Skip</Typography>
            </TouchableOpacity>

            <View style={{ flex: 3 }}>
                <ScrollView
                    ref={scrollViewRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleScroll}
                    onMomentumScrollEnd={handleMomentumScrollEnd}
                    scrollEventThrottle={16}
                >
                    {SLIDES.map((slide, index) => (
                        <View key={slide.id} style={{ width, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                            {/* Visual Placeholder Area */}
                            <View style={styles.visualContainer}>
                                {index === 0 && <ChaosVisual isActive={activeIndex === 0} />}
                                {index === 1 && <SiftVisual isActive={activeIndex === 1} />}
                                {index === 2 && <ActionVisual isActive={activeIndex === 2} />}
                            </View>

                            <Typography variant="h1" style={{ textAlign: 'center', marginTop: 32, marginBottom: 8 }}>
                                {slide.title}
                            </Typography>
                            <Typography variant="body" style={{ textAlign: 'center', color: COLORS.stone, paddingHorizontal: 32 }}>
                                {slide.subtitle}
                            </Typography>
                        </View>
                    ))}
                </ScrollView>
            </View>

            {/* Pagination & Controls */}
            <View style={styles.footer}>
                <View style={styles.pagination}>
                    {SLIDES.map((_, i) => {
                        const opacity = scrollX.interpolate({
                            inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                            outputRange: [0.3, 1, 0.3],
                            extrapolate: 'clamp',
                        });
                        return (
                            <TouchableOpacity key={i} onPress={() => scrollToIndex(i)} activeOpacity={0.7}>
                                <RNAnimated.View
                                    style={[styles.dot, { opacity, backgroundColor: COLORS.ink }]}
                                />
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <View style={styles.buttonContainer}>
                    {activeIndex === SLIDES.length - 1 ? (
                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: COLORS.accent }]}
                            onPress={finishOnboarding}
                            activeOpacity={0.8}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Typography variant="h3" style={{ color: COLORS.paper, fontWeight: '700', marginRight: 8 }}>Get Started</Typography>
                                <CheckCircle size={20} color={COLORS.paper} weight="bold" />
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.separator }]}
                            onPress={() => scrollToIndex(activeIndex + 1)}
                            activeOpacity={0.7}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Typography variant="h3" style={{ color: COLORS.ink, fontWeight: '600', marginRight: 8 }}>Next</Typography>
                                <CaretRight size={20} color={COLORS.ink} weight="bold" />
                            </View>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
}

// Custom Gentle Curve: Cubic Bezier (0.25, 0.1, 0.25, 1.0) - standard "ease" but smoother
const GENTLE_EASING = Easing.bezier(0.25, 0.1, 0.25, 1.0);

function ChaosVisual({ isActive }: { isActive: boolean }) {
    // Random abstract shapes
    return (
        <View style={styles.visualInner}>
            {/* Shapes simulating noise/chaos - using Theme colors */}
            <AnimatedShape delay={0} x={-40} y={-30} size={40} color={COLORS.stone} />
            <AnimatedShape delay={200} x={40} y={20} size={60} color={COLORS.subtle} />
            <AnimatedShape delay={400} x={-20} y={50} size={30} color={COLORS.accent} />
            <AnimatedShape delay={600} x={30} y={-40} size={50} color="#34C759" />
        </View>
    );
}

function AnimatedShape({ delay, x, y, size, color }: { delay: number; x: number; y: number; size: number; color: string }) {
    const sv = useSharedValue(0);
    React.useEffect(() => {
        sv.value = withDelay(delay, withRepeat(
            withSequence(
                withTiming(1, { duration: 1500, easing: GENTLE_EASING }),
                withTiming(0, { duration: 1500, easing: GENTLE_EASING })
            ), -1, true
        ));
    }, []);

    const style = useAnimatedStyle(() => {
        return {
            transform: [
                { translateX: x },
                { translateY: y },
                { scale: sv.value }
            ],
            opacity: sv.value
        } as any;
    });

    return <Animated.View style={[style, { position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color }]} />;
}

function SiftVisual({ isActive }: { isActive: boolean }) {
    // Chaos funneling into a gem
    const gemScale = useSharedValue(0);

    React.useEffect(() => {
        if (isActive) {
            // Easing instead of Spring
            gemScale.value = withTiming(1, { duration: 800, easing: GENTLE_EASING });
        } else {
            gemScale.value = withTiming(0, { duration: 500 });
        }
    }, [isActive]);

    const gemStyle = useAnimatedStyle(() => ({
        transform: [{ scale: gemScale.value }]
    }));

    return (
        <View style={styles.visualInner}>
            <Funnel size={60} color={COLORS.stone} style={{ marginBottom: 20 }} />
            <Animated.View style={[gemStyle, styles.gem]}>
                <CheckCircle size={50} color={COLORS.paper} />
            </Animated.View>
        </View>
    );
}

function ActionVisual({ isActive }: { isActive: boolean }) {
    const tapScale = useSharedValue(1);

    React.useEffect(() => {
        if (isActive) {
            tapScale.value = withRepeat(
                withSequence(
                    withTiming(0.9, { duration: 500, easing: GENTLE_EASING }),
                    withTiming(1, { duration: 500, easing: GENTLE_EASING })
                ),
                -1, true
            );
        } else {
            tapScale.value = 1;
        }
    }, [isActive]);

    const tapStyle = useAnimatedStyle(() => ({
        transform: [{ scale: tapScale.value }]
    }));

    return (
        <View style={styles.visualInner}>
            <View style={styles.mockPhone}>
                <ShareNetwork size={30} color={COLORS.accent} />
            </View>
            <Animated.View style={[tapStyle, styles.fingerTap]} />
            <Typography variant="caption" style={{ color: COLORS.stone, marginTop: 16 }}>
                Tap 'Share' in any app
            </Typography>
        </View>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.canvas,
    },
    footer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 40,
    },
    skipButton: {
        position: 'absolute',
        top: 60,
        right: 30,
        zIndex: 10,
        padding: 10,
    },
    buttonContainer: {
        height: 60,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    visualContainer: {
        width: VISUAL_SIZE,
        height: VISUAL_SIZE,
        borderRadius: RADIUS.l,
        backgroundColor: COLORS.paper,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
        ...Theme.shadows.soft,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.separator,
    },
    visualInner: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    pagination: {
        flexDirection: 'row',
        height: 40,
        alignItems: 'center',
        marginBottom: 20,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginHorizontal: 5,
    },
    button: {
        paddingVertical: 16,
        paddingHorizontal: 48,
        borderRadius: RADIUS.pill,
        ...Theme.shadows.medium,
    },
    gem: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: COLORS.accent,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.accent,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
    },
    mockPhone: {
        width: 140,
        height: 80,
        borderRadius: RADIUS.l,
        borderWidth: 2,
        borderColor: COLORS.subtle,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    fingerTap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(88, 86, 214, 0.2)', // Primary color very light
        position: 'absolute',
        top: 80,
    }
});
