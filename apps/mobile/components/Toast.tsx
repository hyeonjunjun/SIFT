import React, { useEffect } from 'react';
import { Text, View, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, Easing, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Check } from 'phosphor-react-native';
import { COLORS, BORDER, RADIUS } from '../lib/theme';

interface ToastProps {
    message: string;
    visible: boolean;
    onHide: () => void;
    duration?: number;
    action?: {
        label: string;
        onPress: () => void;
    };
    secondaryAction?: {
        label: string;
        onPress: () => void;
    };
}

export function Toast({ message, visible, onHide, duration = 3000, action, secondaryAction }: ToastProps) {
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
            style={[styles.container, styles.shadow]}
        >
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Check size={16} color={COLORS.ink} weight="regular" />
                </View>
                <Text style={styles.message}>
                    {message}
                </Text>
            </View>

            {(action || secondaryAction) && (
                <View style={styles.actions}>
                    {secondaryAction && (
                        <Text
                            onPress={() => {
                                secondaryAction.onPress();
                                onHide();
                            }}
                            style={styles.secondaryAction}
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
                            style={styles.primaryAction}
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
                        style={[styles.progressBar, animatedStyle]}
                    />
                </View>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 100, // Elevated position
        alignSelf: 'center',
        backgroundColor: COLORS.canvas, // Oatmeal #FDFCF8
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8, // Tight corners
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#E5E5E5',
        marginHorizontal: 20,
        maxWidth: 400, // Prevent full width on tablet
        minWidth: 300,
        zIndex: 99999,
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
        color: COLORS.ink, // #1C1C1E
        fontFamily: 'PlayfairDisplay', // Serif
        fontSize: 14,
        flex: 1,
        includeFontPadding: false,
    },
    actions: {
        marginLeft: 16,
        paddingLeft: 16,
        borderLeftWidth: 1,
        borderLeftColor: '#E5E5E5',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
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
