import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable, ActionSheetIOS, Alert, Platform, FlatList } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Typography } from './design-system/Typography';
import { ArrowClockwise, Warning } from 'phosphor-react-native';
import { Image } from 'expo-image';
import { useTheme } from '../context/ThemeContext';
import { RADIUS } from '../lib/theme';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface SiftItem {
    id: string;
    title: string;
    url: string;
    tags?: string[];
    created_at: string;
    metadata?: {
        image_url?: string;
        category?: string;
        status?: string;
    };
}

interface PendingSift {
    id: string;
    url: string;
    status: 'pending' | 'processing' | 'failed' | 'completed';
    error_message?: string;
    retry_count: number;
    created_at: string;
}

interface CompactSiftListProps {
    pages: SiftItem[];
    pendingSifts?: PendingSift[];
    onRetry?: (id: string, url: string) => void;
    onArchive?: (id: string) => void;
    onEditTags?: (id: string, currentTags: string[]) => void;
    refreshControl?: any;
    contentContainerStyle?: any;
    onEndReached?: () => void;
}

const ROW_HEIGHT = 64; // Exact match to image height

console.log('[CompactSiftList] STRICT 64px Layout Active');

export default function CompactSiftList({
    pages,
    pendingSifts = [],
    onRetry,
    onArchive,
    onEditTags,
    refreshControl,
    contentContainerStyle,
    onEndReached,
}: CompactSiftListProps) {
    const { colors, isDark } = useTheme();
    const router = useRouter();

    const combinedData = useMemo(() => {
        const failedItems = pendingSifts
            .filter(p => p.status === 'failed' || p.status === 'pending' || p.status === 'processing')
            .map(p => ({
                id: p.id,
                type: 'pending' as const,
                url: p.url,
                status: p.status,
                error_message: p.error_message,
                created_at: p.created_at,
                retry_count: p.retry_count,
            }));

        const pageItems = pages.map(p => ({
            id: p.id,
            type: 'page' as const,
            title: p.title,
            url: p.url,
            image_url: p.metadata?.image_url,
            category: p.metadata?.category || p.tags?.[0],
            created_at: p.created_at,
            tags: p.tags || [],
        }));

        return [...failedItems, ...pageItems];
    }, [pages, pendingSifts]);

    const getDomain = (url: string) => {
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch {
            return url;
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHrs = diffMs / (1000 * 60 * 60);

        if (diffHrs < 1) return 'Just now';
        if (diffHrs < 24) return `${Math.floor(diffHrs)}h ago`;
        if (diffHrs < 48) return 'Yesterday';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const renderItem = ({ item }: { item: typeof combinedData[0] }) => {
        if (item.type === 'pending') {
            return (
                <PendingRow
                    item={item}
                    colors={colors}
                    onRetry={onRetry}
                    getDomain={getDomain}
                    formatDate={formatDate}
                />
            );
        }

        return (
            <PageRow
                item={item}
                colors={colors}
                isDark={isDark}
                router={router}
                onArchive={onArchive}
                onEditTags={onEditTags}
                getDomain={getDomain}
                formatDate={formatDate}
            />
        );
    };

    const renderSeparator = () => (
        <View style={{ height: 8 }} />
    );

    return (
        <FlatList
            data={combinedData}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            refreshControl={refreshControl}
            contentContainerStyle={contentContainerStyle}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.5}
            ItemSeparatorComponent={renderSeparator}
            getItemLayout={(_, index) => ({
                length: ROW_HEIGHT + 8, // Row + Separator
                offset: (ROW_HEIGHT + 8) * index,
                index,
            })}
        />
    );
}

// Pending/Failed row component
const PendingRow = React.memo(({ item, colors, onRetry, getDomain, formatDate }: any) => {
    const isFailed = item.status === 'failed';
    const isProcessing = item.status === 'processing';

    const handleRetry = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onRetry?.(item.id, item.url);
    };

    return (
        <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
            style={[styles.row, { backgroundColor: isFailed ? `${colors.danger}10` : 'transparent' }]}
        >
            <View style={styles.innerRow}>
                {/* Status indicator */}
                <View style={[styles.thumbnail, styles.pendingThumbnail, { backgroundColor: isFailed ? colors.danger : colors.stone }]}>
                    {isFailed ? (
                        <Warning size={20} color={colors.paper} weight="bold" />
                    ) : (
                        <ArrowClockwise size={20} color={colors.paper} weight="bold" />
                    )}
                </View>

                {/* Content */}
                <View style={styles.contentContainer}>
                    <Typography variant="body" numberOfLines={1} style={[styles.title, { color: colors.ink }]}>
                        {getDomain(item.url)}
                    </Typography>
                    <Typography variant="caption" numberOfLines={1} style={{ color: isFailed ? colors.danger : colors.stone }}>
                        {isFailed ? (item.error_message || 'Failed to process') : (isProcessing ? 'Processing...' : 'Pending...')}
                    </Typography>
                </View>

                {/* Retry button */}
                {isFailed && (
                    <Pressable onPress={handleRetry} style={styles.retryButton} hitSlop={12}>
                        <ArrowClockwise size={20} color={colors.ink} weight="bold" />
                    </Pressable>
                )}
            </View>
        </Animated.View>
    );
});

