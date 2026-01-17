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
import { CaretLeft, DotsThree, Export, NotePencil, Trash } from 'phosphor-react-native';
import { Theme, COLORS, SPACING } from '../../lib/theme';
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

            {/* Standardized Header */}
            <View style={styles.navBar}>
                <TouchableOpacity onPress={() => router.back()} style={styles.navButton}>
                    <CaretLeft size={28} color={COLORS.ink} />
                </TouchableOpacity>
                <View style={styles.headerTitleBox}>
                    <Typography variant="label" color={COLORS.stone} style={styles.smallCapsLabel}>SAVED ARTIFACT</Typography>
                    <Typography variant="h1" numberOfLines={1} style={styles.serifTitle}>{page?.title || 'Loading...'}</Typography>
                </View>
                <TouchableOpacity style={styles.navButton}>
                    <DotsThree size={28} color={COLORS.ink} />
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
                        <Typography variant="label" style={styles.metaLabel}>
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
                <View style={{ flexDirection: 'row', gap: SPACING.l }}>
                    <TouchableOpacity style={[styles.bentoCard, styles.actionCard, { flex: 1 }]}>
                        <NotePencil size={24} color={COLORS.stone} weight="thin" style={{ marginBottom: 8 }} />
                        <Typography variant="label">Edit</Typography>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.bentoCard, styles.actionCard, { flex: 1 }]}>
                        <Export size={24} color={COLORS.stone} weight="thin" style={{ marginBottom: 8 }} />
                        <Typography variant="label">Share</Typography>
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
        backgroundColor: COLORS.canvas,
    },
    navBar: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.l,
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
        fontSize: 10,
        letterSpacing: 1.5,
        color: '#999',
        fontFamily: 'Inter_500Medium',
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    serifTitle: {
        fontFamily: 'PlayfairDisplay_700Bold',
        fontSize: 24, // Smaller for detail page header to fit long titles
        color: '#1A1A1A',
        lineHeight: 30,
    },
    scrollContent: {
        paddingHorizontal: SPACING.l,
        paddingBottom: 140,
        gap: SPACING.l,
    },
    bentoCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: SPACING.l,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
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
        fontSize: 10,
        color: '#999',
        letterSpacing: 1,
    },
    sourceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        opacity: 0.8,
        marginTop: 12,
        paddingVertical: 4,
        paddingHorizontal: 8,
        backgroundColor: COLORS.canvas,
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
