import React, { useState, useEffect } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { Typography } from '../design-system/Typography';
import { Button } from '../design-system/Button';
import { COLORS, SPACING, RADIUS, Theme } from '../../lib/theme';
import { X, Folder, FolderOpen, FolderStar, Heart, Star, BookmarkSimple, Lightning, Fire, Sparkle, Coffee, GameController, MusicNote, Camera, Palette, Book, Briefcase, GraduationCap, Trophy, Target, Lightbulb, Rocket, Check, Trash, PushPin } from 'phosphor-react-native';
import { useTheme } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';

// Folder colors palette
const COLLECTION_COLORS = [
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#EF4444', // Red
    '#F97316', // Orange
    '#EAB308', // Yellow
    '#22C55E', // Green
    '#14B8A6', // Teal
    '#6B7280', // Gray
    '#1F2937', // Dark
];

// Icon options
const COLLECTION_ICONS = [
    { name: 'Folder', icon: Folder },
    { name: 'FolderOpen', icon: FolderOpen },
    { name: 'FolderStar', icon: FolderStar },
    { name: 'Heart', icon: Heart },
    { name: 'Star', icon: Star },
    { name: 'BookmarkSimple', icon: BookmarkSimple },
    { name: 'Lightning', icon: Lightning },
    { name: 'Fire', icon: Fire },
    { name: 'Sparkle', icon: Sparkle },
    { name: 'Coffee', icon: Coffee },
    { name: 'GameController', icon: GameController },
    { name: 'MusicNote', icon: MusicNote },
    { name: 'Camera', icon: Camera },
    { name: 'Palette', icon: Palette },
    { name: 'Book', icon: Book },
    { name: 'Briefcase', icon: Briefcase },
    { name: 'GraduationCap', icon: GraduationCap },
    { name: 'Trophy', icon: Trophy },
    { name: 'Target', icon: Target },
    { name: 'Lightbulb', icon: Lightbulb },
    { name: 'Rocket', icon: Rocket },
];

export interface CollectionData {
    id?: string;
    name: string;
    color: string;
    icon: string;
    is_pinned?: boolean;
    sort_order?: number;
    created_at?: string;
}

interface CollectionModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (folder: CollectionData) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
    onPin?: (id: string, isPinned: boolean) => Promise<void>;
    existingCollection?: CollectionData | null;
}

