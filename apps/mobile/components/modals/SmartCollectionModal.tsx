import React, { useState, useEffect } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Typography } from '../design-system/Typography';
import { Button } from '../design-system/Button';
import { COLORS, SPACING, RADIUS, Theme } from '../../lib/theme';
import { X, Trash, PushPin, Check, Plus } from 'phosphor-react-native';
// Import same icons as FolderModal plus generic ones
import {
    Folder, FolderOpen, Heart, Star, BookmarkSimple, Lightning, Fire, Sparkle,
    Coffee, GameController, MusicNote, Camera, Palette, Book, Briefcase,
    GraduationCap, Trophy, Target, Lightbulb, Rocket, CookingPot, Leaf,
    Monitor, Barbell, Airplane, Martini
} from 'phosphor-react-native';
import { useTheme } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';

// Extended Smart Collection icons
const COLLECTION_ICONS = [
    { name: 'Cooking', icon: CookingPot },
    { name: 'Baking', icon: CookingPot }, // Fallback/Duplicate
    { name: 'Tech', icon: Monitor },
    { name: 'Health', icon: Heart },
    { name: 'Lifestyle', icon: Leaf },
    { name: 'Professional', icon: Briefcase },
    { name: 'Folder', icon: Folder },
    { name: 'Star', icon: Star },
    { name: 'Sparkle', icon: Sparkle },
    { name: 'Game', icon: GameController },
    { name: 'Music', icon: MusicNote },
    { name: 'Art', icon: Palette },
    { name: 'Education', icon: GraduationCap },
    { name: 'Travel', icon: Airplane },
    { name: 'Drink', icon: Martini },
    { name: 'Fitness', icon: Barbell },
    { name: 'Idea', icon: Lightbulb },
    { name: 'Goal', icon: Target },
];

export interface SmartCollectionData {
    id?: string;
    name: string;
    icon: string;
    tags: string[];
    sort_order?: number;
}

interface SmartCollectionModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (category: SmartCollectionData) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
    existingCategory?: SmartCollectionData | null;
    suggestedTags?: string[];
}

