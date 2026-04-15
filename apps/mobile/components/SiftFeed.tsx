import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable, Alert, Platform, useWindowDimensions, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, TRANSITIONS, Theme, OVERLAYS, SPACING } from '../lib/theme';
import { getDomain } from '../lib/utils';
import { Typography } from './design-system/Typography';
import { Article, Video } from 'phosphor-react-native';
import PinIcon from './PinIcon';
import Animated, { FadeIn, FadeOut, Layout, Easing, useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Minus, SquaresFour, Rows, CheckCircle, ListDashes } from 'phosphor-react-native';
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
        source?: string;
        error?: string;
        retry_count?: number;
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
    mode?: 'feed' | 'archive' | 'edit' | 'reorder';
    loading?: boolean;
    ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
    ListEmptyComponent?: React.ComponentType<any> | React.ReactElement | null;
    onScroll?: (event: any) => void;
    refreshControl?: any;
    contentContainerStyle?: any;
    onEndReached?: () => void;
    onEndReachedThreshold?: number;
    viewMode?: 'grid' | 'list';
    // Reorder
    onDragEnd?: (data: Page[]) => void;
    // Multi-select
    isSelectMode?: boolean;
    selectedIds?: Set<string>;
    onToggleSelect?: (id: string) => void;
    onEnterSelectMode?: (id: string) => void;
    onRetry?: (id: string, url: string) => void;
}

const GRID_PADDING = SPACING.l;
const GRID_GAP = SPACING.m;

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

