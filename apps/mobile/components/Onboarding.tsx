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
import { View as MotiView } from 'moti';

const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const VISUAL_SIZE = isWeb ? Math.min(width * 0.4, 400) : 250;

interface OnboardingProps {
    onComplete: () => void;
}

const SLIDES = [
    {
        id: 'chaos',
        title: 'Calm the chaos.',
        subtitle: 'The digital world is loud. Sift helps you capture only what truly resonates.',
    },
    {
        id: 'sift',
        title: 'Find the signal.',
        subtitle: 'We distill your links and images into clean, actionable gems of insight.',
    },
    {
        id: 'action',
        title: 'Seamlessly Sift.',
        subtitle: 'Just tap the Share button in any app to save to your library.',
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
            onComplete();
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.skipContainer}>
                <TouchableOpacity
                    style={styles.skipButton}
                    onPress={finishOnboarding}
                    activeOpacity={0.7}
                >
                    <Typography variant="label" color={COLORS.stone}>Skip</Typography>
                </TouchableOpacity>
            </View>

            <View style={{ flex: 4 }}>
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
                        <View key={slide.id} style={{ width, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                            <MotiView
                                from={{ opacity: 0, scale: 0.9, translateY: 20 }}
                                animate={{
                                    opacity: activeIndex === index ? 1 : 0,
                                    scale: activeIndex === index ? 1 : 0.9,
                                    translateY: activeIndex === index ? 0 : 20
                                }}
                                transition={{ type: 'timing', duration: 800 }}
                                style={styles.visualContainer}
                            >
                                {index === 0 && <ChaosVisual isActive={activeIndex === 0} />}
                                {index === 1 && <SiftVisual isActive={activeIndex === 1} />}
                                {index === 2 && <ActionVisual isActive={activeIndex === 2} />}
                            </MotiView>

                            <View style={styles.textStack}>
                                <Typography variant="h1" style={{ textAlign: 'center', marginBottom: 12, fontSize: 36 }}>
                                    {slide.title}
                                </Typography>
                                <Typography variant="body" style={{ textAlign: 'center', color: COLORS.stone, lineHeight: 24 }}>
                                    {slide.subtitle}
                                </Typography>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            </View>

            <View style={styles.footer}>
                <View style={styles.pagination}>
                    {SLIDES.map((_, i) => {
                        const widthAnim = scrollX.interpolate({
                            inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                            outputRange: [8, 24, 8],
                            extrapolate: 'clamp',
                        });
                        const opacity = scrollX.interpolate({
                            inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                            outputRange: [0.3, 1, 0.3],
                            extrapolate: 'clamp',
                        });
                        return (
                            <TouchableOpacity key={i} onPress={() => scrollToIndex(i)} activeOpacity={0.7}>
                                <RNAnimated.View
                                    style={[styles.dot, { opacity, width: widthAnim, backgroundColor: COLORS.ink }]}
                                />
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <View style={styles.buttonContainer}>
                    {activeIndex === SLIDES.length - 1 ? (
                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: COLORS.ink }]}
                            onPress={finishOnboarding}
                            activeOpacity={0.9}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Typography variant="label" style={{ color: COLORS.paper, marginRight: 8 }}>GET STARTED</Typography>
                                <CheckCircle size={18} color={COLORS.paper} weight="bold" />
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: COLORS.subtle }]}
                            onPress={() => scrollToIndex(activeIndex + 1)}
                            activeOpacity={0.8}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Typography variant="label" color={COLORS.ink} style={{ marginRight: 8 }}>CONTINUE</Typography>
                                <CaretRight size={18} color={COLORS.ink} weight="bold" />
                            </View>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
}

const GENTLE_EASING = Easing.bezier(0.25, 0.1, 0.25, 1.0);

function ChaosVisual({ isActive }: { isActive: boolean }) {
    return (
        <View style={styles.visualInner}>
            <AnimatedShape delay={0} x={-50} y={-40} size={50} color={COLORS.stone} opacity={0.2} />
            <AnimatedShape delay={200} x={50} y={30} size={70} color={COLORS.subtle} opacity={0.4} />
            <AnimatedShape delay={400} x={-30} y={60} size={40} color={COLORS.ink} opacity={0.1} />
            <AnimatedShape delay={600} x={40} y={-50} size={60} color={COLORS.separator} opacity={0.6} />
            <ShareNetwork size={60} color={COLORS.ink} weight="thin" />
        </View>
    );
}

function AnimatedShape({ delay, x, y, size, color, opacity }: { delay: number; x: number; y: number; size: number; color: string; opacity?: number }) {
    const sv = useSharedValue(0);
    React.useEffect(() => {
        sv.value = withDelay(delay, withRepeat(
            withSequence(
                withTiming(1, { duration: 2500, easing: GENTLE_EASING }),
                withTiming(0, { duration: 2500, easing: GENTLE_EASING })
            ), -1, true
        ));
    }, []);

    const style = useAnimatedStyle(() => ({
        transform: [
            { translateX: x },
            { translateY: y },
            { scale: 0.8 + sv.value * 0.4 }
        ] as any,
        opacity: (opacity || 0.3) * sv.value
    }));

    return <Animated.View style={[style, { position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color }]} />;
}

function SiftVisual({ isActive }: { isActive: boolean }) {
    const gemScale = useSharedValue(0);

    React.useEffect(() => {
        if (isActive) {
            gemScale.value = withTiming(1, { duration: 1000, easing: GENTLE_EASING });
        } else {
            gemScale.value = withTiming(0, { duration: 500 });
        }
    }, [isActive]);

    const gemStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: gemScale.value },
            { rotate: `${gemScale.value * 15}deg` }
        ] as any,
        opacity: gemScale.value
    }));

    return (
        <View style={styles.visualInner}>
            <View style={{ opacity: 0.1, transform: [{ scale: 1.5 }] }}>
                <Funnel size={100} color={COLORS.ink} weight="thin" />
            </View>
            <Animated.View style={[gemStyle, styles.gem]}>
                <CheckCircle size={40} color={COLORS.paper} weight="bold" />
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
                    withTiming(0.95, { duration: 800, easing: GENTLE_EASING }),
                    withTiming(1, { duration: 800, easing: GENTLE_EASING })
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
            <Animated.View style={[tapStyle, styles.mockPhone]}>
                <LinearGradient
                    colors={[COLORS.paper, COLORS.canvas]}
                    style={StyleSheet.absoluteFill}
                />
                <ShareNetwork size={32} color={COLORS.ink} weight="regular" />
            </Animated.View>
            <Typography variant="label" color={COLORS.stone} style={{ marginTop: 20 }}>
                TAP SHARE ANYWHERE
            </Typography>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.canvas,
    },
    skipContainer: {
        paddingHorizontal: 30,
        paddingTop: 20,
        alignItems: 'flex-end',
    },
    skipButton: {
        padding: 10,
    },
    footer: {
        flex: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 60,
    },
    textStack: {
        marginTop: 40,
        paddingHorizontal: 40,
        alignItems: 'center',
    },
    buttonContainer: {
        height: 80,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    visualContainer: {
        width: VISUAL_SIZE,
        height: VISUAL_SIZE,
        borderRadius: 40,
        backgroundColor: COLORS.paper,
        alignItems: 'center',
        justifyContent: 'center',
        ...Theme.shadows.medium,
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
        height: 20,
        alignItems: 'center',
        marginBottom: 30,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },
    button: {
        height: 56,
        paddingHorizontal: 40,
        borderRadius: RADIUS.pill,
        justifyContent: 'center',
        alignItems: 'center',
        ...Theme.shadows.medium,
    },
    gem: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: COLORS.ink,
        alignItems: 'center',
        justifyContent: 'center',
        ...Theme.shadows.medium,
        position: 'absolute',
    },
    mockPhone: {
        width: 160,
        height: 90,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.separator,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        ...Theme.shadows.soft,
    }
});