export const SmartCollectionModal = ({ visible, onClose, onSave, onDelete, existingCategory, suggestedTags = [] }: SmartCollectionModalProps) => {
    const { colors, isDark } = useTheme();
    const [name, setName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('Folder');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [saving, setSaving] = useState(false);

    const isEditMode = !!existingCategory?.id;

    // Reset form when modal opens
    useEffect(() => {
        if (visible) {
            if (existingCategory) {
                setName(existingCategory.name);
                setSelectedIcon(existingCategory.icon || 'Folder');
                setTags(existingCategory.tags || []);
                setTagInput('');
            } else {
                setName('');
                setSelectedIcon('Folder');
                setTags([]);
                setTagInput('');
            }
        }
    }, [visible, existingCategory]);

    const handleAddTag = () => {
        const newTag = tagInput.trim().toUpperCase();
        if (newTag && !tags.includes(newTag)) {
            setTags([...tags, newTag]);
            setTagInput('');
            Haptics.selectionAsync();
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(t => t !== tagToRemove));
        Haptics.selectionAsync();
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Name Required', 'Please enter a smart collection name.');
            return;
        }

        setSaving(true);
        try {
            await onSave({
                id: existingCategory?.id,
                name: name.trim(),
                icon: selectedIcon,
                tags: tags
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onClose();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save smart collection');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        if (!existingCategory?.id || !onDelete) return;

        Alert.alert(
            'Delete Collection',
            `Are you sure you want to delete "${existingCategory.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await onDelete(existingCategory.id!);
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            onClose();
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to delete smart collection');
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
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <View style={[styles.content, { backgroundColor: colors.paper }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Typography variant="h3" style={{ fontFamily: 'PlayfairDisplay_700Bold', fontSize: 24 }}>
                            {isEditMode ? 'Edit' : 'New'} Smart Gem
                        </Typography>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={22} color={colors.stone} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
                        {/* Preview */}
                        <View style={styles.previewContainer}>
                            <View style={[styles.previewIcon, { backgroundColor: colors.subtle }]}>
                                <SelectedIconComponent size={32} color={colors.ink} weight="fill" />
                            </View>
                            <Typography variant="h2" style={{ marginTop: 12, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20 }}>
                                {name || 'Smart Collection'}
                            </Typography>
                            <Typography variant="caption" color="stone" style={{ marginTop: 4 }}>
                                Dynamically organized by tags
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
                            placeholder="Enter smart collection name..."
                            placeholderTextColor={colors.stone}
                            autoFocus={!isEditMode}
                            maxLength={30}
                        />

                        {/* Tags Input */}
                        <Typography variant="label" color="stone" style={styles.sectionLabel}>
                            TAGS (SMART FILTER)
                        </Typography>
                        <View style={[styles.tagInputContainer, { backgroundColor: colors.subtle, borderColor: colors.separator }]}>
                            <TextInput
                                style={[styles.tagInput, { color: colors.ink }]}
                                value={tagInput}
                                onChangeText={setTagInput}
                                placeholder="Add a tag..."
                                placeholderTextColor={colors.stone}
                                onSubmitEditing={handleAddTag}
                                returnKeyType="done"
                            />
                            <TouchableOpacity onPress={handleAddTag} disabled={!tagInput.trim()}>
                                <Plus size={20} color={tagInput.trim() ? colors.ink : colors.stone} />
                            </TouchableOpacity>
                        </View>

                        {/* Active Tags */}
                        {tags.length > 0 && (
                            <View style={styles.tagsContainer}>
                                {tags.map(tag => (
                                    <TouchableOpacity
                                        key={tag}
                                        style={[styles.tagChip, { backgroundColor: colors.ink, borderColor: colors.ink }]}
                                        onPress={() => handleRemoveTag(tag)}
                                    >
                                        <Typography variant="caption" weight="medium" color="paper">{tag}</Typography>
                                        <X size={12} color={colors.paper} style={{ marginLeft: 4 }} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* Suggested Tags (Toggle) */}
                        {suggestedTags && suggestedTags.length > 0 && (
                            <>
                                <Typography variant="label" color="stone" style={[styles.sectionLabel, { marginTop: SPACING.m }]}>
                                    SUGGESTED TAGS
                                </Typography>
                                <View style={styles.tagsContainer}>
                                    {suggestedTags.filter(t => !tags.includes(t)).map(tag => (
                                        <TouchableOpacity
                                            key={tag}
                                            style={[styles.tagChip, { backgroundColor: colors.subtle, borderColor: colors.separator, opacity: 0.7 }]}
                                            onPress={() => {
                                                setTags([...tags, tag]);
                                                Haptics.selectionAsync();
                                            }}
                                        >
                                            <Plus size={12} color={colors.stone} style={{ marginRight: 4 }} />
                                            <Typography variant="caption" weight="medium" color="ink">{tag}</Typography>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        )}
                    </ScrollView>

                    {/* Actions */}
                    <View style={styles.actions}>
                        {isEditMode && onDelete && (
                            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                                <Trash size={20} color="#EF4444" />
                            </TouchableOpacity>
                        )}
                        <Button
                            label={saving ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Smart Collection')}
                            onPress={handleSave}
                            variant="primary"
                            style={[styles.saveButton, isEditMode && { flex: 1 }]}
                            disabled={saving || !name.trim()}
                        />
                    </View>
                </View>
            </KeyboardAvoidingView>
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
        paddingBottom: SPACING.xl + 20,
        maxHeight: '90%',
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
    tagInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 52,
        borderRadius: RADIUS.m,
        paddingHorizontal: SPACING.m,
        marginBottom: SPACING.s,
        borderWidth: StyleSheet.hairlineWidth,
    },
    tagInput: {
        flex: 1,
        fontSize: 17,
        height: '100%',
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: SPACING.l,
    },
    tagChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: RADIUS.s,
        borderWidth: StyleSheet.hairlineWidth,
    },
    iconGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: SPACING.l,
    },
    iconOption: {
        width: 44,
        height: 44,
        borderRadius: 22,
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