const Card = React.memo(({ item: page, index, numColumns = 2, onPin, onArchive, onDeleteForever, onEditTags, onOptions, onRemove, onRetry, mode = 'feed', isSelectMode, isSelected, onToggleSelect, onEnterSelectMode }: {
    item: Page,
    index: number,
    numColumns?: number,
    onPin?: (id: string) => void,
    onArchive?: (id: string) => void,
    onDeleteForever?: (id: string) => void,
    onEditTags?: (id: string, currentTags: string[]) => void,
    onOptions?: (item: any) => void,
    onRemove?: (id: string) => void,
    onRetry?: (id: string, url: string) => void,
    mode?: 'feed' | 'archive' | 'edit' | 'reorder',
    isSelectMode?: boolean,
    isSelected?: boolean,
    onToggleSelect?: (id: string) => void,
    onEnterSelectMode?: (id: string) => void,
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
            debug_info: page.metadata?.debug_info,
            metadata: page.metadata,
        };
    }, [page]);

    const handlePress = () => {
        if (isSelectMode) {
            onToggleSelect?.(item.id);
            Haptics.selectionAsync();
            return;
        }
        if (mode === 'edit') {
            onRemove?.(item.id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            return;
        }
        Haptics.selectionAsync();
        router.push({
            pathname: `/page/${item.id}`,
            params: {
                contextType: mode === 'feed' ? 'feed' : 'archive',
                previewTitle: item.title || '',
                previewSummary: item.summary || '',
                previewImage: item.metadata?.image_url || '',
                previewTags: item.rawTags.join(','),
                previewSource: item.source || '',
            }
        });
    };

    const handleRemove = () => {
        onRemove?.(item.id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const handleLongPress = () => {
        if (isSelectMode) return; // Already in select mode
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
            }, shakeAnimation, isSelected && { opacity: 0.85 }]}
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
                        <View style={[styles.fallbackContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.subtle }]}>
                            <Typography variant="caption" color="stone" style={{ fontWeight: '600', letterSpacing: 0.5, marginBottom: 6 }}>
                                {isStale ? "TIMED OUT" : "COULDN'T SAVE"}
                            </Typography>
                            <Typography variant="caption" color="stone" style={{ textAlign: 'center', marginBottom: SPACING.m - 4, paddingHorizontal: SPACING.m, opacity: 0.7 }} numberOfLines={1}>
                                {getDomain(page.url) || 'this recipe'}
                            </Typography>
                            {(!item.metadata?.retry_count || item.metadata.retry_count < 3) ? (
                                <Pressable
                                    onPress={(e) => { e.stopPropagation(); onRetry?.(item.id, page.url); }}
                                    style={{ backgroundColor: colors.ink, paddingHorizontal: SPACING.l, paddingVertical: SPACING.s + 2, borderRadius: RADIUS.pill }}
                                >
                                    <Typography variant="label" style={{ color: colors.paper, fontSize: 12 }}>Retry</Typography>
                                </Pressable>
                            ) : (
                                <Typography variant="caption" color="stone" style={{ opacity: 0.5 }}>
                                    Couldn't process this link
                                </Typography>
                            )}
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
                            cachePolicy="memory-disk"
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
                            top: SPACING.m - 4,
                            right: SPACING.m - 4,
                            zIndex: 10,
                            backgroundColor: item.is_pinned
                                ? (isDark ? OVERLAYS.dark.scrim : OVERLAYS.light.glass)
                                : OVERLAYS.light.glass,
                            padding: SPACING.s - 2,
                            borderRadius: RADIUS.pill,
                            ...Theme.shadows.soft
                        }}
                    >
                        <PinIcon
                            size={10}
                            color={item.is_pinned ? colors.accent : OVERLAYS.light.scrim}
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
                            colors={['transparent', OVERLAYS.light.imageFade, OVERLAYS.dark.scrim]}
                            locations={[0.4, 0.7, 1]}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.textOverlay}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.s }}>
                                <Typography variant="label" style={styles.overlayTag}>
                                    {item.category || 'General'}
                                </Typography>
                                {item.is_pinned && (
                                    <View style={{ marginLeft: SPACING.s - 2, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.paper }} />
                                )}
                            </View>
                            <Typography
                                variant="h2"
                                style={[styles.overlayTitle, { fontSize: 18, lineHeight: 24 }]}
                                numberOfLines={2}
                                ellipsizeMode="tail"
                            >
                                {item.title || 'Untitled'}
                            </Typography>
                        </View>
                    </Animated.View>

                    {/* Checkbox / Remove Overlay for Edit Mode */}
                    {mode === 'edit' && (
                        <View style={styles.editOverlay}>
                            <View style={styles.removeBadge}>
                                <Minus size={16} color={colors.paper} weight="bold" />
                            </View>
                        </View>
                    )}

                    {/* Selection checkmark overlay */}
                    {isSelectMode && (
                        <View style={styles.selectOverlay}>
                            <View style={[
                                styles.selectBadge,
                                isSelected && styles.selectBadgeActive
                            ]}>
                                {isSelected && <CheckCircle size={24} color={colors.paper} weight="fill" />}
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
    mode = 'feed',
    loading = false,
    ListHeaderComponent,
    ListEmptyComponent,
    onScroll,
    refreshControl,
    contentContainerStyle,
    onEndReached,
    onEndReachedThreshold = 0.5,
    viewMode = 'grid',
    isSelectMode = false,
    selectedIds,
    onToggleSelect,
    onEnterSelectMode,
    onDragEnd,
    onRetry,
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
            <FeedLoadingScreen message="Loading your sifts..." />
        </View>
    ) : mode === 'reorder' ? (
        <DraggableFlatList
            data={data}
            onDragEnd={({ data }) => onDragEnd?.(data)}
            keyExtractor={(item) => (item as any).id}
            keyboardDismissMode="on-drag"
            renderItem={({ item, drag, isActive }: RenderItemParams<Page>) => (
                <ScaleDecorator>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onLongPress={drag}
                        disabled={isActive}
                        style={{
                            opacity: isActive ? 0.8 : 1,
                            marginVertical: SPACING.s - 2,
                            backgroundColor: colors.paper,
                            borderRadius: RADIUS.m,
                            borderWidth: isDark ? 1 : 0,
                            borderColor: OVERLAYS.dark.hover,
                            padding: SPACING.m - 4,
                            ...Theme.shadows.soft,
                            shadowOpacity: isActive ? 0.2 : 0.05,
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                            <TouchableOpacity onPressIn={drag} hitSlop={10} style={{ paddingRight: SPACING.m - 4 }}>
                                <ListDashes size={24} color={colors.stone} weight="bold" />
                            </TouchableOpacity>

                            {item.metadata?.image_url ? (
                                <Image
                                    source={item.metadata.image_url}
                                    style={{ width: 48, height: 48, borderRadius: RADIUS.s, backgroundColor: colors.subtle, marginRight: SPACING.m - 4 }}
                                    contentFit="cover"
                                    cachePolicy="memory-disk"
                                />
                            ) : (
                                <View style={{ width: 48, height: 48, borderRadius: RADIUS.s, backgroundColor: colors.subtle, marginRight: SPACING.m - 4, justifyContent: 'center', alignItems: 'center' }}>
                                    <Article size={24} color={colors.stone} weight="thin" />
                                </View>
                            )}

                            <View style={{ flex: 1, justifyContent: 'center' }}>
                                <Typography
                                    variant="caption"
                                    color="stone"
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                    style={{ textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.xs }}
                                >
                                    {getDomain(item.url) || 'SIFT'}
                                </Typography>
                                <Typography
                                    variant="bodyMedium"
                                    color="ink"
                                    numberOfLines={2}
                                    ellipsizeMode="tail"
                                >
                                    {item.title || 'Untitled Page'}
                                </Typography>
                            </View>
                        </View>
                    </TouchableOpacity>
                </ScaleDecorator>
            )}
            ListHeaderComponent={ListHeaderComponent}
            ListEmptyComponent={!loading ? ListEmptyComponent : null}
            onScroll={onScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{
                paddingHorizontal: SPACING.l,
                paddingBottom: SPACING.xxl - 8,
                ...contentContainerStyle
            }}
        />
    ) : (
        <FlashList
            data={data}
            keyExtractor={(item) => (item as any).id}
            numColumns={numColumns}
            keyboardDismissMode="on-drag"
            extraData={[isDark, mode, isSelectMode, selectedIds]} // Re-render when mode/selection changes
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
                        isSelected={selectedIds?.has(item.id)}
                        onToggleSelect={onToggleSelect}
                        onEnterSelectMode={onEnterSelectMode}
                        onRetry={onRetry}
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
                paddingHorizontal: SPACING.l,
                paddingBottom: SPACING.xxl - 8,
                ...contentContainerStyle
            }}
            onEndReached={onEndReached}
            onEndReachedThreshold={onEndReachedThreshold}
        />
    );
}


