import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeOut, SlideInDown } from 'react-native-reanimated';
import { Typography } from './design-system/Typography';
import { COLORS, RADIUS, SPACING } from '../lib/theme';
import { ArrowRight, X } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';

const TOUR_KEY = 'sift_tour_completed';

interface TourStep {
    title: string;
    description: string;
    position: 'top' | 'center' | 'bottom';
}

const TOUR_STEPS: TourStep[] = [
    {
        title: '👋 Welcome to SIFT',
        description: 'Paste any URL above to get an AI-powered summary in seconds.',
        position: 'top',
    },
    {
        title: '📚 Your Library',
        description: 'Swipe to the Library tab to organize saved sifts into collections.',
        position: 'center',
    },
    {
        title: '👥 Social Tab',
        description: 'Connect with friends and share your favorite sifts.',
        position: 'bottom',
    },
];

export function FirstUseTour() {
    const [step, setStep] = useState(0);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(TOUR_KEY).then(val => {
            if (!val) setVisible(true);
        });
    }, []);

    const handleNext = () => {
        Haptics.selectionAsync();
        if (step < TOUR_STEPS.length - 1) {
            setStep(step + 1);
        } else {
            handleDismiss();
        }
    };

    const handleDismiss = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setVisible(false);
        AsyncStorage.setItem(TOUR_KEY, 'true');
    };

    if (!visible) return null;

    const currentStep = TOUR_STEPS[step];
    const isLast = step === TOUR_STEPS.length - 1;

    const positionStyle =
        currentStep.position === 'top' ? { top: 120 } :
            currentStep.position === 'bottom' ? { bottom: 120 } :
                { top: Dimensions.get('window').height / 2 - 80 };

    return (
        <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
            style={styles.overlay}
            pointerEvents="box-none"
        >
            <Animated.View
                entering={SlideInDown.springify().damping(15)}
                style={[styles.card, positionStyle]}
            >
                <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
                    <X size={18} color={COLORS.stone} />
                </TouchableOpacity>

                <Typography variant="h3" style={styles.title}>
                    {currentStep.title}
                </Typography>
                <Typography variant="body" color="stone" style={styles.description}>
                    {currentStep.description}
                </Typography>

                <View style={styles.footer}>
                    <View style={styles.dots}>
                        {TOUR_STEPS.map((_, i) => (
                            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
                        ))}
                    </View>
                    <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                        <Typography variant="label" style={styles.nextText}>
                            {isLast ? 'Get Started' : 'Next'}
                        </Typography>
                        {!isLast && <ArrowRight size={14} color="#FFFFFF" />}
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
    },
    card: {
        position: 'absolute',
        left: 24,
        right: 24,
        backgroundColor: COLORS.canvas,
        borderRadius: RADIUS.xl,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 10,
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        padding: 4,
    },
    title: {
        marginBottom: 8,
    },
    description: {
        lineHeight: 22,
        marginBottom: 20,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dots: {
        flexDirection: 'row',
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.separator,
    },
    dotActive: {
        backgroundColor: COLORS.accent,
        width: 18,
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: COLORS.ink,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: RADIUS.pill,
    },
    nextText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 12,
    },
});
