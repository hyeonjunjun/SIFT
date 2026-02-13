import React from 'react';
import { View, Alert, Pressable, Text, ActionSheetIOS, Platform, Share } from 'react-native';
import { Image } from 'expo-image';
import { Trash } from 'phosphor-react-native';
import { useRouter } from 'expo-router';
import PinIcon from './PinIcon';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { COLORS, RADIUS, Theme, LIGHT_COLORS, DARK_COLORS, TRANSITIONS } from '../lib/theme';
import { getDomain } from '../lib/utils';
import { Typography } from './design-system/Typography';
import { ActionSheet } from './modals/ActionSheet';
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

const PageCardComponent = ({ id, title, gist, url, tags = [], onDelete, onDeleteForever, onPin, isPinned, imageUrl }: PageCardProps) => {
    const { colors, isDark, theme, reduceMotion, highContrast } = useTheme();
    const router = useRouter();
    const [imageError, setImageError] = React.useState(false);
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    // Duration helper for Reduce Motion
    const getDuration = (standard: number) => reduceMotion ? 0 : standard;

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
            duration: getDuration(TRANSITIONS.short),
            easing: Easing.inOut(Easing.ease),
        });
    };

    const handlePressOut = () => {
        scale.value = withTiming(1, {
            duration: getDuration(TRANSITIONS.short),
            easing: Easing.inOut(Easing.ease),
        });
    };

    const handlePress = () => {
        router.push(`/page/${id}`);
    };

    const [actionSheetVisible, setActionSheetVisible] = React.useState(false);

    const handleLongPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setActionSheetVisible(true);
    };

    const handleShare = async () => {
        try {
            const shareUrl = `https://sift-rho.vercel.app/share/${id}`;
            await Share.share({
                message: `Check out this Sift: ${displayTitle}\n\n${shareUrl}`,
                url: shareUrl,
            });
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    return (
        <>

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
                        borderRadius: RADIUS.xl, // Premium larger rounding
                        overflow: 'hidden',
                        marginBottom: 24,
                        borderWidth: (isDark || highContrast) ? (highContrast ? 2 : 1) : 0,
                        borderColor: highContrast ? colors.separator : (isDark ? 'rgba(255,255,255,0.05)' : 'transparent'),
                        ...Theme.shadows.medium, // Softer, more premium shadow
                        shadowColor: (isDark || highContrast) ? "#000000" : "#5A5A50",
                        shadowOpacity: (isDark || highContrast) ? 0.6 : 0.08,
                    }}
                >
                    <Pressable
                        onPress={(e) => {
                            e.stopPropagation();
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            onPin?.(id);
                        }}
                        hitSlop={12}
                        style={{
                            position: 'absolute',
                            top: 14,
                            right: 14,
                            zIndex: 10,
                            backgroundColor: isPinned
                                ? (isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)')
                                : 'rgba(255,255,255,0.85)',
                            padding: 8,
                            borderRadius: 100,
                            ...Theme.shadows.soft
                        }}
                    >
                        <PinIcon
                            size={12}
                            color={isPinned ? colors.accent : 'rgba(0,0,0,0.5)'}
                            weight={isPinned ? "fill" : "regular"}
                        />
                    </Pressable>

                    {imageUrl && (
                        <Image
                            source={imageUrl}
                            style={{ width: '100%', height: 180, backgroundColor: colors.subtle }}
                            contentFit="cover"
                            transition={500}
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

            <ActionSheet
                visible={actionSheetVisible}
                onClose={() => setActionSheetVisible(false)}
                title={displayTitle || 'Options'}
                options={[
                    {
                        label: 'Copy Link',
                        icon: require('phosphor-react-native').Link,
                        onPress: () => {
                            if (url) Clipboard.setStringAsync(url);
                        }
                    },
                    {
                        label: 'Share Sift',
                        icon: require('phosphor-react-native').ShareNetwork,
                        onPress: handleShare
                    },
                    {
                        label: isPinned ? 'Unpin Sift' : 'Pin Sift',
                        icon: require('phosphor-react-native').PushPin,
                        onPress: () => onPin?.(id)
                    },
                    {
                        label: 'Archive Sift',
                        icon: require('phosphor-react-native').Archive,
                        isDestructive: true,
                        onPress: () => onDelete?.(id)
                    },
                    {
                        label: 'Delete Permanently',
                        icon: require('phosphor-react-native').Trash,
                        isDestructive: true,
                        onPress: () => {
                            Alert.alert("Delete Permanently", "This cannot be undone.", [
                                { text: "Cancel", style: "cancel" },
                                { text: "Delete", style: "destructive", onPress: () => onDeleteForever?.(id) }
                            ]);
                        }
                    },
                    {
                        label: 'Cancel',
                        isCancel: true,
                        onPress: () => { }
                    }
                ]}
            />
        </>
    );
};

export const PageCard = React.memo(PageCardComponent);
