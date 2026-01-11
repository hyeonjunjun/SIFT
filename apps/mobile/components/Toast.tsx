import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, Easing } from 'react-native-reanimated';
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
}

export function Toast({ message, visible, onHide, duration = 3000, action }: ToastProps) {
    useEffect(() => {
        if (visible) {
            const time = action ? 6000 : duration; // Longer duration if there's an action
            const timer = setTimeout(onHide, time);
            return () => clearTimeout(timer);
        }
    }, [visible, duration, onHide, action]);

    if (!visible) return null;

    return (
        <Animated.View
            entering={FadeInDown.duration(300).easing(Easing.inOut(Easing.ease))}
            exiting={FadeOutDown}
            className="absolute bottom-32 self-center z-50 bg-ink px-4 py-3 rounded-md flex-row items-center shadow-md justify-between"
            style={{ maxWidth: '90%', minWidth: action ? 300 : undefined }}
        >
            <View className="flex-row items-center flex-1">
                <View className="mr-3">
                    <Check size={16} color="#FFFFFF" strokeWidth={3} />
                </View>
                <Text className="text-white font-sans text-sm font-medium flex-1">
                    {message}
                </Text>
            </View>

            {action && (
                <View className="ml-4 pl-4 border-l border-white/20">
                    <Text
                        onPress={() => {
                            action.onPress();
                            onHide();
                        }}
                        className="text-white font-bold text-sm"
                    >
                        {action.label}
                    </Text>
                </View>
            )}
        </Animated.View>
    );
}
