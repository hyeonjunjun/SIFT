import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, Easing, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Check } from 'lucide-react-native';

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
                // Persistent: stay at 0 or 100? Let's say 0 but maybe a slow pulse?
                // Just keep it visible.
                progress.value = 0;
            }
        }
    }, [visible, duration, message]);

    if (!visible) return null;

    return (
        <Animated.View
            entering={FadeInDown.duration(300).easing(Easing.inOut(Easing.ease))}
            exiting={FadeOutDown}
            className="absolute bottom-32 self-center bg-ink px-4 py-3 rounded-md flex-row items-center shadow-lg justify-between overflow-hidden"
            style={{ maxWidth: '90%', minWidth: action ? 300 : undefined, elevation: 999, zIndex: 99999 }}
        >
            <View className="flex-row items-center flex-1">
                <View className="mr-3">
                    <Check size={16} color="#FFFFFF" strokeWidth={3} />
                </View>
                <Text className="text-white font-sans text-sm font-medium flex-1">
                    {message}
                </Text>
            </View>

            {(action || secondaryAction) && (
                <View className="ml-4 pl-4 border-l border-white/20 flex-row items-center gap-4">
                    {secondaryAction && (
                        <Text
                            onPress={() => {
                                secondaryAction.onPress();
                                onHide();
                            }}
                            className="text-white/70 font-bold text-sm"
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
                            className="text-white font-bold text-sm"
                        >
                            {action.label}
                        </Text>
                    )}
                </View>
            )}

            {/* Timer Line using absolute positioning */}
            <View className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20 rounded-b-md overflow-hidden">
                <Animated.View
                    style={[{ height: '100%', backgroundColor: 'white' }, animatedStyle]}
                />
            </View>
        </Animated.View>
    );
}
