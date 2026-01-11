import React from 'react';
import { View, Alert, Pressable, Image, Text, ActionSheetIOS, Platform } from 'react-native';
import { FileText, Trash2, Pin } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, SharedValue } from 'react-native-reanimated';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Card } from './design-system/Card';
import { Typography } from './design-system/Typography';
import { Theme } from '../lib/theme';

interface PageCardProps {
    id: string;
    title: string;
    gist: string;
    url?: string;
    tags?: string[];
    onDelete?: (id: string) => void;
    onDeleteForever?: (id: string) => void;
    onPin?: (id: string) => void;
    isPinned?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PageCard({ id, title, gist, url, tags = [], onDelete, onDeleteForever, onPin, isPinned, imageUrl }: PageCardProps & { imageUrl?: string }) {
    const router = useRouter();
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    // Fallback Title Logic
    const displayTitle = (title && title !== 'Untitled Page') ? title : (url ? new URL(url).hostname.replace('www.', '') : 'Untitled Page');
    const domain = url ? new URL(url).hostname.replace('www.', '') : '';

    // Formatting Tags: Primary Tag • Domain
    const primaryTag = tags[0] || 'Saved';
    const tagLine = `${primaryTag}  •  ${domain}`.toUpperCase();

    // Hide summary if empty or "No summary generated"
    const showSummary = gist && gist !== "No summary generated.";

    const handlePressIn = () => {
        scale.value = withSpring(0.98, { damping: 10, stiffness: 300 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 10, stiffness: 300 });
    };

    const handlePress = () => {
        router.push(`/page/${id}`);
    };

    const handleLongPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Cancel', 'Copy Link', 'Pin/Unpin Page', 'Archive Page', 'Delete Permanently'],
                    destructiveButtonIndex: 4,
                    cancelButtonIndex: 0,
                    userInterfaceStyle: 'light',
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) { // Copy Link
                        if (url) Clipboard.setStringAsync(url);
                    } else if (buttonIndex === 2) { // Pin
                        onPin?.(id);
                    } else if (buttonIndex === 3) { // Archive
                        onDelete?.(id);
                    } else if (buttonIndex === 4) { // Delete Forever
                        Alert.alert(
                            "Delete Permanently",
                            "This cannot be undone.",
                            [
                                { text: "Cancel", style: "cancel" },
                                { text: "Delete", style: "destructive", onPress: () => onDeleteForever?.(id) }
                            ]
                        );
                    }
                }
            );
        } else {
            // Android Alert
            Alert.alert(
                "Options",
                displayTitle,
                [
                    { text: "Copy Link", onPress: () => url && Clipboard.setStringAsync(url) },
                    { text: "Pin/Unpin", onPress: () => onPin?.(id) },
                    { text: "Archive", onPress: () => onDelete?.(id) },
                    {
                        text: "Delete Permanently", style: 'destructive', onPress: () => {
                            Alert.alert(
                                "Delete Permanently",
                                "This cannot be undone.",
                                [
                                    { text: "Cancel", style: "cancel" },
                                    { text: "Delete", style: "destructive", onPress: () => onDeleteForever?.(id) }
                                ]
                            );
                        }
                    },
                    { text: "Cancel", style: "cancel" }
                ]
            );
        }
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete Page",
            "Are you sure you want to delete this page?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => onDelete?.(id)
                }
            ]
        );
    };

    const RightAction = () => {
        return (
            <Pressable
                onPress={handleDelete}
                className="bg-red-500 justify-center items-center w-20 rounded-[16px] mb-3 ml-2"
                style={{ height: '100%', maxHeight: 300 }}
            >
                <Trash2 size={24} color="white" />
            </Pressable>
        );
    };

    return (
        <ReanimatedSwipeable
            containerStyle={{ overflow: 'visible' }}
            renderRightActions={RightAction}
            overshootRight={false}
        >
            <AnimatedPressable
                onPress={handlePress}
                onLongPress={handleLongPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={animatedStyle}
                className="mb-3"
            >
                <Card className="overflow-hidden p-0 relative">
                    {/* Pin Indicator */}
                    {isPinned && (
                        <View className="absolute top-2 right-2 z-10 bg-white/90 p-1.5 rounded-full shadow-sm">
                            <Pin size={12} color={Theme.colors.text.primary} fill={Theme.colors.text.primary} />
                        </View>
                    )}

                    {/* 1. Cover Image */}
                    {imageUrl ? (
                        <Image
                            source={{ uri: imageUrl }}
                            style={{ width: '100%', height: 140 }}
                            className="bg-gray-100"
                        />
                    ) : null}

                    <View className="p-5">
                        {/* 2. Refined Eyebrow */}
                        <View className="mb-2">
                            <Text className="text-[11px] font-bold text-slate-500 tracking-widest leading-4">
                                {tagLine}
                            </Text>
                        </View>

                        {/* 3. Title */}
                        <Typography variant="h3" className="mb-1 tracking-[-0.5px] text-ink" numberOfLines={2}>
                            {displayTitle}
                        </Typography>

                        {/* 4. Body */}
                        {showSummary && (
                            <Typography variant="body" className="text-ink-secondary leading-[22px]" numberOfLines={3}>
                                {gist}
                            </Typography>
                        )}
                    </View>
                </Card>
            </AnimatedPressable>
        </ReanimatedSwipeable>
    );
}
