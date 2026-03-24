import React, { useEffect } from 'react';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, Easing, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Check, WarningCircle, Info } from 'phosphor-react-native';
import { RADIUS, SPACING, Theme } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ToastProps {
    message: string;
    visible: boolean;
    onHide: () => void;
    duration?: number;
    type?: 'success' | 'error' | 'info';
    action?: {
        label: string;
        onPress: () => void;
    };
    secondaryAction?: {
        label: string;
        onPress: () => void;
    };
    bottomOffset?: number;
}

export function Toast({ message, visible, onHide, duration = 3000, type = 'success', action, secondaryAction }: ToastProps) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const progress = useSharedValue(0);

    const animatedProgress = useAnimatedStyle(() => ({
        width: `${progress.value}%`,
    }));

    const onHideRef = React.useRef(onHide);
    React.useEffect(() => {
        onHideRef.current = onHide;
    }, [onHide]);

    useEffect(() => {
        if (visible) {
            progress.value = 0;
            if (duration > 0) {
                progress.value = withTiming(100, { duration, easing: Easing.linear });
                const timer = setTimeout(() => onHideRef.current(), duration);
                return () => clearTimeout(timer);
            }
        }
    }, [visible, duration, message]);

    if (!visible) return null;

    // Inverted colors — dark toast on light bg, light toast on dark bg
    const bg = isDark ? colors.paper : colors.ink;
    const fg = isDark ? colors.ink : colors.paper;
    const fgMuted = isDark ? colors.stone : 'rgba(253, 252, 248, 0.6)';
    const tintBg = isDark ? colors.subtle : 'rgba(253, 252, 248, 0.12)';
    const trackBg = isDark ? colors.separator : 'rgba(253, 252, 248, 0.08)';
    const barBg = isDark ? colors.accent : 'rgba(253, 252, 248, 0.3)';

    const iconColor = type === 'error' ? colors.danger : type === 'info' ? colors.accent : colors.success;
    const Icon = type === 'error' ? WarningCircle : type === 'info' ? Info : Check;

    return (
        <Animated.View
            entering={FadeInUp.duration(350).easing(Easing.out(Easing.cubic))}
            exiting={FadeOutUp.duration(250)}
            style={[
                styles.container,
                {
                    backgroundColor: bg,
                    top: insets.top + SPACING.s,
                }
            ]}
        >
            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: tintBg }]}>
                <Icon size={16} color={isDark ? iconColor : fg} weight="bold" />
            </View>

            {/* Message */}
            <Text style={[styles.message, { color: fg }]} numberOfLines={2}>
                {message}
            </Text>

            {/* Actions */}
            {(action || secondaryAction) && (
                <View style={styles.actions}>
                    {secondaryAction && (
                        <TouchableOpacity
                            onPress={() => { secondaryAction.onPress(); onHide(); }}
                            hitSlop={8}
                        >
                            <Text style={[styles.actionText, { color: fgMuted }]}>
                                {secondaryAction.label}
                            </Text>
                        </TouchableOpacity>
                    )}
                    {action && (
                        <TouchableOpacity
                            onPress={() => { action.onPress(); onHide(); }}
                            style={[styles.actionButton, { backgroundColor: tintBg }]}
                            hitSlop={8}
                        >
                            <Text style={[styles.actionText, { color: fg, fontWeight: '700' }]}>
                                {action.label}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Progress bar */}
            {duration > 0 && (
                <View style={[styles.progressTrack, { backgroundColor: trackBg }]}>
                    <Animated.View style={[styles.progressBar, animatedProgress, { backgroundColor: barBg }]} />
                </View>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: SPACING.m,
        right: SPACING.m,
        alignSelf: 'center',
        maxWidth: 420,
        borderRadius: RADIUS.s,
        paddingTop: SPACING.s + 6,
        paddingBottom: SPACING.s + 6,
        paddingHorizontal: SPACING.m,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
        zIndex: 99999,
        ...Theme.shadows.medium,
        shadowOpacity: 0.15,
        elevation: 8,
    },
    iconContainer: {
        width: 28,
        height: 28,
        borderRadius: RADIUS.pill,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.s + 2,
    },
    message: {
        fontFamily: 'Satoshi-Medium',
        fontSize: 14,
        lineHeight: 19,
        flex: 1,
        letterSpacing: 0.1,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.s,
        marginLeft: SPACING.s + 2,
    },
    actionText: {
        fontFamily: 'Satoshi-Medium',
        fontSize: 13,
        fontWeight: '600',
    },
    actionButton: {
        paddingHorizontal: SPACING.m - 4,
        paddingVertical: SPACING.s - 2,
        borderRadius: RADIUS.s,
    },
    progressTrack: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 2,
    },
    progressBar: {
        height: '100%',
    },
});