const styles = StyleSheet.create({
    cardContainer: {
        marginBottom: SPACING.s,
        ...Theme.shadows.soft,
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
    textOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: SPACING.m,
        paddingBottom: SPACING.l - 4,
        justifyContent: 'flex-end',
    },
    overlayTitle: {
        color: COLORS.paper,
        textShadowColor: OVERLAYS.light.imageFade,
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    overlayTag: {
        color: COLORS.paper,
        opacity: 0.9,
    },
    editOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: OVERLAYS.light.pressed,
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        padding: SPACING.s + 2,
    },
    removeBadge: {
        width: 28,
        height: 28,
        borderRadius: RADIUS.pill,
        backgroundColor: COLORS.danger,
        justifyContent: 'center',
        alignItems: 'center',
        ...Theme.shadows.sharp,
        shadowOpacity: 0.2,
    },
    selectOverlay: {
        position: 'absolute',
        top: SPACING.s + 2,
        left: SPACING.s + 2,
        zIndex: 20,
    },
    selectBadge: {
        width: 26,
        height: 26,
        borderRadius: RADIUS.pill,
        borderWidth: 2,
        borderColor: OVERLAYS.light.glass,
        backgroundColor: OVERLAYS.light.imageFade,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectBadgeActive: {
        borderColor: COLORS.accent,
        backgroundColor: COLORS.accent,
    },
});
