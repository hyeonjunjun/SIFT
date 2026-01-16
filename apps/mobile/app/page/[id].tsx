import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    TextInput,
    TouchableOpacity,
    View,
    Text,
    Alert,
    Image,
    StyleSheet,
    ScrollView,
    RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, MoreHorizontal, Share as ShareIcon, Edit3, Trash2 } from 'lucide-react-native';
import { Theme } from '../../lib/theme';
import { Typography } from '../../components/design-system/Typography';
import SafeContentRenderer from '../../components/SafeContentRenderer';

export default function PageDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState<any>(null);
    const [content, setContent] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (!id) return;
        fetchPage();
    }, [id]);

    const fetchPage = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('pages')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            setPage(data);
            const fullDoc = data.content || `# ${data.title}\n\n> ${data.summary}`;
            setContent(fullDoc);

        } catch (error) {
            console.error('Error fetching page:', error);
            Alert.alert('Error', 'Could not load page.');
            router.back();
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchPage();
    };

    if (loading && !refreshing) {
        return <View style={styles.container} />;
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Custom Nav Header (Floating) */}
            <View style={styles.navBar}>
                <TouchableOpacity onPress={() => router.back()} style={styles.navButton}>
                    <ArrowLeft size={24} color={Theme.colors.text.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.navButton}>
                    <MoreHorizontal size={24} color={Theme.colors.text.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.text.primary} />}
            >
                {/* Card 1: Image */}
                {page?.metadata?.image_url && (
                    <View style={[styles.bentoCard, { padding: 0, overflow: 'hidden' }]}>
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
                        <Typography variant="action" style={{ color: Theme.colors.text.tertiary }}>
                            {page?.tags?.[0] || 'SAVED'} • {new Date(page?.created_at).toLocaleDateString()}
                        </Typography>
                    </View>
                    <Typography variant="h1" style={{ marginBottom: 12 }}>
                        {page?.title}
                    </Typography>
                    <View style={styles.sourceRow}>
                        <Image
                            source={{ uri: `https://www.google.com/s2/favicons?domain=${page?.url ? new URL(page.url).hostname : 'sift.app'}` }}
                            style={styles.favicon}
                        />
                        <Typography variant="caption">
                            {page?.url ? new URL(page.url).hostname.replace('www.', '') : 'Unknown Source'}
                        </Typography>
                    </View>
                </View>

                {/* Card 3: Actions (2 cols) */}
                <View style={{ flexDirection: 'row', gap: Theme.spacing.l }}>
                    <TouchableOpacity style={[styles.bentoCard, styles.actionCard, { flex: 1 }]}>
                        <Edit3 size={20} color={Theme.colors.text.primary} style={{ marginBottom: 8 }} />
                        <Typography variant="h2">Edit</Typography>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.bentoCard, styles.actionCard, { flex: 1 }]}>
                        <ShareIcon size={20} color={Theme.colors.text.primary} style={{ marginBottom: 8 }} />
                        <Typography variant="h2">Share</Typography>
                    </TouchableOpacity>
                </View>

                {/* Card 4: Content */}
                <View style={[styles.bentoCard, { minHeight: 400 }]}>
                    {!isEditing ? (
                        <SafeContentRenderer content={content} />
                    ) : (
                        <TextInput
                            style={{ fontSize: 16, lineHeight: 24, color: Theme.colors.text.primary }}
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
        backgroundColor: Theme.colors.background,
    },
    navBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: Theme.spacing.l,
        paddingTop: 60, // Safe Area
        paddingBottom: Theme.spacing.m,
        zIndex: 10,
    },
    navButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        ...Theme.shadows.card,
    },
    scrollContent: {
        paddingHorizontal: Theme.spacing.l, // 20px
        paddingBottom: 140,
        gap: Theme.spacing.l, // 20px gap between cards
    },
    bentoCard: {
        backgroundColor: Theme.colors.surface,
        borderRadius: Theme.borderRadius.card, // 24px
        padding: Theme.spacing.l, // 20px
        ...Theme.shadows.card,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    actionCard: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
    },
    tagRow: {
        marginBottom: 8,
    },
    sourceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        opacity: 0.8,
        marginTop: 4,
        paddingVertical: 4,
        paddingHorizontal: 8,
        backgroundColor: Theme.colors.background,
        alignSelf: 'flex-start',
        borderRadius: 8,
    },
    favicon: {
        width: 14,
        height: 14,
        marginRight: 6,
        borderRadius: 2,
    },
});
