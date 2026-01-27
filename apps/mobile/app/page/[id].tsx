import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { useEffect, useState } from 'react';
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
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { CaretLeft, DotsThree, Export, NotePencil, Trash } from 'phosphor-react-native';
import { Theme, COLORS, SPACING } from '../../lib/theme';
import { Typography } from '../../components/design-system/Typography';
import { getDomain } from '../../lib/utils';
import SafeContentRenderer from '../../components/SafeContentRenderer';
import { Plus, X, ArrowSquareOut, PlusCircle } from 'phosphor-react-native';
import { useAuth } from '../../lib/auth';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const ALLOWED_TAGS = ["Cooking", "Baking", "Tech", "Health", "Lifestyle", "Professional"];

export default function PageDetail() {
    const { id } = useLocalSearchParams();
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

    const { data: page, isLoading: loading, refetch } = useQuery({
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
                    queryClient.invalidateQueries({ queryKey: ['page', id] });
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [id]);

    const onRefresh = async () => {
        setRefreshing(true);
        await queryClient.invalidateQueries({ queryKey: ['page', id] });
        setRefreshing(false);
    };

    const handleMoreOptions = () => {
        const options = ['Cancel', 'Edit Sift', 'Delete Sift'];
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    cancelButtonIndex: 0,
                    destructiveButtonIndex: 2,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) setIsEditing(true);
                    if (buttonIndex === 2) handleDelete();
                }
            );
        } else {
            Alert.alert(
                "Options",
                "Manage this Sift",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Edit Sift", onPress: () => setIsEditing(true) },
                    { text: "Delete", style: "destructive", onPress: handleDelete }
                ]
            );
        }
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
        return <View style={styles.container} />;
    }

    const handleSaveToLibrary = async () => {
        if (!page) return;
        setSaving(true);
        try {
            const { data, error } = await supabase
                .from('pages')
                .insert([{
                    ...page,
                    id: undefined, // New ID
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
            Alert.alert('Success', 'Added to your library!');
            router.replace(`/page/${data.id}`);
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
            queryClient.invalidateQueries({ queryKey: ['page', id] });
            queryClient.invalidateQueries({ queryKey: ['pages'] }); // Invalidate home feed too
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Standardized Header */}
            <View style={styles.navBar}>
                <TouchableOpacity
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.back();
                    }}
                    style={styles.navButton}
                >
                    <CaretLeft size={28} color={COLORS.ink} />
                </TouchableOpacity>
                <View style={styles.headerTitleBox}>
                    <Typography variant="label" color={COLORS.stone} style={styles.smallCapsLabel}>SAVED ARTIFACT</Typography>
                    <Typography variant="h1" numberOfLines={1} style={styles.serifTitle}>{page?.title || 'Loading...'}</Typography>
                </View>
                <TouchableOpacity onPress={handleMoreOptions} style={styles.navButton}>
                    <DotsThree size={28} color={COLORS.ink} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.ink} />}
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
                <View style={styles.bentoCard}>
                    <View style={styles.tagRow}>
                        {isEditing ? (
                            <View style={styles.tagEditor}>
                                <View style={styles.tagList}>
                                    {ALLOWED_TAGS.map(tag => (
                                        <TouchableOpacity
                                            key={tag}
                                            style={[styles.tagPill, editedTags.includes(tag) && styles.tagPillActive]}
                                            onPress={() => {
                                                if (editedTags.includes(tag)) {
                                                    setEditedTags(editedTags.filter(t => t !== tag));
                                                } else {
                                                    setEditedTags([...editedTags, tag]);
                                                }
                                            }}
                                        >
                                            <Typography variant="caption" style={{ color: editedTags.includes(tag) ? COLORS.paper : COLORS.stone }}>
                                                {tag}
                                            </Typography>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <View style={styles.customTagInput}>
                                    <TextInput
                                        style={styles.smallInput}
                                        placeholder="Add custom tag..."
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
                                        <Plus size={20} color={COLORS.ink} />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.tagList}>
                                    {editedTags.filter(t => !ALLOWED_TAGS.includes(t)).map(tag => (
                                        <View key={tag} style={styles.customTagPill}>
                                            <Typography variant="caption" color={COLORS.ink}>{tag}</Typography>
                                            <TouchableOpacity onPress={() => setEditedTags(editedTags.filter(t => t !== tag))}>
                                                <X size={14} color={COLORS.stone} style={{ marginLeft: 4 }} />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ) : (
                            <Typography variant="label" style={styles.metaLabel}>
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
                        style={[styles.bentoCard, styles.actionCard, { flex: 1 }, isEditing && { borderColor: COLORS.ink, borderWidth: 1 }]}
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
                            <NotePencil size={24} color={COLORS.ink} weight="fill" style={{ marginBottom: 8 }} />
                        ) : (
                            isShared ? (
                                <PlusCircle size={24} color={COLORS.ink} weight="fill" style={{ marginBottom: 8 }} />
                            ) : (
                                <ArrowSquareOut size={24} color={COLORS.stone} weight="thin" style={{ marginBottom: 8 }} />
                            )
                        )}
                        <Typography variant="label" style={(isEditing || isShared) && { color: COLORS.ink }}>
                            {isEditing ? (saving ? 'Saving...' : 'Save') : (isShared ? (saving ? 'Adding...' : 'Add to My Library') : 'View Original')}
                        </Typography>
                    </TouchableOpacity>
                    {!isEditing && (
                        <TouchableOpacity
                            style={[styles.bentoCard, styles.actionCard, { flex: 1 }]}
                            onPress={handleShare}
                        >
                            <Export size={24} color={COLORS.stone} weight="thin" style={{ marginBottom: 8 }} />
                            <Typography variant="label">Share</Typography>
                        </TouchableOpacity>
                    )}
                    {isEditing && (
                        <TouchableOpacity
                            style={[styles.bentoCard, styles.actionCard, { flex: 1 }]}
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

                {/* Card 4: Content */}
                <View style={[styles.bentoCard, { minHeight: 400 }]}>
                    {!isEditing ? (
                        <SafeContentRenderer content={content} />
                    ) : (
                        <TextInput
                            style={{ fontSize: 16, lineHeight: 24, color: COLORS.ink }}
                            multiline
                            scrollEnabled={false}
                            value={content}
                            onChangeText={setContent}
                        />
                    )}
                </View>

            </ScrollView>
        </View>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.canvas,
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
        color: COLORS.stone,
        marginBottom: 2,
    },
    serifTitle: {
        fontSize: 20, // Smaller for detail page header to fit long titles
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 140,
        gap: 16,
    },
    bentoCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 20,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(0,0,0,0.1)',
        // @ts-ignore
        cornerCurve: 'continuous',
    },
    imageWrapper: {
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(0,0,0,0.1)',
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
        color: COLORS.stone,
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
        backgroundColor: COLORS.canvas,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.separator,
    },
    tagPillActive: {
        backgroundColor: COLORS.ink,
        borderColor: COLORS.ink,
    },
    customTagPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 16,
        backgroundColor: '#E5E5E5',
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
        backgroundColor: COLORS.paper,
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 14,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.separator,
    }
});
