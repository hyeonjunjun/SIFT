import React from 'react';
import { View, Alert, Pressable, Image, Text, ActionSheetIOS, Platform } from 'react-native';
import { Trash, PushPin as Pin } from 'phosphor-react-native';
import { useRouter } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { COLORS, RADIUS, Theme, LIGHT_COLORS, DARK_COLORS, TRANSITIONS } from '../lib/theme';
import { getDomain } from '../lib/utils';
import { Typography } from './design-system/Typography';
import { useTheme } from '../context/ThemeContext';

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
    const { colors, isDark, theme } = useTheme();
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
        scale.value = withTiming(0.98, {
            duration: TRANSITIONS.short,
            easing: Easing.inOut(Easing.ease),
        });
    };

    const handlePressOut = () => {
        scale.value = withTiming(1, {
            duration: TRANSITIONS.short,
            easing: Easing.inOut(Easing.ease),
        });
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
                    userInterfaceStyle: isDark ? 'dark' : 'light',
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
                style={{ height: '100%', maxHeight: 300, backgroundColor: colors.danger, justifyContent: 'center', alignItems: 'center', width: 80, borderRadius: RADIUS.m, marginBottom: 12, marginLeft: 8 }}
            >
                <Trash size={24} color={isDark ? colors.paper : "white"} />
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
                        backgroundColor: colors.paper,
                        borderRadius: RADIUS.l,
                        overflow: 'hidden',
                        marginBottom: 24,
                        ...Theme.shadows.soft,
                        shadowColor: isDark ? "#000000" : "#5A5A50",
                        shadowOpacity: isDark ? 0.4 : 0.05,
                    }}
                >
                    {isPinned && (
                        <View style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.9)', padding: 6, borderRadius: 100 }}>
                            <Pin size={10} color={colors.ink} weight="fill" />
                        </View>
                    )}

                    {imageUrl && (
                        <Image
                            source={imageError ? require('../assets/covers/gastronomy.jpg') : { uri: imageUrl }}
                            style={{ width: '100%', height: 180, backgroundColor: colors.subtle }}
                            resizeMode="cover"
                            onError={() => setImageError(true)}
                        />
                    )}

                    <View style={{ padding: 16, paddingTop: 12 }}>
                        <Typography variant="label" color="stone" style={{ marginBottom: 4, letterSpacing: 1 }}>
                            {domain.toUpperCase() || 'SIFT'}
                        </Typography>

                        <Typography variant="h3" color="ink" style={{ marginBottom: 6 }}>
                            {displayTitle}
                        </Typography>

                        {showSummary && (
                            <Typography
                                variant="body"
                                color="stone"
                                numberOfLines={2}
                                style={{ opacity: 0.9 }}
                            >
                                {gist}
                            </Typography>
                        )}
                    </View>
                </View>
            </AnimatedPressable>
        </ReanimatedSwipeable>
    );
}
