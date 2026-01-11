import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { Check } from 'lucide-react-native';

interface ToastProps {
    message: string;
    visible: boolean;
    onHide: () => void;
    duration?: number;
}

export function Toast({ message, visible, onHide, duration = 3000 }: ToastProps) {
    useEffect(() => {
        if (visible) {
            const timer = setTimeout(onHide, duration);
            return () => clearTimeout(timer);
        }
    }, [visible, duration, onHide]);

    if (!visible) return null;

    return (
        <Animated.View
            entering={FadeInDown.springify()}
            exiting={FadeOutDown}
            className="absolute bottom-24 self-center z-50 bg-ink px-4 py-3 rounded-md flex-row items-center shadow-sm"
            style={{ maxWidth: '90%' }}
        >
            <View className="mr-3">
                <Check size={16} color="#FFFFFF" strokeWidth={3} />
            </View>
            <Text className="text-white font-sans text-sm font-medium">
                {message}
            </Text>
        </Animated.View>
    );
}
