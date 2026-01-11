import React from 'react';
import { View, Pressable, Image, Platform, ActionSheetIOS, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Typography } from './design-system/Typography';
import { Card } from './design-system/Card';
import { Pin } from 'lucide-react-native';
import { Theme } from '../lib/theme';

interface GridPageCardProps {
    id: string;
    title: string;
    url?: string;
    imageUrl?: string;
    index: number;
    onDelete?: (id: string) => void;
    onPin?: (id: string) => void;
    isPinned?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GridPageCard({ id, title, url, imageUrl, index, onDelete, onPin, isPinned }: GridPageCardProps) {
    const router = useRouter();
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    // Domain cleaning
    const domain = url ? new URL(url).hostname.replace('www.', '') : '';

    const handlePressIn = () => {
        scale.value = withSpring(0.97, { damping: 10, stiffness: 300 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 10, stiffness: 300 });
    };

    const handlePress = () => {
        router.push(`/page/${id}`);
    };

    const handleLongPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        const pinAction = isPinned ? 'Unpin Page' : 'Pin to Top';

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Cancel', pinAction, 'Copy Link', 'Delete Page'],
                    destructiveButtonIndex: 3,
                    cancelButtonIndex: 0,
                    userInterfaceStyle: 'light',
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) { // Pin/Unpin
                        onPin?.(id);
                    } else if (buttonIndex === 2) { // Copy Link
                        if (url) Clipboard.setStringAsync(url);
                    } else if (buttonIndex === 3) { // Delete
                        onDelete?.(id);
                    }
                }
            );
        } else {
            Alert.alert(
                "Options",
                title,
                [
                    { text: pinAction, onPress: () => onPin?.(id) },
                    { text: "Copy Link", onPress: () => url && Clipboard.setStringAsync(url) },
                    { text: "Delete", style: 'destructive', onPress: () => onDelete?.(id) },
                    { text: "Cancel", style: "cancel" }
                ]
            );
        }
    };

    // Staggered height logic could go here, but for now we'll just let the image aspect ratio drive it
    // Or we can force random aspect ratios for the "Pinterest" effect if images are uniform squares.
    // For now, let's allow dynamic image heights but set a base minimum.
    // Actually, to simulate masonry with unknown aspect ratios, we often just let `Image` resize,
    // but React Native images need size. 
    // Let's stick to a fixed width (handled by the column) and a variable height based on a prop or random.
    // Since we don't have aspect ratio data, we'll randomize strictly for the demo "vibe".
    // In production, we'd save aspect ratio meta.

    // Deterministic random height based on index to keep it stable
    const aspectRatios = [1, 1.3, 0.8, 1.4, 1.1]; // varying heights
    const aspectRatio = aspectRatios[index % aspectRatios.length];

    return (
        <AnimatedPressable
            onPress={handlePress}
            onLongPress={handleLongPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[animatedStyle, { marginBottom: 12 }]} // Spacing between items
        >
            <Card className="p-0 overflow-hidden break-inside-avoid relative">
                {/* Pin Indicator */}
                {isPinned && (
                    <View className="absolute top-2 right-2 z-10 bg-white/90 p-1.5 rounded-full shadow-sm">
                        <Pin size={10} color={Theme.colors.text.primary} fill={Theme.colors.text.primary} />
                    </View>
                )}

                <View style={{ aspectRatio }}>
                    {imageUrl ? (
                        <Image
                            source={{ uri: imageUrl }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                        />
                    ) : (
                        <View className="w-full h-full bg-slate-200 justify-center items-center">
                            <Typography variant="h3" className="text-slate-300">S</Typography>
                        </View>
                    )}
                </View>

                <View className="p-3">
                    <Typography variant="body" className="text-ink font-bold leading-5 mb-1 text-[13px]">
                        {title}
                    </Typography>
                    {domain ? (
                        <Typography variant="caption" className="text-ink-secondary text-[10px] font-medium opacity-60">
                            {domain}
                        </Typography>
                    ) : null}
                </View>
            </Card>
        </AnimatedPressable>
    );
}
