import { View, Image, StyleSheet, Pressable, Dimensions, ActionSheetIOS, Alert, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, Theme, RADIUS } from '../lib/theme';
import { ShimmerSkeleton } from './ShimmerSkeleton';
import { Typography } from './design-system/Typography';
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
            <View style={styles.imageWrapper}>
                <Image
                    source={{ uri: item.image }}
                    style={[styles.image, { height: item.height }]}
                    resizeMode="cover"
                />
            </View>

            {/* 2. Editorial Metadata */}
            <View style={styles.meta}>
                <View style={styles.eyebrowRow}>
                    <Typography variant="label" color={COLORS.stone} style={styles.eyebrow}>
                        {item.category.toUpperCase()}
                    </Typography>
                    {item.is_pinned && <Typography variant="label">📌</Typography>}
                </View>
                <Typography variant="bodyMedium" numberOfLines={2} style={styles.title}>
                    {item.title}
                </Typography>

                {/* 3. Minimalist Source Tag */}
                <View style={styles.sourceRow}>
                    <Image
                        source={{ uri: `https://www.google.com/s2/favicons?domain=${item.source}&sz=32` }}
                        style={styles.favicon}
                    />
                    <Typography variant="label" color={COLORS.stone}>{item.source}</Typography>
                </View>
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
            const domain = page.url ? new URL(page.url).hostname.replace('www.', '') : 'sift.app';

            return {
                id: page.id,
                title: page.title || 'Untitled',
                category: page.tags?.[0] || 'Saved',
                source: domain,
                image: page.metadata?.image_url || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80',
                height: height,
                is_pinned: page.is_pinned
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
        backgroundColor: COLORS.paper,
        ...Theme.shadows.soft,
        shadowOpacity: 0.04,
        shadowRadius: 20,
    },
    image: {
        width: '100%',
    },
    meta: {
        paddingTop: SPACING.m,
        paddingHorizontal: 4,
    },
    eyebrowRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    eyebrow: {
        fontSize: 9,
        letterSpacing: 1.5,
    },
    title: {
        fontSize: 14,
        lineHeight: 18,
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
});

