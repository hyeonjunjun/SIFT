import React from 'react';
import { Pressable, Text, PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { Theme, TRANSITIONS } from '../../lib/theme';
import { cn } from '../../lib/utils'; // Assuming utils exists, if not I will inline or create it. I should check.

// Basic cn utility replacement if not exists
function classNames(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ');
}

type ButtonVariant = 'primary' | 'ghost' | 'outline';

interface ButtonProps extends PressableProps {
    variant?: ButtonVariant;
    label: string;
    icon?: React.ReactNode;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({ variant = 'primary', label, icon, className, ...props }: ButtonProps) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
        };
    });

    const handlePressIn = () => {
        scale.value = withTiming(0.98, {
            duration: TRANSITIONS.short,
            easing: Easing.inOut(Easing.ease),
        });
    };

    const handlePressOut = () => {
        scale.value = withTiming(1, {
            duration: TRANSITIONS.short,
            easing: Easing.inOut(Easing.ease),
        });
    };

    const getVariantStyles = () => {
        switch (variant) {
            case 'primary':
                return 'bg-ink text-canvas-card'; // Dark background, white text
            case 'ghost':
                return 'bg-transparent text-ink active:bg-canvas-subtle'; // Transparent, dark text
            case 'outline':
                return 'bg-transparent border border-border text-ink';
            default:
                return 'bg-ink text-canvas-card';
        }
    };

    const getTextVariantStyles = () => {
        switch (variant) {
            case 'primary': return 'text-white';
            default: return 'text-ink';
        }
    }

    return (
        <AnimatedPressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            className={classNames(
                'flex-row items-center justify-center px-6 py-4 rounded-full',
                getVariantStyles(),
                className
            )}
            {...props}
        >
            {icon && <React.Fragment>{icon}<Text className="w-2" /></React.Fragment>}
            <Text className={classNames("font-semibold text-[17px] tracking-tight", getTextVariantStyles())}>
                {label}
            </Text>
        </AnimatedPressable>
    );
}
