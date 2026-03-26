import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, SectionList } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Folder, UsersThree, Plus } from 'phosphor-react-native';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../design-system/Typography';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { RADIUS, SPACING, Theme } from '../../lib/theme';
import { Image } from 'expo-image';
import { CollectionModal, CollectionData } from './CollectionModal';

interface FolderPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (folderId: string) => void;
}

export const FolderPickerModal = ({ visible, onClose, onSelect }: FolderPickerModalProps) => {
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const insets = useSafeAreaInsets();
    const [createModalVisible, setCreateModalVisible] = useState(false);

    // Fetch user's own collections
    const { data: ownFolders = [], isLoading: loadingOwn } = useQuery({
        queryKey: ['folders', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const { data, error } = await supabase
                .from('folders')
                .select('id, name, color, icon, image_url')
                .eq('user_id', user.id)
                .order('name');
            if (error) throw error;
            return data || [];
        },
        enabled: !!user?.id && visible,
    });

    // Fetch shared collections where user is a contributor
    const { data: sharedFolders = [], isLoading: loadingShared } = useQuery({
        queryKey: ['shared-folders', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const { data: memberships, error: memError } = await supabase
                .from('folder_members')
                .select('folder_id')
                .eq('user_id', user.id)
                .eq('status', 'accepted')
                .in('role', ['contributor', 'owner']);
            if (memError) throw memError;
            if (!memberships || memberships.length === 0) return [];

            const folderIds = memberships.map(m => m.folder_id);
            const { data, error } = await supabase
                .from('folders')
                .select('id, name, color, icon, image_url')
                .in('id', folderIds)
                .neq('user_id', user.id)
                .order('name');
            if (error) throw error;
            return data || [];
        },
        enabled: !!user?.id && visible,
    });

    const isLoading = loadingOwn || loadingShared;
    const hasAnyFolders = ownFolders.length > 0 || sharedFolders.length > 0;

    const sections = [
        ...(ownFolders.length > 0 ? [{ title: 'Your Collections', data: ownFolders }] : []),
        ...(sharedFolders.length > 0 ? [{ title: 'Shared with You', data: sharedFolders }] : []),
    ];

    const handleCreateCollection = async (data: Partial<CollectionData>) => {
        if (!user?.id) return;
        const { error } = await supabase.from('folders').insert({
            user_id: user.id,
            name: data.name,
            color: data.color,
            icon: data.icon,
            image_url: data.image_url || null,
            is_pinned: data.is_pinned || false,
        });
        if (error) throw error;
        // Refresh folder list
        queryClient.invalidateQueries({ queryKey: ['folders', user.id] });
    };

    return (
        <>
            <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
                <View style={styles.overlay}>
                    <View style={[styles.content, { backgroundColor: colors.paper, paddingBottom: SPACING.xxl + insets.bottom }]}>
                        <View style={styles.header}>
                            <Typography variant="h3" style={{ flex: 1 }}>Move to Collection</Typography>
                            <TouchableOpacity onPress={onClose} hitSlop={8}>
                                <X size={22} color={colors.stone} />
                            </TouchableOpacity>
                        </View>

                        {/* Create New Collection Button */}
                        <TouchableOpacity
                            style={[styles.createRow, { borderBottomColor: colors.separator }]}
                            onPress={() => setCreateModalVisible(true)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.createIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : colors.subtle }]}>
                                <Plus size={18} color={colors.ink} weight="bold" />
                            </View>
                            <Typography variant="body" style={{ flex: 1, fontWeight: '600' }}>New Collection</Typography>
                        </TouchableOpacity>

                        {isLoading ? (
                            <ActivityIndicator style={{ paddingVertical: 40 }} color={colors.stone} />
                        ) : !hasAnyFolders ? (
                            <View style={styles.emptyState}>
                                <Folder size={40} color={colors.stone} weight="thin" />
                                <Typography variant="body" color="stone" style={{ marginTop: SPACING.m, textAlign: 'center' }}>
                                    No collections yet.
                                </Typography>
                                <Typography variant="caption" color="stone" style={{ textAlign: 'center', marginTop: 4 }}>
                                    Tap "New Collection" above to create one.
                                </Typography>
                            </View>
                        ) : (
                            <SectionList
                                sections={sections}
                                keyExtractor={(item) => item.id}
                                contentContainerStyle={{ paddingBottom: SPACING.xl }}
                                stickySectionHeadersEnabled={false}
                                renderSectionHeader={({ section }) => (
                                    <View style={[styles.sectionHeader, { backgroundColor: colors.paper }]}>
                                        {section.title === 'Shared with You' && (
                                            <UsersThree size={14} color={colors.stone} weight="bold" style={{ marginRight: 6 }} />
                                        )}
                                        <Typography variant="caption" color="stone" style={styles.sectionTitle}>
                                            {section.title.toUpperCase()}
                                        </Typography>
                                    </View>
                                )}
                                renderItem={({ item, section }) => (
                                    <TouchableOpacity
                                        style={[styles.folderRow, { borderBottomColor: colors.separator }]}
                                        onPress={() => {
                                            onSelect(item.id);
                                            onClose();
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        {item.image_url ? (
                                            <Image
                                                source={{ uri: item.image_url }}
                                                style={[styles.folderIcon, { backgroundColor: colors.subtle }]}
                                                contentFit="cover"
                                            />
                                        ) : (
                                            <View style={[styles.folderIcon, { backgroundColor: item.color || colors.subtle }]}>
                                                <Folder size={18} color="#FFF" weight="fill" />
                                            </View>
                                        )}
                                        <Typography variant="body" style={{ flex: 1 }}>{item.name}</Typography>
                                        {section.title === 'Shared with You' && (
                                            <UsersThree size={16} color={colors.stone} />
                                        )}
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </View>
                </View>
            </Modal>

            <CollectionModal
                visible={createModalVisible}
                onClose={() => setCreateModalVisible(false)}
                onSave={handleCreateCollection}
                existingCollection={null}
            />
        </>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    content: {
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
        padding: SPACING.xl,
        paddingBottom: SPACING.xxl,
        maxHeight: '60%',
        ...Theme.shadows.medium,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.m,
    },
    createRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.m,
        gap: SPACING.m,
        borderBottomWidth: StyleSheet.hairlineWidth,
        marginBottom: SPACING.xs,
    },
    createIcon: {
        width: 36,
        height: 36,
        borderRadius: RADIUS.s,
        justifyContent: 'center',
        alignItems: 'center',
    },
    folderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.m,
        gap: SPACING.m,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    folderIcon: {
        width: 36,
        height: 36,
        borderRadius: RADIUS.s,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: SPACING.l,
        paddingBottom: SPACING.xs,
    },
    sectionTitle: {
        fontFamily: 'GeistMono_400Regular',
        letterSpacing: 2,
        fontSize: 10,
        opacity: 0.6,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
});
