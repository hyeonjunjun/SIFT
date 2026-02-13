import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import {
    TextInput,
    TouchableOpacity,
    View,
    Text,
    Alert,
    Image,
    StyleSheet,
    ScrollView,
    RefreshControl,
    Linking,
    ActionSheetIOS,
    Platform,
    Share
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { CaretLeft, DotsThree, Export, NotePencil, Trash, House, Users, PaperPlaneTilt } from 'phosphor-react-native';
import { Modal, FlatList } from 'react-native';
import { Theme, COLORS, SPACING, RADIUS } from '../../lib/theme';
import { Typography } from '../../components/design-system/Typography';
import { useTheme } from '../../context/ThemeContext';
import { getDomain } from '../../lib/utils';
import SafeContentRenderer from '../../components/SafeContentRenderer';
import { Plus, X, ArrowSquareOut, PlusCircle } from 'phosphor-react-native';
import { ActionSheet } from '../../components/modals/ActionSheet';
import { useAuth } from '../../lib/auth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SiftDetailSkeleton } from '../../components/SiftDetailSkeleton';
import { GestureDetector, Gesture, Directions } from 'react-native-gesture-handler';
import Animated, { SlideInRight, SlideOutLeft, SlideInLeft, SlideOutRight, runOnJS, FadeOut, Easing } from 'react-native-reanimated';

const ALLOWED_TAGS = ["Cooking", "Baking", "Tech", "Health", "Lifestyle", "Professional"];

export default function PageDetail() {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { id, contextType } = useLocalSearchParams();
    const { user } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [content, setContent] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newTag, setNewTag] = useState('');
    const [editedTags, setEditedTags] = useState<string[]>([]);
    const [isShared, setIsShared] = useState(false);
    const [showDirectShare, setShowDirectShare] = useState(false);

    // 1. Fetch Neighbor IDs for Navigation
    const { data: neighborIds } = useQuery({
        queryKey: ['neighbors', contextType, user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            console.log(`[Nav] Fetching neighbors for context: ${contextType}`);

            let query = supabase
                .from('pages')
                .select('id')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(300); // Limit to recent context (Increased from 50 to 300 to allow deeper navigation)

            if (contextType === 'archive') {
                query = query.eq('is_archived', true);
            } else {
                query = query.eq('is_archived', false);
            }

            const { data, error } = await query;
            if (error) {
                console.error('Error fetching neighbors:', error);
                return [];
            }
            return data.map(row => row.id);
        },
        enabled: !!user?.id && !!contextType,
        staleTime: 1000 * 60 * 5 // Cache for 5 mins
    });

    const { prevId, nextId } = useMemo(() => {
        if (!neighborIds || !id) return { prevId: null, nextId: null };
        const currentIndex = neighborIds.indexOf(id as string);
        if (currentIndex === -1) return { prevId: null, nextId: null };

        // List is ordered DESC (Newest First).
        // Index 0 is Newest.
        // Next (Swipe Left) -> Older -> Index + 1
        // Prev (Swipe Right) -> Newer -> Index - 1
        const nextIndex = currentIndex + 1;
        const prevIndex = currentIndex - 1;

        return {
            nextId: nextIndex < neighborIds.length ? neighborIds[nextIndex] : null,
            prevId: prevIndex >= 0 ? neighborIds[prevIndex] : null
        };
    }, [id, neighborIds]);

    // Animation Logic
    const direction = useLocalSearchParams().direction as string;
    const [exitDirection, setExitDirection] = useState<'next' | 'prev' | null>(null);

    const transition = (anim: any) => anim.duration(300).easing(Easing.inOut(Easing.quad));

    const enteringAnimation = useMemo(() => {
        if (direction === 'next') return transition(SlideInRight);
        if (direction === 'prev') return transition(SlideInLeft);
        return undefined;
    }, [direction]);

    const exitingAnimation = useMemo(() => {
        if (exitDirection === 'next') return transition(SlideOutLeft);
        if (exitDirection === 'prev') return transition(SlideOutRight);
        return FadeOut;
    }, [exitDirection]);

    const handleNavigate = (targetId: string, dir: 'next' | 'prev') => {
        if (!targetId) return;
        Haptics.selectionAsync();
        setExitDirection(dir);

        // Small delay to ensure state update renders before unmount
        setTimeout(() => {
            router.replace({
                pathname: `/page/${targetId}`,
                params: { contextType, direction: dir }
            });
        }, 10);
    };

    // 2. Define Gestures
    const swipeLeft = Gesture.Fling()
        .direction(Directions.LEFT)
        .onEnd(() => {
            if (nextId) runOnJS(handleNavigate)(nextId, 'next');
        });

    const swipeRight = Gesture.Fling()
        .direction(Directions.RIGHT)
        .onEnd(() => {
            if (prevId) runOnJS(handleNavigate)(prevId, 'prev');
        });

    const composedGesture = Gesture.Simultaneous(swipeLeft, swipeRight);

    // Helper for Worklets
    // (RunOnJS removed)


    const { data: friends = [] } = useQuery({
        queryKey: ['friendships', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const { data, error } = await supabase
                .from('friendships')
                .select(`
                    *,
                    requester:user_id (id, username, display_name, avatar_url),
                    receiver:friend_id (id, username, display_name, avatar_url)
                `)
                .eq('status', 'accepted')
                .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
            if (error) throw error;
            return data.map((f: any) => f.user_id === user.id ? f.receiver : f.requester);
        },
        enabled: !!user?.id && showDirectShare
    });

    const { data: page, isLoading: loading, isError, refetch } = useQuery({
        queryKey: ['page', id],
        queryFn: async () => {
            if (!id) return null;
            console.log(`[Fetch] Fetching page detail for: ${id}`);
            const { data, error } = await supabase
                .from('pages')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                console.error('Error fetching page:', error);
                throw error;
            }
            return data;
        },
        enabled: !!id,
    });

    useEffect(() => {
        if (page) {
            setIsShared(page.user_id !== user?.id);
            const fullDoc = page.content || `# ${page.title}\n\n> ${page.summary}`;
            setContent(fullDoc);
            setEditedTags(page.tags || []);
        }
    }, [page, user?.id]);

    useEffect(() => {
        if (!id) return;

        const subscription = supabase
            .channel(`page_detail_${id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'pages',
                    filter: `id=eq.${id}`,
                },
                (payload) => {
                    console.log('[Realtime] Page updated:', payload.new.id);
                    queryClient.resetQueries({ queryKey: ['page', id] });
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [id]);

    const onRefresh = async () => {
        setRefreshing(true);
        await queryClient.resetQueries({ queryKey: ['page', id] });
        setRefreshing(false);
    };

    const [actionSheetVisible, setActionSheetVisible] = useState(false);

    const handleMoreOptions = () => {
        setActionSheetVisible(true);
    };

    const handleDelete = async () => {
        Alert.alert(
            "Delete Sift",
            "Are you sure? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const { error } = await supabase.from('pages').delete().eq('id', id);
                            if (error) throw error;
                            router.back();
                        } catch (e: any) {
                            Alert.alert("Error", e.message);
                        }
                    }
                }
            ]
        );
    };

    if (loading && !refreshing) {
        return <SiftDetailSkeleton />;
    }

    if (isError || (!loading && !page)) {
        return (
            <ScreenWrapper edges={['top', 'bottom']}>
                <View style={styles.navBar}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.navButton}>
                        <CaretLeft size={28} color={colors.ink} />
                    </TouchableOpacity>
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                    <Typography variant="h1" style={{ marginBottom: 12, textAlign: 'center' }}>Sift not found</Typography>
                    <Typography variant="body" color="stone" style={{ textAlign: 'center', marginBottom: 24 }}>
                        This sift may have been deleted or moved.
                    </Typography>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={[styles.bentoCard, { backgroundColor: colors.ink }]}
                    >
                        <Typography variant="label" style={{ color: colors.paper }}>Go Back</Typography>
                    </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }

    const handleSaveToLibrary = async () => {
        if (!page) return;
        setSaving(true);
        try {
            const { id: _, created_at: __, ...pageData } = page;
            const { data, error } = await supabase
                .from('pages')
                .insert([{
                    ...pageData,
                    user_id: user?.id,
                    created_at: new Date().toISOString(),
                    is_pinned: false,
                    is_archived: false,
                    metadata: {
                        ...page.metadata,
                        shared_from: page.user_id,
                        original_id: page.id
                    }
                }])
                .select()
                .single();

            if (error) throw error;

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            // We don't use Alert.alert here for a smoother flow, just redirect to the NEW localized version
            router.replace({
                pathname: `/page/${data.id}`,
                params: { contextType }
            });
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleShare = async () => {
        if (!page) return;
        try {
            const shareUrl = `https://sift-rho.vercel.app/share/${id}`;
            await Share.share({
                message: `Check out this Sift: ${page.title}\n\n${shareUrl}`,
                url: shareUrl,
            });
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };



    const handleDirectShare = async (friendId: string) => {
        try {
            const { error } = await supabase
                .from('sift_shares')
                .insert([{
                    sift_id: id,
                    sender_id: user?.id,
                    receiver_id: friendId
                }]);
            if (error) throw error;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowDirectShare(false);
            Alert.alert("Sent!", "Sift shared with your friend.");
        } catch (e: any) {
            Alert.alert("Error", e.message);
        }
    };
    const handleSave = async () => {
        if (!page) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('pages')
                .update({
                    content: content,
                    tags: editedTags
                })
                .eq('id', id);

            if (error) throw error;
            setIsEditing(false);
            queryClient.resetQueries({ queryKey: ['page', id] });
            queryClient.resetQueries({ queryKey: ['pages', user?.id] });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <GestureDetector gesture={composedGesture}>
            <View collapsable={false} style={{ flex: 1 }}>
                <ScreenWrapper edges={['top', 'bottom']}>
                    <Stack.Screen options={{ headerShown: false, animation: 'none' }} />

                    <Animated.View
                        style={{ flex: 1 }}
                        entering={enteringAnimation}
                        exiting={exitingAnimation}
                    >
                        {/* Standardized Header */}
                        <View style={styles.navBar}>
                            <TouchableOpacity
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    router.back();
                                }}
                                style={styles.navButton}
                            >
                                <CaretLeft size={28} color={colors.ink} />
                            </TouchableOpacity>
                            <View style={styles.headerTitleBox}>
                                <Typography variant="label" color="stone" style={styles.smallCapsLabel}>SAVED • ARTIFACT</Typography>
                                <Typography variant="h1" numberOfLines={1} style={styles.serifTitle}>{page?.title || 'Loading...'}</Typography>
                            </View>
                            <TouchableOpacity onPress={handleMoreOptions} style={styles.navButton}>
                                <DotsThree size={28} color={colors.ink} />
                            </TouchableOpacity>
                            {isShared && (
                                <TouchableOpacity
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        router.replace('/(tabs)/');
                                    }}
                                    style={[styles.navButton, { marginLeft: 8 }]}
                                >
                                    <House size={28} color={colors.ink} />
                                </TouchableOpacity>
                            )}
                        </View>

                        <ScrollView
                            contentContainerStyle={styles.scrollContent}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />}
                        >
                            {/* Card 1: Image */}
                            {page?.metadata?.image_url && (
                                <View style={styles.imageWrapper}>
                                    <Image
                                        source={{ uri: page.metadata.image_url }}
                                        style={{ width: '100%', height: 240 }}
                                        resizeMode="cover"
                                    />
                                </View>
                            )}

                            {/* Card 2: Header Info */}
                            <View style={[styles.bentoCard, { backgroundColor: colors.paper, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)' }]}>
                                <View style={styles.tagRow}>
                                    {isEditing ? (
                                        <View style={styles.tagEditor}>
                                            <View style={styles.tagList}>
                                                {ALLOWED_TAGS.map(tag => (
                                                    <TouchableOpacity
                                                        key={tag}
                                                        style={[
                                                            styles.tagPill,
                                                            { backgroundColor: colors.canvas, borderColor: colors.separator },
                                                            editedTags.includes(tag) && { backgroundColor: colors.ink, borderColor: colors.ink }
                                                        ]}
                                                        onPress={() => {
                                                            if (editedTags.includes(tag)) {
                                                                setEditedTags(editedTags.filter(t => t !== tag));
                                                            } else {
                                                                setEditedTags([...editedTags, tag]);
                                                            }
                                                        }}
                                                    >
                                                        <Typography variant="caption" style={{ color: editedTags.includes(tag) ? colors.paper : colors.stone }}>
                                                            {tag}
                                                        </Typography>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                            <View style={styles.customTagInput}>
                                                <TextInput
                                                    style={[styles.smallInput, { backgroundColor: colors.paper, borderColor: colors.separator, color: colors.ink }]}
                                                    placeholder="Add custom tag..."
                                                    placeholderTextColor={colors.stone}
                                                    value={newTag}
                                                    onChangeText={setNewTag}
                                                    onSubmitEditing={() => {
                                                        if (newTag.trim() && !editedTags.includes(newTag.trim())) {
                                                            setEditedTags([...editedTags, newTag.trim()]);
                                                            setNewTag('');
                                                        }
                                                    }}
                                                />
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        if (newTag.trim() && !editedTags.includes(newTag.trim())) {
                                                            setEditedTags([...editedTags, newTag.trim()]);
                                                            setNewTag('');
                                                        }
                                                    }}
                                                >
                                                    <Plus size={20} color={colors.ink} />
                                                </TouchableOpacity>
                                            </View>
                                            <View style={styles.tagList}>
                                                {editedTags.filter(t => !ALLOWED_TAGS.includes(t)).map(tag => (
                                                    <View key={tag} style={[styles.customTagPill, { backgroundColor: isDark ? colors.subtle : '#E5E5E5' }]}>
                                                        <Typography variant="caption" color="ink">{tag}</Typography>
                                                        <TouchableOpacity onPress={() => setEditedTags(editedTags.filter(t => t !== tag))}>
                                                            <X size={14} color={colors.stone} style={{ marginLeft: 4 }} />
                                                        </TouchableOpacity>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    ) : (
                                        <Typography variant="label" color="stone" style={styles.metaLabel}>
                                            {page?.tags?.join(' • ') || 'SAVED'} • {page?.created_at ? new Date(page.created_at).toLocaleDateString() : 'Recent'}
                                        </Typography>
                                    )}
                                </View>
                                <Typography variant="h1" style={{ marginBottom: 12 }}>
                                    {page?.title || 'Sifting...'}
                                </Typography>
                                <View style={styles.sourceRow}>
                                    <Image
                                        source={{ uri: `https://www.google.com/s2/favicons?domain=${getDomain(page?.url)}` }}
                                        style={styles.favicon}
                                    />
                                    <Typography variant="caption">
                                        {getDomain(page?.url)}
                                    </Typography>
                                </View>
                            </View>

                            {/* Card 3: Actions (2 cols) */}
                            <View style={{ flexDirection: 'row', gap: 16 }}>
                                <TouchableOpacity
                                    style={[
                                        styles.bentoCard,
                                        styles.actionCard,
                                        { flex: 1, backgroundColor: colors.paper, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)' },
                                        isEditing && { borderColor: colors.ink, borderWidth: 1 }
                                    ]}
                                    onPress={() => {
                                        if (isEditing) {
                                            handleSave();
                                        } else {
                                            if (isShared) {
                                                handleSaveToLibrary();
                                            } else {
                                                if (page?.url) Linking.openURL(page.url);
                                            }
                                        }
                                    }}
                                >
                                    {isEditing ? (
                                        <NotePencil size={24} color={colors.ink} weight="fill" style={{ marginBottom: 8 }} />
                                    ) : (
                                        isShared ? (
                                            <PlusCircle size={24} color={colors.ink} weight="fill" style={{ marginBottom: 8 }} />
                                        ) : (
                                            <ArrowSquareOut size={24} color={colors.stone} weight="thin" style={{ marginBottom: 8 }} />
                                        )
                                    )}
                                    <Typography variant="label" color={isEditing || isShared ? "ink" : "stone"}>
                                        {isEditing ? (saving ? 'Saving...' : 'Save') : (isShared ? (saving ? 'Adding...' : 'Add to My Library') : 'View Original')}
                                    </Typography>
                                </TouchableOpacity>
                                {!isEditing && (
                                    <>
                                        <TouchableOpacity
                                            style={[styles.bentoCard, styles.actionCard, { flex: 1, backgroundColor: colors.paper, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)' }]}
                                            onPress={() => setShowDirectShare(true)}
                                        >
                                            <PaperPlaneTilt size={24} color={colors.stone} weight="thin" style={{ marginBottom: 8 }} />
                                            <Typography variant="label" color="stone">Send</Typography>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.bentoCard, styles.actionCard, { flex: 1, backgroundColor: colors.paper, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)' }]}
                                            onPress={handleShare}
                                        >
                                            <Export size={24} color={colors.stone} weight="thin" style={{ marginBottom: 8 }} />
                                            <Typography variant="label" color="stone">Share</Typography>
                                        </TouchableOpacity>
                                    </>
                                )}
                                {isEditing && (
                                    <TouchableOpacity
                                        style={[styles.bentoCard, styles.actionCard, { flex: 1, backgroundColor: colors.paper, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)' }]}
                                        onPress={() => {
                                            setIsEditing(false);
                                            setEditedTags(page.tags || []);
                                            setContent(page.content || `# ${page.title}\n\n> ${page.summary}`);
                                        }}
                                    >
                                        <X size={24} color="#EF4444" weight="thin" style={{ marginBottom: 8 }} />
                                        <Typography variant="label" style={{ color: '#EF4444' }}>Cancel</Typography>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Card 4: Editorial Content (Reader View) */}
                            <View style={{
                                minHeight: 400,
                                paddingHorizontal: 4, // Allow text to breathe 
                                paddingTop: 16
                            }}>
                                {!isEditing ? (
                                    <SafeContentRenderer content={content} />
                                ) : (
                                    <TextInput
                                        style={{ fontSize: 18, lineHeight: 30, color: colors.ink, fontFamily: 'Lora_400Regular' }}
                                        multiline
                                        scrollEnabled={false}
                                        value={content}
                                        onChangeText={setContent}
                                    />
                                )}
                            </View>

                        </ScrollView>
                    </Animated.View>
                </ScreenWrapper>

                <Modal
                    visible={showDirectShare}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowDirectShare(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: colors.paper, paddingBottom: insets.bottom + 20 }]}>
                            <View style={styles.modalHeader}>
                                <Typography variant="h3">Send to Friend</Typography>
                                <TouchableOpacity onPress={() => setShowDirectShare(false)}>
                                    <X size={24} color={colors.ink} />
                                </TouchableOpacity>
                            </View>

                            {friends.length === 0 ? (
                                <View style={{ padding: 40, alignItems: 'center' }}>
                                    <Typography variant="body" color="stone" style={{ textAlign: 'center' }}>
                                        No friends found. Add friends in the Social tab to share sifts directly.
                                    </Typography>
                                </View>
                            ) : (
                                <FlatList
                                    data={friends}
                                    keyExtractor={(item: any) => item.id}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={styles.friendSelectItem}
                                            onPress={() => handleDirectShare(item.id)}
                                        >
                                            <Image source={item.avatar_url} style={styles.miniAvatar} />
                                            <Typography variant="body" style={{ marginLeft: 12 }}>{item.display_name}</Typography>
                                        </TouchableOpacity>
                                    )}
                                    contentContainerStyle={{ paddingBottom: 40 }}
                                />
                            )}
                        </View>
                    </View>
                </Modal>
            </View>
            <ActionSheet
                visible={actionSheetVisible}
                onClose={() => setActionSheetVisible(false)}
                title="Manage Sift"
                options={[
                    {
                        label: 'Edit Sift',
                        icon: require('phosphor-react-native').PencilSimple,
                        onPress: () => setIsEditing(true)
                    },
                    {
                        label: 'Delete Sift',
                        icon: require('phosphor-react-native').Trash,
                        isDestructive: true,
                        onPress: handleDelete
                    },
                    {
                        label: 'Cancel',
                        isCancel: true,
                        onPress: () => { }
                    }
                ]}
            />
        </View>
    </GestureDetector >
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    navBar: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 12,
        alignItems: 'flex-start',
    },
    navButton: {
        marginTop: 4,
    },
    headerTitleBox: {
        flex: 1,
        marginHorizontal: 16,
    },
    smallCapsLabel: {
        marginBottom: 2,
    },
    serifTitle: {
        fontSize: 20,
        fontFamily: 'PlayfairDisplay_700Bold',
    },
    scrollContent: {
        paddingHorizontal: 24, // Wider margins for editorial feel
        paddingBottom: 140,
        gap: 16,
    },
    bentoCard: {
        borderRadius: RADIUS.m,
        padding: 24, // Increased for Hygge breath
        borderWidth: StyleSheet.hairlineWidth,
        // @ts-ignore
        cornerCurve: 'continuous',
        ...Theme.shadows.soft,
    },
    imageWrapper: {
        borderRadius: RADIUS.m,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        // @ts-ignore
        cornerCurve: 'continuous',
    },
    actionCard: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    tagRow: {
        marginBottom: 8,
    },
    metaLabel: {
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sourceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        alignSelf: 'flex-start',
    },
    favicon: {
        width: 14,
        height: 14,
        marginRight: 6,
        borderRadius: 2,
    },
    tagEditor: {
        marginBottom: 16,
    },
    tagList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    tagPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: StyleSheet.hairlineWidth,
    },
    tagPillActive: {
        // Handled dynamically
    },
    customTagPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 16,
    },
    customTagInput: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    smallInput: {
        flex: 1,
        height: 36,
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 14,
        borderWidth: StyleSheet.hairlineWidth,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
        padding: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    friendSelectItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.separator,
    },
    miniAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    }
});