export const CollectionModal = ({ visible, onClose, onSave, onDelete, onPin, existingCollection: existingFolder }: CollectionModalProps) => {
    const { colors, isDark } = useTheme();
    const [name, setName] = useState('');
    const [selectedColor, setSelectedColor] = useState(COLLECTION_COLORS[0]);
    const [selectedIcon, setSelectedIcon] = useState('Folder');
    const [isPinned, setIsPinned] = useState(false);
    const [saving, setSaving] = useState(false);

    const isEditMode = !!existingFolder?.id;

    // Reset form when modal opens
    useEffect(() => {
        if (visible) {
            if (existingFolder) {
                setName(existingFolder.name);
                setSelectedColor(existingFolder.color || COLLECTION_COLORS[0]);
                setSelectedIcon(existingFolder.icon || 'Folder');
                setIsPinned(!!existingFolder.is_pinned);
            } else {
                setName('');
                setSelectedColor(COLLECTION_COLORS[0]);
                setSelectedIcon('Folder');
                setIsPinned(false);
            }
        }
    }, [visible, existingFolder]);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Name Required', 'Please enter a collection name.');
            return;
        }

        setSaving(true);
        try {
            await onSave({
                id: existingFolder?.id,
                name: name.trim(),
                color: selectedColor,
                icon: selectedIcon,
                is_pinned: isPinned
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onClose();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save collection');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        if (!existingFolder?.id || !onDelete) return;

        Alert.alert(
            'Delete Collection',
            `Are you sure you want to delete "${existingFolder.name}"? Gems in this collection won't be deleted.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await onDelete(existingFolder.id!);
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            onClose();
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to delete collection');
                        }
                    },
                },
            ]
        );
    };

    const SelectedIconComponent = COLLECTION_ICONS.find(i => i.name === selectedIcon)?.icon || Folder;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.content, { backgroundColor: colors.paper }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Typography variant="h3" style={{ fontFamily: 'PlayfairDisplay_700Bold', fontSize: 24 }}>
                            {isEditMode ? 'Edit' : 'New'} Collection
                        </Typography>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            {isEditMode && onPin && existingFolder?.id && (
                                <TouchableOpacity
                                    onPress={() => {
                                        const newPinnedState = !isPinned;
                                        setIsPinned(newPinnedState);
                                        onPin(existingFolder.id!, newPinnedState);
                                    }}
                                    style={styles.closeButton}
                                >
                                    <PushPin
                                        size={22}
                                        color={isPinned ? colors.ink : colors.stone}
                                        weight={isPinned ? "fill" : "regular"}
                                    />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <X size={22} color={colors.stone} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
                        {/* Preview */}
                        <View style={styles.previewContainer}>
                            <View style={[styles.previewIcon, { backgroundColor: selectedColor }]}>
                                <SelectedIconComponent size={32} color="#FFFFFF" weight="fill" />
                            </View>
                            <Typography variant="h2" style={{ marginTop: 12, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20 }}>
                                {name || 'Collection Name'}
                            </Typography>
                            <Typography variant="caption" color="stone" style={{ marginTop: 4 }}>
                                Previewing your new collection
                            </Typography>
                        </View>

                        {/* Name Input */}
                        <Typography variant="label" color="stone" style={styles.sectionLabel}>
                            COLLECTION NAME
                        </Typography>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.subtle, color: colors.ink, borderColor: colors.separator }]}
                            value={name}
                            onChangeText={setName}
                            placeholder="Enter collection name..."
                            placeholderTextColor={colors.stone}
                            autoFocus={!isEditMode}
                            maxLength={30}
                        />

                        {/* Color Picker */}
                        <Typography variant="label" color="stone" style={styles.sectionLabel}>
                            COLOR
                        </Typography>
                        <View style={styles.colorGrid}>
                            {COLLECTION_COLORS.map((color) => (
                                <TouchableOpacity
                                    key={color}
                                    style={[
                                        styles.colorOption,
                                        { backgroundColor: color },
                                        selectedColor === color && styles.colorSelected,
                                    ]}
                                    onPress={() => {
                                        setSelectedColor(color);
                                        Haptics.selectionAsync();
                                    }}
                                >
                                    {selectedColor === color && (
                                        <Check size={16} color="#FFFFFF" weight="bold" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Icon Picker */}
                        <Typography variant="label" color="stone" style={styles.sectionLabel}>
                            ICON
                        </Typography>
                        <View style={styles.iconGrid}>
                            {COLLECTION_ICONS.map(({ name: iconName, icon: IconComponent }) => (
                                <TouchableOpacity
                                    key={iconName}
                                    style={[
                                        styles.iconOption,
                                        { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.subtle },
                                        selectedIcon === iconName && { backgroundColor: selectedColor },
                                    ]}
                                    onPress={() => {
                                        setSelectedIcon(iconName);
                                        Haptics.selectionAsync();
                                    }}
                                >
                                    <IconComponent
                                        size={22}
                                        color={selectedIcon === iconName ? '#FFFFFF' : colors.ink}
                                        weight={selectedIcon === iconName ? 'fill' : 'regular'}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    {/* Actions */}
                    <View style={styles.actions}>
                        {isEditMode && onDelete && (
                            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                                <Trash size={20} color="#EF4444" />
                            </TouchableOpacity>
                        )}
                        <Button
                            label={saving ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Collection')}
                            onPress={handleSave}
                            variant="primary"
                            style={[styles.saveButton, isEditMode && { flex: 1 }]}
                            disabled={saving || !name.trim()}
                        />
                    </View>
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
        paddingTop: SPACING.l,
        paddingHorizontal: SPACING.l,
        paddingBottom: SPACING.xl + 20, // Extra for safe area
        maxHeight: '85%',
        ...Theme.shadows.medium,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.l,
    },
    closeButton: {
        padding: SPACING.s,
    },
    scrollContent: {
        flexGrow: 0,
    },
    previewContainer: {
        alignItems: 'center',
        paddingVertical: SPACING.l,
        marginBottom: SPACING.m,
    },
    previewIcon: {
        width: 72,
        height: 72,
        borderRadius: RADIUS.l,
        justifyContent: 'center',
        alignItems: 'center',
        ...Theme.shadows.soft,
        position: 'relative',
    },
    sectionLabel: {
        marginBottom: SPACING.s,
        letterSpacing: 1,
    },
    input: {
        height: 52,
        borderRadius: RADIUS.m,
        paddingHorizontal: SPACING.m,
        fontSize: 17,
        marginBottom: SPACING.l,
        borderWidth: StyleSheet.hairlineWidth,
    },
    colorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: SPACING.l,
    },
    colorOption: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    colorSelected: {
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.8)',
    },
    iconGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12, // Match colorGrid gap
        marginBottom: SPACING.l,
    },
    iconOption: {
        width: 44, // Match colorOption width
        height: 44, // Match colorOption height
        borderRadius: 22, // Circular to match colorOption
        justifyContent: 'center',
        alignItems: 'center',
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: SPACING.m,
    },
    deleteButton: {
        width: 52,
        height: 52,
        borderRadius: RADIUS.m,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveButton: {
        flex: 1,
        borderRadius: RADIUS.m,
    },
});
