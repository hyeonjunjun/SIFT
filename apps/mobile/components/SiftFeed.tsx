import React, { useMemo } from 'react';
import { View, Image, StyleSheet, Pressable, Dimensions, ActionSheetIOS, Alert, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, Theme, RADIUS } from '../lib/theme';
import { ShimmerSkeleton } from './ShimmerSkeleton';
import { Typography } from './design-system/Typography';
import { Link as LinkIcon, FileText, Article, Video } from 'phosphor-react-native';
import Animated, { FadeIn, FadeOut, Layout, Easing } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - (SPACING.l * 2) - 15) / 2;

interface Page {
    id: string;
    title: string;
    summary?: string;
    tags?: string[];
    url?: string;
    created_at: string;
    metadata?: {
        image_url?: string;
    };
    is_pinned?: boolean;
}

interface SiftFeedProps {
    pages: Page[];
    onPin?: (id: string) => void;
    onArchive?: (id: string) => void;
    onDeleteForever?: (id: string) => void;
    mode?: 'feed' | 'archive';
    loading?: boolean;
}

const SkeletonCard = () => {
    const randomHeight = Math.floor(Math.random() * (300 - 180 + 1) + 180);
    return (
        <View style={styles.cardContainer}>
            <ShimmerSkeleton width="100%" height={randomHeight} borderRadius={RADIUS.l} style={{ marginBottom: 12 }} />
            <View style={{ paddingHorizontal: 4 }}>
                <ShimmerSkeleton width={60} height={10} borderRadius={RADIUS.s} style={{ marginBottom: 8 }} />
                <ShimmerSkeleton width="90%" height={16} borderRadius={RADIUS.s} style={{ marginBottom: 6 }} />
                <ShimmerSkeleton width="60%" height={16} borderRadius={RADIUS.s} />
            </View>
        </View>
    );
};

const Card = ({ item, onPin, onArchive, onDeleteForever, mode = 'feed' }: {
    item: any,
    onPin?: (id: string) => void,
    onArchive?: (id: string) => void,
    onDeleteForever?: (id: string) => void,
    mode?: 'feed' | 'archive'
}) => {
    const router = useRouter();

    const handlePress = () => {
        Haptics.selectionAsync();
        router.push(`/page/${item.id}`);
    };

    const handleLongPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const archiveLabel = mode === 'archive' ? 'Restore' : 'Archive';
        const options = ['Cancel', item.is_pinned ? 'Unpin' : 'Pin', archiveLabel, 'Delete Forever'];
        if (__DEV__) {
            options.splice(3, 0, 'View Diagnostics');
        }

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    cancelButtonIndex: 0,
                    destructiveButtonIndex: options.length - 1,
                    title: item.title,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) onPin?.(item.id);
                    if (buttonIndex === 2) onArchive?.(item.id);
                    if (__DEV__ && buttonIndex === 3) {
                        Alert.alert("Sift Diagnostics", item.debug_info || "No diagnostic information available.", [{ text: "Close" }]);
                    }
                    if (buttonIndex === options.length - 1) onDeleteForever?.(item.id);
                }
            );
        } else {
            const androidButtons: any[] = [
                { text: 'Cancel', style: 'cancel' },
                { text: item.is_pinned ? 'Unpin' : 'Pin', onPress: () => onPin?.(item.id) },
                { text: archiveLabel, onPress: () => onArchive?.(item.id) },
            ];

            if (__DEV__) {
                androidButtons.push({ text: 'View Diagnostics', onPress: () => Alert.alert("Sift Diagnostics", item.debug_info || "No diagnostic information available.") });
            }

            androidButtons.push({ text: 'Delete Forever', style: 'destructive', onPress: () => onDeleteForever?.(item.id) });

            Alert.alert(
                item.title,
                'Manage this Sift',
                androidButtons
            );
        }
    };

    const isFallback = !item.image;

    return (
        <Pressable
            style={styles.cardContainer}
            onPress={handlePress}
            onLongPress={handleLongPress}
            delayLongPress={300}
        >
            {/* 1. Image or Fallback */}
            <View style={[styles.imageWrapper, { height: item.height }]}>
                {isFallback ? (
                    <View style={styles.fallbackContainer}>
                        {item.category.toLowerCase().includes('video') || item.source.includes('tiktok') || item.source.includes('youtube') ? (
                            <Video size={48} color={COLORS.stone} weight="thin" />
                        ) : (
                            <Article size={48} color={COLORS.stone} weight="thin" />
                        )}
                    </View>
                ) : (
                    <Image
                        source={{ uri: item.image }}
                        style={styles.image}
                        resizeMode="cover"
                    />
                )}

                {/* Tag Pill at Top Right */}
                <View style={styles.tagPill}>
                    <Typography variant="label" style={styles.tagText}>
                        {item.category.toUpperCase()}
                    </Typography>
                </View>
            </View>

            {/* 2. Title Below Image */}
            <View style={styles.meta}>
                <Typography variant="h3" numberOfLines={2} style={styles.title}>
                    {item.title}
                </Typography>
                {item.is_pinned && <Typography variant="label" style={{ marginTop: 2 }}>PINNED</Typography>}
            </View>
        </Pressable>
    );
};

