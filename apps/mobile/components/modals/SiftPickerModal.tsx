import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { X, Check, MagnifyingGlass, CheckCircle } from 'phosphor-react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../design-system/Typography';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { COLORS, RADIUS, SPACING } from '../../lib/theme';
import ScreenWrapper from '../ScreenWrapper';
import Fuse from 'fuse.js';

interface SiftPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (selectedIds: string[]) => void;
    currentFolderSiftIds: string[];
}

interface SiftItem {
    id: string;
    title: string;
    url: string;
    tags: string[];
    metadata?: {
        image_url?: string;
    };
}

export const SiftPickerModal = ({ visible, onClose, onSelect, currentFolderSiftIds }: SiftPickerModalProps) => {
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Fetch all user sifts
    const { data: sifts = [], isLoading } = useQuery({
        queryKey: ['pages', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const { data, error } = await supabase
                .from('pages')
                .select('id, title, url, tags, metadata')
                .eq('user_id', user.id)
                .eq('is_archived', false)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data as SiftItem[];
        },
        enabled: visible && !!user?.id,
    });

    // Filter out sifts already in the folder
    const availableSifts = useMemo(() => {
        return sifts.filter(sift => !currentFolderSiftIds.includes(sift.id));
    }, [sifts, currentFolderSiftIds]);

    // Search logic
    const fuse = useMemo(() => {
        return new Fuse(availableSifts, {
            keys: ['title', 'tags', 'url'],
            threshold: 0.3,
        });
    }, [availableSifts]);

    const filteredSifts = useMemo(() => {
        if (!searchQuery.trim()) return availableSifts;
        return fuse.search(searchQuery).map(result => result.item);
    }, [availableSifts, searchQuery, fuse]);

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleSave = () => {
        onSelect(Array.from(selectedIds));
        onClose();
        setSelectedIds(new Set()); // Reset after save
        setSearchQuery('');
    };

    const renderItem = ({ item }: { item: SiftItem }) => {
        const isSelected = selectedIds.has(item.id);
        return (
            <TouchableOpacity
                style={[styles.itemContainer, { borderColor: colors.separator, backgroundColor: isSelected ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)') : 'transparent' }]}
                onPress={() => toggleSelection(item.id)}
                activeOpacity={0.7}
            >
                <View style={[styles.imageWrapper, { backgroundColor: colors.subtle }]}>
                    {item.metadata?.image_url ? (
                        <Image source={{ uri: item.metadata.image_url }} style={styles.image} contentFit="cover" />
                    ) : (
                        <View style={{ flex: 1 }} />
                    )}
                </View>
                <View style={styles.textContainer}>
                    <Typography variant="body" numberOfLines={1} style={{ fontWeight: '600' }}>{item.title}</Typography>
                    <Typography variant="caption" color="stone" numberOfLines={1}>{item.url}</Typography>
                </View>
                <View style={{ marginLeft: 10 }}>
                    {isSelected ? (
                        <CheckCircle size={24} color={colors.ink} weight="fill" />
                    ) : (
                        <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.stone }} />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="formSheet"
            onRequestClose={onClose}
        >
            <ScreenWrapper edges={['top']}>
                <View style={[styles.header, { borderBottomColor: colors.separator }]}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <X size={24} color={colors.ink} />
                    </TouchableOpacity>
                    <Typography variant="h3">Add Sifts</Typography>
                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={selectedIds.size === 0}
                        style={[styles.saveButton, { opacity: selectedIds.size > 0 ? 1 : 0.5 }]}
                    >
                        <Typography variant="label" style={{ color: colors.ink }}>
                            Add ({selectedIds.size})
                        </Typography>
                    </TouchableOpacity>
                </View>

                <View style={[styles.searchContainer, { backgroundColor: colors.subtle }]}>
                    <MagnifyingGlass size={18} color={colors.stone} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.ink }]}
                        placeholder="Search your library..."
                        placeholderTextColor={colors.stone}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        clearButtonMode="while-editing"
                        autoCorrect={false}
                    />
                </View>

                {isLoading ? (
                    <View style={styles.center}>
                        <ActivityIndicator color={colors.ink} />
                    </View>
                ) : (
                    <FlatList
                        data={filteredSifts}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.center}>
                                <Typography variant="body" color="stone">
                                    {searchQuery ? "No matching sifts found." : "No sifts available to add."}
                                </Typography>
                            </View>
                        }
                    />
                )}
            </ScreenWrapper>
        </Modal>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    closeButton: {
        padding: 4,
    },
    saveButton: {
        padding: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 16,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: RADIUS.m,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        fontFamily: 'System',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 40,
    },
    listContent: {
        paddingBottom: 40,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    imageWrapper: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.s,
        overflow: 'hidden',
        marginRight: 12,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    textContainer: {
        flex: 1,
        gap: 2,
    },
});
