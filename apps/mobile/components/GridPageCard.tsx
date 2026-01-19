import React, { useState } from 'react';
import { View, Pressable, Image, Platform, ActionSheetIOS, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { Typography } from './design-system/Typography';
import { Card } from './design-system/Card';
import { PushPin as Pin } from 'phosphor-react-native';
import { COLORS } from '../lib/theme';
import { getDomain } from '../lib/utils';

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

    // Dust Gathering Logic (30 days)
    const isDusty = (() => {
        if (!createdAt) return false;
        const time = new Date(createdAt).getTime();
        if (isNaN(time)) return false;
        return (new Date().getTime() - time) > (30 * 24 * 60 * 60 * 1000);
    })();
    const opacity = isDusty ? 0.6 : 1;

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: withTiming(opacity, { duration: 300, easing: Easing.inOut(Easing.ease) })
    }));

    // Domain cleaning
    const domain = getDomain(url);

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
        // PeekModal removed. Could add context menu here if needed.
    };

    // Deterministic random height based on index to keep it stable
    const aspectRatios = [1, 1.3, 0.8, 1.4, 1.1];
    const aspectRatio = aspectRatios[index % aspectRatios.length];

    return (
        <>
            <AnimatedPressable
                onPress={handlePress}
                onLongPress={handleLongPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={[animatedStyle, { marginBottom: 12 }]}
            >
                <Card style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
                    {/* Pin Indicator */}
                    {isPinned && (
                        <View style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.9)', padding: 6, borderRadius: 100 }}>
                            <Pin size={10} color={COLORS.ink} weight="fill" />
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
                            <View style={{ width: '100%', height: '100%', backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' }}>
                                <Typography variant="h3" style={{ color: '#CBD5E1' }}>S</Typography>
                            </View>
                        )}
                    </View>

                    <View style={{ padding: 12 }}>
                        <Typography variant="body" style={{ color: COLORS.ink, fontWeight: '700', lineHeight: 20, marginBottom: 4, fontSize: 13 }}>
                            {title}
                        </Typography>
                        {domain ? (
                            <Typography variant="caption" style={{ color: COLORS.ink, opacity: 0.6, fontSize: 10, fontWeight: '500' }}>
                                {domain}
                            </Typography>
                        ) : null}
                    </View>
                </Card>
            </AnimatedPressable>
        </>
    );
}
