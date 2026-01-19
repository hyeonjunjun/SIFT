import React, { useMemo } from 'react';
import { View, Image, StyleSheet, Pressable, Dimensions, ActionSheetIOS, Alert, Platform, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, Theme, RADIUS } from '../lib/theme';
import { getDomain } from '../lib/utils';
import { ShimmerSkeleton } from './ShimmerSkeleton';
import { Typography } from './design-system/Typography';
import { Link as LinkIcon, FileText, Article, Video } from 'phosphor-react-native';
import Animated, { FadeIn, FadeOut, Layout, Easing } from 'react-native-reanimated';



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
            <View style={styles.imageWrapper}>
                {isFallback ? (
                    <View style={styles.fallbackContainer}>
                        {(item.category?.toLowerCase?.()?.includes('video') ||
                            item.source?.toLowerCase?.()?.includes('tiktok') ||
                            item.source?.toLowerCase?.()?.includes('youtube')) ? (
                            <Video size={32} color={COLORS.stone} weight="thin" />
                        ) : (
                            <Article size={32} color={COLORS.stone} weight="thin" />
                        )}
                    </View>
                ) : (
                    <Image
                        source={{ uri: item.image }}
                        style={styles.image}
                        resizeMode="cover"
                    />
                )}
            </View>

            {/* 2. Meta Below Image */}
            <View style={styles.meta}>
                <Typography variant="h3" numberOfLines={2}>
                    {item.title || 'Untitled'}
                </Typography>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Typography style={styles.metadata}>
                        {(item.category || 'General').toUpperCase()} • {(item.source || 'Sift').toUpperCase()}
                    </Typography>
                    {item.is_pinned && (
                        <View style={{ marginLeft: 6, width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.accent }} />
                    )}
                </View>
            </View>
        </Pressable>
    );
};

export default function SiftFeed({ pages, onPin, onArchive, onDeleteForever, mode = 'feed', loading = false }: SiftFeedProps) {
    const { width } = useWindowDimensions();
    const columnWidth = (width - (SPACING.l * 2) - 15) / 2;

    const transformedData = useMemo(() => {
        if (!pages) return [];
        return pages.map((page, index) => {
            const heights = [200, 240, 180, 280];
            const height = heights[index % heights.length];

            const domain = getDomain(page.url);

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
        paddingHorizontal: 20,
    },
    column: {
        width: '48%', // Use percentage or pass columnWidth to style
    },
    cardContainer: {
        marginBottom: 24, // HIG Standard
    },
    imageWrapper: {
        aspectRatio: 16 / 9, // FORCE ASPECT RATIO
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#F2F2F7', // System Gray 6
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(0,0,0,0.1)',
        // @ts-ignore
        cornerCurve: 'continuous',
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
    meta: {
        marginTop: 10,
        gap: 2,
    },
    title: {
        fontSize: 17,
        fontWeight: '600',
        color: COLORS.ink,
        fontFamily: 'System', // Standard iOS Headline
        lineHeight: 22,
    },
    metadata: {
        fontSize: 13,
        color: '#8E8E93', // System Gray
        fontFamily: 'System',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    }
});