export default function SiftFeed({ pages, onPin, onArchive, onDeleteForever, mode = 'feed', loading = false }: SiftFeedProps) {
    if (loading) {
        return (
            <View style={styles.masonryContainer}>
                <View style={styles.column}>
                    {[1, 2, 3].map(i => <SkeletonCard key={`skel-left-${i}`} />)}
                </View>
                <View style={styles.column}>
                    {[1, 2, 3].map(i => <SkeletonCard key={`skel-right-${i}`} />)}
                </View>
            </View>
        );
    }

    const transformedData = useMemo(() => {
        return pages.map((page, index) => {
            const heights = [200, 240, 180, 280];
            const height = heights[index % heights.length];

            let domain = 'sift.app';
            try {
                if (page.url) {
                    const urlObj = new URL(page.url.startsWith('http') ? page.url : `https://${page.url}`);
                    domain = urlObj.hostname.replace('www.', '');
                }
            } catch (e) {
                console.warn("Invalid URL in feed:", page.url);
            }

            return {
                id: page.id,
                title: page.title || 'Untitled',
                category: page.tags?.[0] || 'Saved',
                source: domain,
                image: page.metadata?.image_url, // No fallback URL here, handle in Card
                height: height,
                is_pinned: page.is_pinned,
                summary: page.summary,
                debug_info: (page.metadata as any)?.debug_info
            };
        });
    }, [pages]);

    const leftColumn = transformedData.filter((_, i) => i % 2 === 0);
    const rightColumn = transformedData.filter((_, i) => i % 2 !== 0);

    return (
        <View style={styles.masonryContainer}>
            <View style={styles.column}>
                {leftColumn.map(item => (
                    <Animated.View
                        key={item.id}
                        layout={Layout.duration(400).easing(Easing.inOut(Easing.quad))}
                        entering={FadeIn.duration(400).easing(Easing.inOut(Easing.quad))}
                        exiting={FadeOut.duration(200).easing(Easing.inOut(Easing.quad))}
                    >
                        <Card
                            item={item}
                            onPin={onPin}
                            onArchive={onArchive}
                            onDeleteForever={onDeleteForever}
                            mode={mode}
                        />
                    </Animated.View>
                ))}
            </View>
            <View style={styles.column}>
                {rightColumn.map(item => (
                    <Animated.View
                        key={item.id}
                        layout={Layout.duration(400).easing(Easing.inOut(Easing.quad))}
                        entering={FadeIn.duration(400).easing(Easing.inOut(Easing.quad))}
                        exiting={FadeOut.duration(200).easing(Easing.inOut(Easing.quad))}
                    >
                        <Card
                            item={item}
                            onPin={onPin}
                            onArchive={onArchive}
                            onDeleteForever={onDeleteForever}
                            mode={mode}
                        />
                    </Animated.View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    masonryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.l,
    },
    column: {
        width: COLUMN_WIDTH,
    },
    cardContainer: {
        marginBottom: SPACING.xl,
    },
    imageWrapper: {
        borderRadius: RADIUS.l,
        overflow: 'hidden',
        backgroundColor: '#EFEFEF', // Solid fallback
        borderWidth: 1,
        borderColor: COLORS.subtle,
    },
    fallbackContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    tagPill: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#000000',
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    tagText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        letterSpacing: 0.5,
    },
    meta: {
        paddingTop: SPACING.s,
        paddingHorizontal: 0,
    },
    title: {
        fontSize: 16,
        color: COLORS.ink,
        fontFamily: 'PlayfairDisplay_700Bold', // Serif for "Sift Archive" look
    },
});