// Page row component
export const PageRow = React.memo(({ item, colors, isDark, router, onArchive, onEditTags, getDomain, formatDate }: any) => {
    const handlePress = () => {
        Haptics.selectionAsync();
        router.push(`/page/${item.id}`);
    };

    const handleLongPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Cancel', 'Edit Tags', 'Archive'],
                    destructiveButtonIndex: 2,
                    cancelButtonIndex: 0,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) onEditTags?.(item.id, item.tags);
                    if (buttonIndex === 2) onArchive?.(item.id);
                }
            );
        } else {
            Alert.alert(item.title || 'Sift', 'Choose an action', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Edit Tags', onPress: () => onEditTags?.(item.id, item.tags) },
                { text: 'Archive', style: 'destructive', onPress: () => onArchive?.(item.id) },
            ]);
        }
    };

    return (
        <Pressable
            onPress={handlePress}
            onLongPress={handleLongPress}
            delayLongPress={300}
            style={({ pressed }) => [
                styles.pageRow,
                {
                    backgroundColor: colors.paper,
                    opacity: pressed ? 0.9 : 1,
                }
            ]}
        >
            <View style={styles.innerRow}>
                {/* Thumbnail - Fixed Left */}
                <View style={[styles.thumbnail, { backgroundColor: colors.subtle }]}>
                    {item.image_url ? (
                        <Image
                            source={{ uri: item.image_url }}
                            style={styles.thumbnailImage}
                            contentFit="cover"
                            transition={200}
                        />
                    ) : (
                        <Typography variant="h1" style={[styles.fallbackLetter, { color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }]}>
                            {(item.title || 'S').charAt(0).toUpperCase()}
                        </Typography>
                    )}
                </View>

                {/* Content - Horizontal Columns */}
                <View style={styles.contentContainer}>
                    {/* Col 1: Title */}
                    <Typography variant="body" numberOfLines={1} style={[styles.title, { color: colors.ink }]}>
                        {item.title || 'Untitled'}
                    </Typography>

                    {/* Col 2: Domain */}
                    <Typography variant="caption" numberOfLines={1} style={[styles.domain, { color: colors.stone }]}>
                        {getDomain(item.url)}
                    </Typography>

                    {/* Col 3: Recency */}
                    <Typography variant="caption" style={[styles.date, { color: colors.stone }]}>
                        {formatDate(item.created_at)}
                    </Typography>
                </View>
            </View>
        </Pressable>
    );
});

const styles = StyleSheet.create({
    row: {
        height: 64,
        overflow: 'hidden',
    },
    pageRow: {
        height: 64, // EXACT HEIGHT MATCH
        overflow: 'hidden',
    },
    innerRow: {
        flex: 1,
        flexDirection: 'row', // STRICTLY HORIZONTAL
        alignItems: 'center',
        paddingHorizontal: 20, // Strict 20px padding from edges
    },
    thumbnail: {
        width: 64,
        height: 64,
        borderRadius: RADIUS.m, // Design System Radius
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginRight: 0, // margin handled by paddingLeft of content
    },
    pendingThumbnail: {
        opacity: 0.9,
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
    },
    fallbackLetter: {
        fontSize: 28,
        fontWeight: '700',
    },
    contentContainer: {
        flex: 1,
        flexDirection: 'row', // STRICTLY HORIZONTAL
        alignItems: 'center',
        height: '100%',
        paddingLeft: 16,
    },
    title: {
        flex: 1, // Main content takes remaining space
        fontSize: 15,
        fontWeight: '600',
        lineHeight: 20,
        marginRight: 12,
    },
    domain: {
        width: 90, // Fixed column width for alignment
        fontSize: 13,
        lineHeight: 16,
        marginRight: 8,
        textAlign: 'left',
    },
    date: {
        width: 60, // Fixed column width for alignment
        fontSize: 13,
        lineHeight: 16,
        textAlign: 'right',
        flexShrink: 0,
    },
    retryButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
