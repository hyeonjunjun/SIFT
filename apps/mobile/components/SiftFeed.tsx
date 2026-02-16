import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable, Alert, Platform, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, TRANSITIONS, Theme } from '../lib/theme';
import { getDomain } from '../lib/utils';
import { Typography } from './design-system/Typography';
import { Article, Video } from 'phosphor-react-native';
import PinIcon from './PinIcon';
import Animated, { FadeIn, FadeOut, Layout, Easing, useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Minus, SquaresFour, Rows } from 'phosphor-react-native';
import { useAuth } from '../lib/auth';
import { SiftCardSkeleton } from './SiftCardSkeleton';
import { FeedLoadingScreen } from './FeedLoadingScreen';
import { PageCard } from './PageCard';
import { useTheme } from '../context/ThemeContext';

interface Page {
    id: string;
    title: string;
    summary?: string;
    tags?: string[];
    url?: string;
    created_at: string;
    metadata?: {
        image_url?: string;
        blurhash?: string;
        status?: string;
        debug_info?: string;
    };
    is_pinned?: boolean;
}

interface SiftFeedProps {
    pages: Page[];
    onPin?: (id: string) => void;
    onArchive?: (id: string) => void;
    onDeleteForever?: (id: string) => void;
    onEditTags?: (id: string, currentTags: string[]) => void;
    onOptions?: (item: any) => void;
    onRemove?: (id: string) => void;
    mode?: 'feed' | 'archive' | 'edit';
    loading?: boolean;
    ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
    ListEmptyComponent?: React.ComponentType<any> | React.ReactElement | null;
    onScroll?: (event: any) => void;
    refreshControl?: any;
    contentContainerStyle?: any;
    onEndReached?: () => void;
    onEndReachedThreshold?: number;
    viewMode?: 'grid' | 'list';
}

const GRID_PADDING = 20;
const GRID_GAP = 15;

const getLayoutInfo = (screenWidth: number) => {
    const isWeb = Platform.OS === 'web';
    const maxAppWidth = isWeb ? 800 : screenWidth;
    const effectiveWidth = Math.min(screenWidth, maxAppWidth);

    let numColumns = 2;
    if (isWeb && screenWidth > 600) numColumns = 3;
    if (isWeb && screenWidth > 900) numColumns = 4;

    const columnWidth = (effectiveWidth - (GRID_PADDING * 2) - (GRID_GAP * (numColumns - 1))) / numColumns;
    return { numColumns, columnWidth };
};

