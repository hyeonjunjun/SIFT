import React, { useEffect } from 'react';
import { Text, View, StyleSheet, Dimensions, Platform } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, Easing, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Check, WarningCircle } from 'phosphor-react-native';
import { COLORS, BORDER, RADIUS, Theme, SPACING } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ToastProps {
    message: string;
    visible: boolean;
    onHide: () => void;
    duration?: number;
    type?: 'success' | 'error';
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

export function Toast({ message, visible, onHide, duration = 3000, type = 'success', action, secondaryAction, bottomOffset }: ToastProps) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const progress = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            width: `${progress.value}%`,
        };
    });

    const onHideRef = React.useRef(onHide);
    React.useEffect(() => {
        onHideRef.current = onHide;
    }, [onHide]);

    useEffect(() => {
        if (visible) {
            progress.value = 0;
            const time = duration === 0 ? 0 : duration;

            if (time > 0) {
                progress.value = withTiming(100, { duration: time, easing: Easing.linear });
                const timer = setTimeout(() => {
                    onHideRef.current();
                }, time);
                return () => clearTimeout(timer);
            } else {
                progress.value = 0;
            }
        }
    }, [visible, duration, message]);

    if (!visible) return null;

    return (
        <Animated.View
            entering={FadeInDown.duration(400).easing(Easing.out(Easing.cubic))}
            exiting={FadeOutDown.duration(300)}
            style={[
                styles.container,
                styles.shadow,
                {
                    backgroundColor: colors.paper,
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.separator,
                    shadowColor: "#000",
                    bottom: bottomOffset !== undefined ? bottomOffset : (Platform.OS === 'ios' ? 90 : 70 + insets.bottom) + 24,
                }
            ]}
        >
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    {type === 'success' ? (
                        <Check size={16} color={colors.ink} weight="bold" />
                    ) : (
                        <WarningCircle size={16} color={colors.danger} weight="bold" />
                    )}
                </View>
                <Text style={[
                    styles.message,
                    { color: colors.ink },
                    type === 'error' && { color: colors.danger }
                ]}>
                    {message}
                </Text>
            </View>

            {(action || secondaryAction) && (
                <View style={[styles.actions, { borderLeftColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E5E5' }]}>
                    {secondaryAction && (
                        <Text
                            onPress={() => {
                                secondaryAction.onPress();
                                onHide();
                            }}
                            style={[styles.secondaryAction, { color: colors.stone }]}
                        >
                            {secondaryAction.label}
                        </Text>
                    )}
                    {action && (
                        <Text
                            onPress={() => {
                                action.onPress();
                                onHide();
                            }}
                            style={[styles.primaryAction, { color: colors.ink }]}
                        >
                            {action.label}
                        </Text>
                    )}
                </View>
            )}

            {/* Timer Line - Subtle at bottom */}
            {duration > 0 && (
                <View style={styles.progressContainer}>
                    <Animated.View
                        style={[styles.progressBar, animatedStyle, { backgroundColor: colors.ink }]}
                    />
                </View>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        alignSelf: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: RADIUS.pill,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        marginHorizontal: 20,
        maxWidth: 450,
        minWidth: 240,
        zIndex: 99999,
        ...Theme.shadows.medium,
    },
    shadow: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        marginRight: 10,
    },
    message: {
        color: COLORS.ink,
        fontFamily: 'InstrumentSerif_400Regular',
        fontSize: 20,
        flex: 1,
        includeFontPadding: false,
        letterSpacing: 0.2,
    },
    actions: {
        marginLeft: 12,
        paddingLeft: 16,
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(0,0,0,0.05)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    secondaryAction: {
        color: COLORS.stone,
        fontWeight: '600',
        fontSize: 13,
        fontFamily: 'System',
    },
    primaryAction: {
        color: COLORS.ink,
        fontWeight: '700',
        fontSize: 13,
        fontFamily: 'System',
    },
    progressContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    progressBar: {
        height: '100%',
        backgroundColor: COLORS.ink, // Dark progress bar
        opacity: 0.8,
    }
});
