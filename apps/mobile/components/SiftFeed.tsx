import React, { useMemo } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, Pressable, Dimensions, ActionSheetIOS, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Theme } from '../lib/theme';
import { ShimmerSkeleton } from './ShimmerSkeleton';
import Animated, { FadeIn, FadeOut, Layout, Easing } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
// Calculate flexible column width: (Screen Width - Padding) / 2
const COLUMN_WIDTH = (width - 48) / 2;

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
}

// Skeleton Card Component
const SkeletonCard = () => {
    // Random height between 180 and 300 for organic feel
    const randomHeight = Math.floor(Math.random() * (300 - 180 + 1) + 180);

    return (
        <View style={styles.cardContainer}>
            <ShimmerSkeleton width="100%" height={randomHeight} borderRadius={16} style={{ marginBottom: 12 }} />
            <View style={{ paddingHorizontal: 4 }}>
                <ShimmerSkeleton width={60} height={10} borderRadius={4} style={{ marginBottom: 8 }} />
                <ShimmerSkeleton width="90%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
                <ShimmerSkeleton width="60%" height={16} borderRadius={4} style={{ marginBottom: 12 }} />
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ShimmerSkeleton width={16} height={16} borderRadius={4} style={{ marginRight: 6 }} />
                    <ShimmerSkeleton width={80} height={10} borderRadius={4} />
                </View>
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
        router.push(`/page/${item.id}`);
    };

    const handleLongPress = () => {
        const archiveLabel = mode === 'archive' ? 'Restore' : 'Archive';
        const options = ['Cancel', item.is_pinned ? 'Unpin' : 'Pin', archiveLabel, 'Delete Forever'];
        // Use Alert for cross-platform simplicity or ActionSheetIOS if available
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    cancelButtonIndex: 0,
                    destructiveButtonIndex: 3,
                    title: item.title,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) onPin?.(item.id);
                    if (buttonIndex === 2) onArchive?.(item.id);
                    if (buttonIndex === 3) onDeleteForever?.(item.id);
                }
            );
        } else {
            Alert.alert(
                item.title,
                'Manage this Sift',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: item.is_pinned ? 'Unpin' : 'Pin', onPress: () => onPin?.(item.id) },
                    { text: archiveLabel, onPress: () => onArchive?.(item.id) },
                    { text: 'Delete Forever', style: 'destructive', onPress: () => onDeleteForever?.(item.id) },
                ]
            );
        }
    };

    return (
        <Pressable
            style={styles.cardContainer}
            onPress={handlePress}
            onLongPress={handleLongPress}
            delayLongPress={300}
        >
            {/* 1. Bezel-less Image with Organic Corners */}
            {item.image && (
                <Image
                    source={{ uri: item.image }}
                    style={[styles.image, { height: item.height }]}
                    resizeMode="cover"
                />
            )}

            {/* 2. Editorial Metadata (No Box) */}
            <View style={styles.meta}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.eyebrow}>{item.category.toUpperCase()}</Text>
                    {item.is_pinned && <Text style={{ fontSize: 10 }}>📌</Text>}
                </View>
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>

                {/* 3. Minimalist Source Tag */}
                <View style={styles.sourceRow}>
                    <Image
                        source={{ uri: `https://www.google.com/s2/favicons?domain=${item.source}&sz=32` }}
                        style={styles.favicon}
                    />
                    <Text style={styles.sourceText}>{item.source}</Text>
                </View>
            </View>
        </Pressable>
    );
};

// Define props
interface SiftFeedProps {
    pages: Page[];
    onPin?: (id: string) => void;
    onArchive?: (id: string) => void;
    onDeleteForever?: (id: string) => void;
    mode?: 'feed' | 'archive';
    loading?: boolean;
}

export default function SiftFeed({ pages, onPin, onArchive, onDeleteForever, mode = 'feed', loading = false }: SiftFeedProps) {
    // Loading State
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

    // Transform Data & Assign Deterministic Heights
    const transformedData = useMemo(() => {
        return pages.map((page, index) => {
            // Deterministic pseudo-random height based on index/id for stability
            // Heights: 180, 220, 260, 300
            const heights = [180, 220, 260, 300];
            const height = heights[index % heights.length];

            const domain = page.url ? new URL(page.url).hostname.replace('www.', '') : 'sift.app';

            return {
                id: page.id,
                title: page.title || 'Untitled',
                category: page.tags?.[0] || 'Saved',
                source: domain,
                image: page.metadata?.image_url || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80', // Gradient fallback
                height: height,
                is_pinned: page.is_pinned // Pass pinned state
            };
        });
    }, [pages]);

    // Split data into two columns for the "Waterfall" effect
    const leftColumn = transformedData.filter((_, i) => i % 2 === 0);
    const rightColumn = transformedData.filter((_, i) => i % 2 !== 0);

    return (
        <View style={styles.masonryContainer}>
            {/* Left Column */}
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
            {/* Right Column */}
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
        paddingHorizontal: 16, // Match parent padding if needed, or controlled by parent
    },
    column: {
        width: COLUMN_WIDTH,
    },
    cardContainer: {
        marginBottom: 24, // Generous spacing for "Airy" feel
    },
    image: {
        width: '100%',
        borderRadius: Theme.borderRadius.card, // 24px
        marginBottom: 12,
        backgroundColor: Theme.colors.border, // Subtle placeholder
    },
    meta: {
        paddingHorizontal: 4,
    },
    eyebrow: {
        fontSize: 10,
        fontWeight: '700',
        color: Theme.colors.text.tertiary,
        marginBottom: 4,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    title: {
        fontSize: Theme.typography.header.cardTitle.fontSize,
        fontWeight: Theme.typography.header.cardTitle.fontWeight as any,
        letterSpacing: Theme.typography.header.cardTitle.letterSpacing,
        color: Theme.typography.header.cardTitle.color,
        fontFamily: Theme.typography.header.cardTitle.fontFamily,
        lineHeight: 24,
        marginBottom: 8,
    },
    sourceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        opacity: 0.8,
    },
    favicon: {
        width: 12,
        height: 12,
        marginRight: 6,
        borderRadius: 2,
    },
    sourceText: {
        fontSize: Theme.typography.caption.fontSize,
        color: Theme.typography.caption.color,
    },
});
