import React from 'react';
import { View, StyleSheet, TouchableOpacity, ImageBackground, Platform } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    FadeIn,
} from 'react-native-reanimated';
import { Typography } from './design-system/Typography';
import { COLORS, RADIUS, Theme } from '../lib/theme';
import { ArrowRight } from 'phosphor-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface OnboardingProps {
    onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
    const insets = useSafeAreaInsets();
    const buttonScale = useSharedValue(1);

    const finishOnboarding = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            await AsyncStorage.setItem('has_launched', 'true');
            onComplete();
        } catch (e) {
            onComplete();
        }
    };

    const handlePressIn = () => {
        buttonScale.value = withTiming(0.96, { duration: 120 });
    };
    const handlePressOut = () => {
        buttonScale.value = withTiming(1, { duration: 120 });
    };

    const buttonAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }],
    }));

    return (
        <View style={styles.container}>
            <ImageBackground
                source={require('../assets/noise.png')}
                style={[StyleSheet.absoluteFill, { opacity: 0.03, zIndex: -1 }]}
                resizeMode="repeat"
            />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.canvas, zIndex: -2 }]} />

            <View style={[styles.content, { paddingTop: insets.top + 60, paddingBottom: Math.max(40, insets.bottom + 24) }]}>
                {/* Logo */}
                <Animated.View entering={FadeIn.delay(200).duration(600)} style={styles.logoArea}>
                    <Typography variant="h1" style={styles.logo}>sift</Typography>
                </Animated.View>

                {/* Tagline */}
                <Animated.View entering={FadeIn.delay(500).duration(600)} style={styles.taglineArea}>
                    <Typography variant="h2" style={styles.headline}>
                        The internet is noisy.{'\n'}Keep what matters.
                    </Typography>
                    <Typography variant="body" style={styles.subline}>
                        Save links, recipes, articles, and videos — distilled into a beautiful, personal library.
                    </Typography>
                </Animated.View>

                {/* Features */}
                <Animated.View entering={FadeIn.delay(800).duration(600)} style={styles.features}>
                    <FeatureRow label="AI-powered summaries for any link" />
                    <FeatureRow label="Smart recipe tools with cook mode" />
                    <FeatureRow label="Share collections with friends" />
                </Animated.View>

                {/* CTA */}
                <View style={{ flex: 1 }} />
                <Animated.View entering={FadeIn.delay(1100).duration(600)} style={[styles.ctaArea, buttonAnimStyle]}>
                    <TouchableOpacity
                        style={styles.ctaButton}
                        onPress={finishOnboarding}
                        onPressIn={handlePressIn}
                        onPressOut={handlePressOut}
                        activeOpacity={1}
                    >
                        <Typography variant="label" style={styles.ctaText}>Get Started</Typography>
                        <ArrowRight size={20} color={COLORS.paper} weight="bold" />
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </View>
    );
}

function FeatureRow({ label }: { label: string }) {
    return (
        <View style={styles.featureRow}>
            <View style={styles.featureBullet} />
            <Typography variant="body" style={styles.featureText}>{label}</Typography>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 36,
    },
    logoArea: {
        alignItems: 'center',
        marginBottom: 48,
    },
    logo: {
        fontSize: 80,
        fontFamily: 'InstrumentSerif_400Regular',
        fontWeight: '400',
        letterSpacing: -1,
        color: COLORS.ink,
        lineHeight: 96,
    },
    taglineArea: {
        marginBottom: 40,
    },
    headline: {
        fontSize: 28,
        fontFamily: 'PlayfairDisplay_700Bold',
        color: COLORS.ink,
        lineHeight: 38,
        marginBottom: 16,
        letterSpacing: -0.5,
    },
    subline: {
        fontSize: 16,
        lineHeight: 24,
        color: COLORS.stone,
        fontFamily: 'Satoshi-Regular',
    },
    features: {
        gap: 16,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    featureBullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.accent,
    },
    featureText: {
        fontSize: 15,
        color: COLORS.ink,
        fontFamily: 'Satoshi-Medium',
        flex: 1,
    },
    ctaArea: {
        width: '100%',
    },
    ctaButton: {
        height: 64,
        borderRadius: RADIUS.pill,
        backgroundColor: COLORS.ink,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        ...Theme.shadows.soft,
        ...(Platform.OS === 'android' ? { elevation: 4 } : {}),
    },
    ctaText: {
        fontSize: 18,
        fontWeight: '600',
        letterSpacing: 0.5,
        color: COLORS.paper,
    },
});
