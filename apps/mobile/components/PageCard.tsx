import React from 'react';
import { View, Alert, Pressable, Image, Text, ActionSheetIOS, Platform } from 'react-native';
import { Trash, PushPin as Pin } from 'phosphor-react-native';
import { useRouter } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { COLORS, RADIUS, Theme } from '../lib/theme';
import { getDomain } from '../lib/utils';
import { Typography } from './design-system/Typography';

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
    imageUrl?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PageCard({ id, title, gist, url, tags = [], onDelete, onDeleteForever, onPin, isPinned, imageUrl }: PageCardProps) {
    const router = useRouter();
    const scale = useSharedValue(1);
    const [imageError, setImageError] = React.useState(false);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    // Fallback Title Logic
    const displayTitle = (title && title !== 'Untitled Page') ? title : (url ? getDomain(url) : 'Untitled Page');
    const domain = getDomain(url);

    // Formatting Tags: Primary Tag • Domain
    const ALLOWED_TAGS = ["Cooking", "Baking", "Tech", "Health", "Lifestyle", "Professional"];
    const validTags = tags.filter(t => ALLOWED_TAGS.includes(t));
    const primaryTag = validTags[0] || 'Lifestyle';
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
                style={{ height: '100%', maxHeight: 300, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', width: 80, borderRadius: 16, marginBottom: 12, marginLeft: 8 }}
            >
                <Trash size={24} color="white" />
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
            >
                <View
                    style={{
                        backgroundColor: COLORS.paper,      // Pure White on Oatmeal
                        borderRadius: RADIUS.l,             // Pebble Shape (24)
                        overflow: 'hidden',
                        marginBottom: 24,

                        // Ambient Occlusion Shadow (Soft Cloud)
                        ...Theme.shadows.soft,

                        // No Border (Clean look)
                    }}
                >
                    {isPinned && (
                        <View style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.9)', padding: 6, borderRadius: 100 }}>
                            <Pin size={10} color={COLORS.ink} weight="fill" />
                        </View>
                    )}

                    {imageUrl && (
                        <Image
                            source={imageError ? require('../assets/covers/gastronomy.jpg') : { uri: imageUrl }}
                            style={{ width: '100%', height: 180, backgroundColor: '#F9FAFB' }}
                            resizeMode="cover"
                            onError={() => setImageError(true)}
                        />
                    )}

                    <View style={{ padding: 16, paddingTop: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, opacity: 0.7 }}>
                            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#9CA3AF', letterSpacing: 2 }}>
                                {domain.toUpperCase() || 'SIFT'}
                            </Text>
                        </View>

                        <Text style={{ fontSize: 18, fontWeight: '500', color: '#111827', lineHeight: 24, letterSpacing: -0.5, marginBottom: 6 }}>
                            {displayTitle}
                        </Text>

                        {showSummary && (
                            <Text
                                style={{ fontSize: 14, color: '#6B7280', lineHeight: 20 }}
                                numberOfLines={2}
                            >
                                {gist}
                            </Text>
                        )}
                    </View>
                </View>
            </AnimatedPressable>
        </ReanimatedSwipeable>
    );
}
