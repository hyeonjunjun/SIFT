import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { X, Folder, Plus } from 'phosphor-react-native';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../design-system/Typography';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { COLORS, RADIUS, SPACING, Theme } from '../../lib/theme';
import { Image } from 'expo-image';

interface FolderPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (folderId: string) => void;
}

export const FolderPickerModal = ({ visible, onClose, onSelect }: FolderPickerModalProps) => {
    const { colors } = useTheme();
    const { user } = useAuth();

    const { data: folders = [], isLoading } = useQuery({
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

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.content, { backgroundColor: colors.paper }]}>
                    <View style={styles.header}>
                        <Typography variant="h3" style={{ flex: 1 }}>Move to Collection</Typography>
                        <TouchableOpacity onPress={onClose} hitSlop={8}>
                            <X size={22} color={colors.stone} />
                        </TouchableOpacity>
                    </View>

                    {isLoading ? (
                        <ActivityIndicator style={{ paddingVertical: 40 }} color={colors.stone} />
                    ) : folders.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Folder size={40} color={colors.stone} weight="thin" />
                            <Typography variant="body" color="stone" style={{ marginTop: SPACING.m, textAlign: 'center' }}>
                                No collections yet.
                            </Typography>
                            <Typography variant="caption" color="stone" style={{ textAlign: 'center', marginTop: 4 }}>
                                Create a collection in your Library first.
                            </Typography>
                        </View>
                    ) : (
                        <FlatList
                            data={folders}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={{ paddingBottom: SPACING.xl }}
                            renderItem={({ item }) => (
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
                                            source={item.image_url}
                                            style={[styles.folderIcon, { backgroundColor: colors.subtle }]}
                                            contentFit="cover"
                                        />
                                    ) : (
                                        <View style={[styles.folderIcon, { backgroundColor: item.color || colors.subtle }]}>
                                            <Folder size={18} color="#FFF" weight="fill" />
                                        </View>
                                    )}
                                    <Typography variant="body" style={{ flex: 1 }}>{item.name}</Typography>
                                </TouchableOpacity>
                            )}
                        />
                    )}
                </View>
            </View>
        </Modal>
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
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
});
