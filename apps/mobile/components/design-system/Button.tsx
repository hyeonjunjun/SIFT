import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { Typography } from './Typography';
import { COLORS, SPACING, RADIUS, TRANSITIONS, OVERLAYS } from '../../lib/theme';
import { useTheme } from '../../context/ThemeContext';

type ButtonVariant = 'primary' | 'ghost' | 'outline';

interface ButtonProps {
    variant?: ButtonVariant;
    label: string;
    icon?: React.ReactNode;
    disabled?: boolean;
    style?: ViewStyle | ViewStyle[];
    onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({ variant = 'primary', label, icon, disabled, style, onPress, ...props }: ButtonProps) {
    const { colors, isDark } = useTheme();
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withTiming(0.97, {
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

    const getVariantStyle = (): ViewStyle => {
        switch (variant) {
            case 'primary':
                return {
                    backgroundColor: disabled ? colors.subtle : colors.ink,
                };
            case 'ghost':
                return {
                    backgroundColor: 'transparent',
                };
            case 'outline':
                return {
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    borderColor: colors.separator,
                };
            default:
                return { backgroundColor: colors.ink };
        }
    };

    const getTextColor = () => {
        if (disabled) return colors.stone;
        switch (variant) {
            case 'primary': return colors.paper;
            default: return colors.ink;
        }
    };

    return (
        <AnimatedPressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={onPress}
            disabled={disabled}
            style={[
                styles.base,
                getVariantStyle(),
                animatedStyle,
                style,
            ]}
            {...props}
        >
            {icon && <>{icon}</>}
            <Typography
                variant="body"
                weight="600"
                style={[
                    styles.label,
                    { color: getTextColor() },
                    icon ? { marginLeft: SPACING.s } : undefined,
                ]}
            >
                {label}
            </Typography>
        </AnimatedPressable>
    );
}

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.l,
        paddingVertical: SPACING.m,
        borderRadius: RADIUS.pill,
    },
    label: {
        fontSize: 17,
        letterSpacing: -0.2,
    },
});
