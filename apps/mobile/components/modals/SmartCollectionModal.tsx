import React, { useState, useEffect } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Dimensions, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Typography } from '../design-system/Typography';
import { Button } from '../design-system/Button';
import { COLORS, SPACING, RADIUS, Theme } from '../../lib/theme';
import {
    X, Trash, PushPin, Check, Plus, Folder, FolderOpen, FolderStar, Heart, Star, BookmarkSimple, Lightning, Fire, Sparkle,
    Coffee, GameController, MusicNote, Camera, Palette, Book, Briefcase,
    GraduationCap, Trophy, Target, Lightbulb, Rocket, CookingPot, Leaf,
    Monitor, Barbell, Airplane, Martini, ImageSquare, UploadSimple
} from 'phosphor-react-native';
import { useTheme } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

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

const COLLECTION_ICONS = [
    { name: 'Cooking', icon: CookingPot },
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
    color?: string;
    image_url?: string;
    sort_order?: number;
}

interface SmartCollectionModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (category: SmartCollectionData) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
    existingCollection?: SmartCollectionData | null;
    suggestedTags?: string[];
}

export const SmartCollectionModal = ({ visible, onClose, onSave, onDelete, existingCollection, suggestedTags = [] }: SmartCollectionModalProps) => {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const [name, setName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('Folder');
    const [selectedColor, setSelectedColor] = useState(COLLECTION_COLORS[0]);
    const [imageUrl, setImageUrl] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const isEditMode = !!existingCollection?.id;

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [16, 9],
            quality: 1,
        });

        if (!result.canceled && result.assets[0]) {
            uploadCoverImage(result.assets[0].uri);
        }
    };

    const uploadCoverImage = async (uri: string) => {
        if (!user?.id) return;
        setUploading(true);
        try {
            const manipulated = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 800 } }],
                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
            );

            const fileExt = 'jpg';
            const fileName = `${user.id}/smart_cover_${Date.now()}.${fileExt}`;

            const formData = new FormData();
            formData.append('file', {
                uri: manipulated.uri,
                name: fileName,
                type: 'image/jpeg',
            } as any);

            const { data, error } = await supabase.storage
                .from('collection_covers')
                .upload(fileName, formData, {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('collection_covers')
                .getPublicUrl(fileName);

            setImageUrl(publicUrl);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
            Alert.alert('Upload Failed', error.message);
        } finally {
            setUploading(false);
        }
    };

    useEffect(() => {
        if (visible) {
            if (existingCollection) {
                setName(existingCollection.name);
                setSelectedIcon(existingCollection.icon || 'Folder');
                setSelectedColor(existingCollection.color || COLLECTION_COLORS[0]);
                setImageUrl(existingCollection.image_url || '');
                setTags(existingCollection.tags || []);
                setTagInput('');
            } else {
                setName('');
                setSelectedIcon('Folder');
                setSelectedColor(COLLECTION_COLORS[0]);
                setImageUrl('');
                setTags([]);
                setTagInput('');
            }
        }
    }, [visible, existingCollection]);

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
                id: existingCollection?.id,
                name: name.trim(),
                icon: selectedIcon,
                color: selectedColor,
                image_url: imageUrl,
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

    const handleUseLatestSift = async () => {
        try {
            const { data: pages, error } = await supabase
                .from('pages')
                .select('image_url')
                .contains('tags', tags)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;

            const firstWithImage = pages?.find(p => p.image_url)?.image_url;

            if (firstWithImage) {
                setImageUrl(firstWithImage);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                Alert.alert('No Images', 'Could not find any sifts with images matching these tags.');
            }
        } catch (error: any) {
            Alert.alert('Error', 'Failed to fetch latest sift image.');
        }
    };

    const handleDelete = () => {
        if (!existingCollection?.id || !onDelete) return;

        Alert.alert(
            'Delete Collection',
            `Are you sure you want to delete "${existingCollection.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await onDelete(existingCollection.id!);
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
                    <View style={styles.header}>
                        <Typography variant="h3" style={{ fontFamily: 'PlayfairDisplay_700Bold', fontSize: 24 }}>
                            {isEditMode ? 'Edit' : 'New'} Smart collection
                        </Typography>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={22} color={colors.stone} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
                        <View style={styles.previewContainer}>
                            <View style={[styles.previewIcon, { backgroundColor: selectedColor }]}>
                                {imageUrl ? (
                                    <>
                                        <Image
                                            source={{ uri: imageUrl }}
                                            style={StyleSheet.absoluteFill}
                                            contentFit="cover"
                                        />
                                        <LinearGradient
                                            colors={['transparent', 'rgba(0,0,0,0.5)']}
                                            style={StyleSheet.absoluteFill}
                                        />
                                        <SelectedIconComponent size={24} color="#FFFFFF" weight="fill" />
                                    </>
                                ) : (
                                    <SelectedIconComponent size={32} color="#FFFFFF" weight="fill" />
                                )}
                            </View>
                            <Typography variant="h2" style={{ marginTop: 12, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20 }}>
                                {name || 'Smart Collection'}
                            </Typography>
                            <Typography variant="caption" color="stone" style={{ marginTop: 4 }}>
                                Dynamically organized by tags
                            </Typography>
                        </View>

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

                        <Typography variant="label" color="stone" style={styles.sectionLabel}>
                            COVER IMAGE
                        </Typography>
                        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: SPACING.l }}>
                            <TouchableOpacity
                                style={[styles.uploadButton, { backgroundColor: colors.subtle, borderColor: colors.separator }]}
                                onPress={pickImage}
                                disabled={uploading}
                            >
                                {uploading ? (
                                    <ActivityIndicator size="small" color={colors.ink} />
                                ) : (
                                    <>
                                        <UploadSimple size={20} color={colors.ink} weight="bold" />
                                        <Typography variant="body" style={{ marginLeft: 8 }}>{imageUrl ? 'Change Cover' : 'Upload Cover'}</Typography>
                                    </>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.smallActionButton, { backgroundColor: colors.subtle, borderColor: colors.separator }]}
                                onPress={handleUseLatestSift}
                            >
                                <ImageSquare size={20} color={colors.ink} />
                            </TouchableOpacity>

                            {imageUrl !== '' && (
                                <TouchableOpacity
                                    style={[styles.smallActionButton, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'transparent' }]}
                                    onPress={() => setImageUrl('')}
                                >
                                    <X size={20} color="#EF4444" />
                                </TouchableOpacity>
                            )}
                        </View>

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
                                />
                            ))}
                        </View>

                        <Typography variant="label" color="stone" style={styles.sectionLabel}>
                            ICON
                        </Typography>
                        <View style={styles.iconGrid}>
                            {COLLECTION_ICONS.map((item) => (
                                <TouchableOpacity
                                    key={item.name}
                                    style={[
                                        styles.iconOption,
                                        { backgroundColor: selectedIcon === item.name ? colors.ink : colors.subtle },
                                    ]}
                                    onPress={() => {
                                        setSelectedIcon(item.name);
                                        Haptics.selectionAsync();
                                    }}
                                >
                                    <item.icon
                                        size={20}
                                        color={selectedIcon === item.name ? colors.paper : colors.stone}
                                        weight={selectedIcon === item.name ? "fill" : "regular"}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>

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
    colorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: SPACING.l,
    },
    colorOption: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    colorSelected: {
        borderColor: COLORS.ink,
        transform: [{ scale: 1.1 }],
    },
    smallActionButton: {
        width: 52,
        height: 52,
        borderRadius: RADIUS.m,
        borderWidth: StyleSheet.hairlineWidth,
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadButton: {
        flex: 1,
        height: 52,
        borderRadius: RADIUS.m,
        borderWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
