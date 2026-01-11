import React, { useState } from 'react';
import { View, Pressable, Image, Platform, ActionSheetIOS, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { Typography } from './design-system/Typography';
import { Card } from './design-system/Card';
import { Pin } from 'lucide-react-native';
import { Theme } from '../lib/theme';
import { PeekModal } from './PeekModal';

interface GridPageCardProps {
    id: string;
    title: string;
    url?: string;
    imageUrl?: string;
    index: number;
    onDelete?: (id: string) => void;
    onDeleteForever?: (id: string) => void;
    onPin?: (id: string) => void;
    isPinned?: boolean;
    createdAt?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GridPageCard({ id, title, url, imageUrl, index, onDelete, onDeleteForever, onPin, isPinned, createdAt }: GridPageCardProps) {
    const router = useRouter();
    const scale = useSharedValue(1);
    const [peekVisible, setPeekVisible] = useState(false);

    // Dust Gathering Logic (30 days)
    const isDusty = createdAt ? (new Date().getTime() - new Date(createdAt).getTime()) > (30 * 24 * 60 * 60 * 1000) : false;
    const opacity = isDusty ? 0.6 : 1;

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: withTiming(opacity, { duration: 300, easing: Easing.inOut(Easing.ease) })
    }));

    // Domain cleaning
    const domain = url ? new URL(url).hostname.replace('www.', '') : '';

    const handlePressIn = () => {
        scale.value = withTiming(0.97, { duration: 150, easing: Easing.inOut(Easing.ease) });
    };

    const handlePressOut = () => {
        scale.value = withTiming(1, { duration: 150, easing: Easing.inOut(Easing.ease) });
    };

    const handlePress = () => {
        router.push(`/page/${id}`);
    };

    const handleLongPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setPeekVisible(true);
    };

    // Options Menu (triggered from Peek or separate button?)
    // For now, let's keep the ActionSheet logic inside a function we can pass to PeekModal if we wanted, 
    // or just leave PeekModal as a visual preview that leads to the page. 
    // The user requirement said: "Long pressing... pops up preview... Commit opens".
    // We will stick to that. If they want to delete/archive, they can do it from inside the page 
    // OR we can add an "Options" button to the PeekModal later.

    // Deterministic random height based on index to keep it stable
    const aspectRatios = [1, 1.3, 0.8, 1.4, 1.1]; // varying heights
    const aspectRatio = aspectRatios[index % aspectRatios.length];

    return (
        <>
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

            <PeekModal
                visible={peekVisible}
                onClose={() => setPeekVisible(false)}
                onOpen={handlePress}
                item={{ title, url: url || '', imageUrl }}
            />
        </>
    );
}