const Card = React.memo(({ item: page, index, numColumns = 2, onPin, onArchive, onDeleteForever, onEditTags, onOptions, onRemove, mode = 'feed' }: {
    item: Page,
    index: number,
    numColumns?: number,
    onPin?: (id: string) => void,
    onArchive?: (id: string) => void,
    onDeleteForever?: (id: string) => void,
    onEditTags?: (id: string, currentTags: string[]) => void,
    onOptions?: (item: any) => void,
    onRemove?: (id: string) => void,
    mode?: 'feed' | 'archive' | 'edit'
}) => {
    const { colors, isDark } = useTheme();
    const router = useRouter();

    // Transform page data on-demand in the virtualized item
    const item = useMemo(() => {
        const domain = getDomain(page.url);
        return {
            id: page.id,
            title: page.title || 'Untitled',
            category: page.tags?.[0] || 'Saved',
            source: domain,
            image: page.metadata?.image_url,
            blurhash: page.metadata?.blurhash,
            is_pinned: page.is_pinned,
            summary: page.summary,
            rawTags: page.tags || [],
            status: page.metadata?.status || 'completed',
            debug_info: page.metadata?.debug_info
        };
    }, [page]);

    const handlePress = () => {
        if (mode === 'edit') {
            onRemove?.(item.id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            return;
        }
        Haptics.selectionAsync();
        router.push({
            pathname: `/page/${item.id}`,
            params: {
                contextType: mode === 'feed' ? 'feed' : 'archive', // simple context for now
                // We'll need to enhance this dynamically for tags/search later if needed
            }
        });
    };

    const handleRemove = () => {
        onRemove?.(item.id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const handleLongPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        // Bubble up to parent to show custom ActionSheet
        onOptions?.(item);
    };

    // Container Padding Strategy:
    // Container has 20px padding.
    // Items naturally fill the space. Gap is handled by TILE_WIDTH logic.
    const isLeftColumn = index % 2 === 0;

    const isFallback = !item.image;

    // STALE CHECK: If pending for > 5 mins, show as FAILED or HIDE
    const isStale = useMemo(() => {
        if (item.status !== 'pending') return false;
        try {
            const created = new Date(page.created_at).getTime();
            const now = Date.now();
            return (now - created) > (5 * 60 * 1000); // 5 minutes
        } catch { return false; }
    }, [item.status, page.created_at]);

    const { width } = useWindowDimensions();
    const [isHovered, setIsHovered] = React.useState(false);
    const { columnWidth } = getLayoutInfo(width);

    // Hooks must be unconditional
    const opacity = useSharedValue(1);
    const shakeAnimation = useAnimatedStyle(() => {
        if (mode === 'edit') {
            return { transform: [{ scale: 0.95 }] };
        }
        return {};
    });

    // Skeleton Animation Hook
    React.useEffect(() => {
        if (item.status === 'pending') {
            opacity.value = withRepeat(
                withTiming(0.6, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                -1,
                true
            );
        }
    }, [item.status]);

    const skeletonStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    // Logic for conditional rendering
    const isFailedOrStale = item.status === 'failed' || isStale;
    const isPending = item.status === 'pending';

    if (isFailedOrStale) {
        return null;
    }

    if (isPending) {
        return (
            <Animated.View style={[{
                width: columnWidth,
                marginBottom: GRID_GAP,
                marginRight: (index + 1) % numColumns === 0 ? 0 : GRID_GAP,
            }, skeletonStyle]}>
                <SiftCardSkeleton />
            </Animated.View>
        );
    }

    return (
        <Animated.View
            entering={FadeIn.duration(400).easing(Easing.out(Easing.quad))}
            exiting={FadeOut.duration(200)}
            style={[{
                width: columnWidth,
                marginBottom: GRID_GAP,
                marginRight: (index + 1) % numColumns === 0 ? 0 : GRID_GAP,
                transform: Platform.OS === 'web' ? [{ scale: isHovered ? 1.02 : 1 }] : [],
            }, shakeAnimation]}
        >
            <Pressable
                style={styles.cardContainer}
                onPress={mode === 'edit' ? handleRemove : handlePress}
                onLongPress={mode === 'edit' ? undefined : handleLongPress}
                delayLongPress={300}
                onHoverIn={() => setIsHovered(true)}
                onHoverOut={() => setIsHovered(false)}
                disabled={item.status === 'pending'}
            >
                <View style={[styles.imageWrapper, { backgroundColor: colors.subtle }]}>
                    {(item.status === 'failed' || isStale) ? (
                        <View style={[styles.fallbackContainer, { backgroundColor: colors.danger }]}>
                            <Typography variant="label" style={{ color: 'white', fontWeight: 'bold' }}>
                                {isStale ? "TIMED OUT" : "FAILED"}
                            </Typography>
                        </View>
                    ) : isFallback ? (
                        <View style={[styles.fallbackContainer, { backgroundColor: colors.paper }]}>
                            {(item.category?.toLowerCase?.()?.includes('video') ||
                                item.source?.toLowerCase?.()?.includes('tiktok') ||
                                item.source?.toLowerCase?.()?.includes('youtube')) ? (
                                <Video size={32} color={colors.stone} weight="thin" />
                            ) : (
                                <Article size={32} color={colors.stone} weight="thin" />
                            )}
                        </View>
                    ) : (
                        <Image
                            source={item.image}
                            placeholder={item.blurhash || 'LKO2?V%2Tw=w]~RBVZRi_Noz9HkC'} // Default blurhash
                            contentFit="cover"
                            transition={500}
                            style={[styles.image, mode === 'edit' && { opacity: 0.8 }]}
                        />
                    )}

                    <Pressable
                        onPress={(e) => {
                            e.stopPropagation();
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            onPin?.(item.id);
                        }}
                        hitSlop={12}
                        style={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            zIndex: 10,
                            backgroundColor: item.is_pinned
                                ? (isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)')
                                : 'rgba(255,255,255,0.85)',
                            padding: 6,
                            borderRadius: 100,
                            ...Theme.shadows.soft
                        }}
                    >
                        <PinIcon
                            size={10}
                            color={item.is_pinned ? colors.accent : 'rgba(0,0,0,0.5)'}
                            weight={item.is_pinned ? "fill" : "regular"}
                        />
                    </Pressable>

                    {/* Gradient Overlay & Text (Now Inside) */}
                    <Animated.View
                        entering={FadeIn.duration(600)}
                        style={StyleSheet.absoluteFill}
                    >
                        {/* @ts-ignore */}
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)']}
                            locations={[0.4, 0.7, 1]}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.textOverlay}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                <Typography style={styles.overlayTag}>
                                    {(item.category || 'General').toUpperCase()}
                                </Typography>
                                {item.is_pinned && (
                                    <View style={{ marginLeft: 6, width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF' }} />
                                )}
                            </View>
                            <Typography variant="h3" style={styles.overlayTitle} numberOfLines={2}>
                                {item.title || 'Untitled'}
                            </Typography>
                        </View>
                    </Animated.View>

                    {/* Checkbox / Remove Overlay for Edit Mode */}
                    {mode === 'edit' && (
                        <View style={styles.editOverlay}>
                            <View style={styles.removeBadge}>
                                <Minus size={16} color="white" weight="bold" />
                            </View>
                        </View>
                    )}
                </View>
            </Pressable>
        </Animated.View>
    );
});

export default function SiftFeed({
    pages,
    onPin,
    onArchive,
    onDeleteForever,
    onEditTags,
    onOptions,
    onRemove,
    mode = 'feed', // 'feed' | 'archive' | 'edit'
    loading = false,
    ListHeaderComponent,
    ListEmptyComponent,
    onScroll,
    refreshControl,
    contentContainerStyle,
    onEndReached,
    onEndReachedThreshold = 0.5,
    viewMode = 'grid'
}: SiftFeedProps) {
    const { colors, isDark } = useTheme();

    const { width } = useWindowDimensions();
    const layout = getLayoutInfo(width);
    const numColumns = viewMode === 'list' ? 1 : layout.numColumns;
    const columnWidth = viewMode === 'list' ? (width - 40) : layout.columnWidth;

    // Filter out edit-action injection
    const data = pages || [];

    // LOADING STATE
    return (loading && data.length === 0) ? (
        <View style={{ flex: 1, backgroundColor: colors.canvas }}>
            {ListHeaderComponent && (typeof ListHeaderComponent === 'function' ? <ListHeaderComponent /> : ListHeaderComponent)}
            <FeedLoadingScreen message="Loading your gems..." />
        </View>
    ) : (
        <FlashList
            data={data}
            keyExtractor={(item) => (item as any).id}
            numColumns={numColumns}
            extraData={[isDark, mode]} // Re-render when mode changes
            renderItem={({ item, index }) => (
                viewMode === 'list' ? (
                    <PageCard
                        id={item.id}
                        title={item.title}
                        gist={item.summary || ""}
                        url={item.url}
                        tags={item.tags}
                        isPinned={item.is_pinned}
                        imageUrl={item.metadata?.image_url}
                        onPin={onPin}
                        onDelete={onArchive}
                        onDeleteForever={onDeleteForever}
                    />
                ) : (
                    <Card
                        item={item}
                        index={index}
                        numColumns={numColumns}
                        onPin={onPin}
                        onArchive={onArchive}
                        onDeleteForever={onDeleteForever}
                        onEditTags={onEditTags}
                        onOptions={onOptions}
                        onRemove={onRemove}
                        mode={mode}
                    />
                )
            )}
            ListHeaderComponent={ListHeaderComponent}
            ListEmptyComponent={!loading ? ListEmptyComponent : null}
            onScroll={onScroll}
            refreshControl={refreshControl}
            scrollEventThrottle={16}
            removeClippedSubviews={Platform.OS === 'android'}
            contentContainerStyle={{
                paddingHorizontal: 20, // Padded Container governs alignment
                paddingBottom: 40,
                ...contentContainerStyle
            }}
            onEndReached={onEndReached}
            onEndReachedThreshold={onEndReachedThreshold}
        />
    );
}


const styles = StyleSheet.create({
    cardContainer: {
        marginBottom: 8,
        // Soft Lift Shadow for floating effect
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    imageWrapper: {
        // "Delicious Mozzarella" getting lost suggests overlap.
        aspectRatio: 1, // Let's go Square or 0.8 to give room for text
        borderRadius: RADIUS.l,
        overflow: 'hidden',
        position: 'relative'
    },
    fallbackContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.paper,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    // OFF-IMAGE META (Removed/Commented out if not used anymore)
    meta: {
        marginTop: 12,
        gap: 4,
    },
    metadata: {
        fontSize: 13,
        fontFamily: 'System',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    // NEW OVERLAY STYLES
    textOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        paddingBottom: 20,
        justifyContent: 'flex-end',
    },
    overlayTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
        fontFamily: 'PlayfairDisplay_600SemiBold', // Use the new serif
        lineHeight: 24,
    },
    overlayTag: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontFamily: 'Inter_500Medium',
    },
    editOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.1)',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        padding: 10,
    },
    removeBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.danger,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    }
});

