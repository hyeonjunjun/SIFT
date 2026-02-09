import React, { useState } from 'react';
import { View, Pressable, Image, Platform, ActionSheetIOS, Alert, Share } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { Typography } from './design-system/Typography';
import { Card } from './design-system/Card';
import PinIcon from './PinIcon';
import { COLORS, RADIUS, Theme } from '../lib/theme';
import { getDomain } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

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

function GridPageCardComponent({ id, title, url, imageUrl, index, onDelete, onDeleteForever, onPin, isPinned, createdAt }: GridPageCardProps) {
    const { colors, isDark, reduceMotion, highContrast } = useTheme();
    const router = useRouter();
    const scale = useSharedValue(1);

    // Duration helper for Reduce Motion
    const getDuration = (standard: number) => reduceMotion ? 0 : standard;

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
        opacity: withTiming(opacity, { duration: getDuration(300), easing: Easing.inOut(Easing.ease) })
    }));

    // Domain cleaning
    const domain = getDomain(url);

    const handlePressIn = () => {
        scale.value = withTiming(0.97, { duration: getDuration(150), easing: Easing.inOut(Easing.ease) });
    };

    const handlePressOut = () => {
        scale.value = withTiming(1, { duration: getDuration(150), easing: Easing.inOut(Easing.ease) });
    };

    const handlePress = () => {
        router.push(`/page/${id}`);
    };

    const handleLongPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        const options = ['Cancel', 'Share Sift', isPinned ? 'Unpin Sift' : 'Pin Sift', 'Archive Sift', 'Delete Permanently'];
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    cancelButtonIndex: 0,
                    destructiveButtonIndex: 4,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) handleShare();
                    if (buttonIndex === 2) onPin?.(id);
                    if (buttonIndex === 3) onDelete?.(id);
                    if (buttonIndex === 4) {
                        Alert.alert("Delete Permanently", "This cannot be undone.", [
                            { text: "Cancel", style: "cancel" },
                            { text: "Delete", style: "destructive", onPress: () => onDeleteForever?.(id) }
                        ]);
                    }
                }
            );
        } else {
            Alert.alert(
                "Options",
                title,
                [
                    { text: "Share", onPress: handleShare },
                    { text: isPinned ? "Unpin" : "Pin", onPress: () => onPin?.(id) },
                    { text: "Archive", onPress: () => onDelete?.(id) },
                    { text: "Delete Forever", style: 'destructive', onPress: () => onDeleteForever?.(id) },
                    { text: "Cancel", style: "cancel" }
                ]
            );
        }
    };

    const handleShare = async () => {
        try {
            const shareUrl = `https://sift-rho.vercel.app/share/${id}`;
            await Share.share({
                message: `Check out this Sift: ${title}\n\n${shareUrl}`,
                url: shareUrl,
            });
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
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
                    <Pressable
                        onPress={(e) => {
                            e.stopPropagation();
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            onPin?.(id);
                        }}
                        hitSlop={12}
                        style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            zIndex: 10,
                            backgroundColor: isPinned
                                ? (isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)')
                                : 'rgba(255,255,255,0.85)',
                            padding: 6,
                            borderRadius: RADIUS.pill,
                            ...Theme.shadows.sharp
                        }}
                    >
                        <PinIcon
                            size={12}
                            color={isPinned ? colors.ink : 'rgba(0,0,0,0.5)'}
                            weight={isPinned ? "fill" : "regular"}
                        />
                    </Pressable>

                    <View style={{ aspectRatio }}>
                        {imageUrl ? (
                            <Image
                                source={{ uri: imageUrl }}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={{ width: '100%', height: '100%', backgroundColor: colors.subtle, justifyContent: 'center', alignItems: 'center' }}>
                                <Typography variant="h3" style={{ color: colors.stone, opacity: 0.3 }}>S</Typography>
                            </View>
                        )}
                    </View>

                    <View style={{ padding: 12 }}>
                        <Typography variant="body" color="ink" style={{ fontWeight: '700', lineHeight: 20, marginBottom: 4, fontSize: 13 }}>
                            {title}
                        </Typography>
                        {domain ? (
                            <Typography variant="caption" color="stone" style={{ fontSize: 10, fontWeight: '500' }}>
                                {domain}
                            </Typography>
                        ) : null}
                    </View>
                </Card>
            </AnimatedPressable>
        </>
    );
}

export const GridPageCard = React.memo(GridPageCardComponent);
