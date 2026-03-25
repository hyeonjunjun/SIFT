import React, { useState, useEffect } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Dimensions, ActivityIndicator, Switch, Platform } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Typography } from '../design-system/Typography';
import { Button } from '../design-system/Button';
import { COLORS, SPACING, RADIUS, Theme, COLLECTION_PALETTE, OVERLAYS } from '../../lib/theme';
import { X, Folder, FolderOpen, FolderStar, Heart, Star, BookmarkSimple, Lightning, Fire, Sparkle, Coffee, GameController, MusicNote, Camera, Palette, Book, Briefcase, GraduationCap, Trophy, Target, Lightbulb, Rocket, Check, Trash, PushPin, ImageSquare, UploadSimple, UsersThree } from 'phosphor-react-native';
import { useTheme } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

const COLLECTION_COLORS = [...COLLECTION_PALETTE];

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
    image_url?: string;
    sort_order?: number;
    created_at?: string;
    page_order?: string[];
}

interface CollectionModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (folder: CollectionData) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
    onPin?: (id: string, isPinned: boolean) => Promise<void>;
    existingCollection?: CollectionData | null;
    onCreatedShared?: (folderId: string, folderName: string) => void;
}

export const CollectionModal = ({ visible, onClose, onSave, onDelete, onPin, existingCollection: existingFolder, onCreatedShared }: CollectionModalProps) => {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const [name, setName] = useState('');
    const [selectedColor, setSelectedColor] = useState<string>(COLLECTION_COLORS[0]);
    const [selectedIcon, setSelectedIcon] = useState('Folder');
    const [isPinned, setIsPinned] = useState(false);
    const [imageUrl, setImageUrl] = useState('');
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [isShared, setIsShared] = useState(false);

    const isEditMode = !!existingFolder?.id;

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
            const fileName = `${user.id}/cover_${Date.now()}.${fileExt}`;

            const formData = new FormData();
            formData.append('file', {
                uri: manipulated.uri,
                name: fileName,
                type: 'image/jpeg',
            } as any);

            const { data, error } = await supabase.storage
                .from('covers')
                .upload(fileName, formData, {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('covers')
                .getPublicUrl(fileName);

            setImageUrl(publicUrl);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
            Alert.alert('Upload Failed', error.message);
        } finally {
            setUploading(false);
        }
    };

    // Reset form when modal opens
    useEffect(() => {
        if (visible) {
            if (existingFolder) {
                setName(existingFolder.name);
                setSelectedColor(existingFolder.color || COLLECTION_COLORS[0]);
                setSelectedIcon(existingFolder.icon || 'Folder');
                setIsPinned(!!existingFolder.is_pinned);
                setImageUrl(existingFolder.image_url || '');
            } else {
                setName('');
                setSelectedColor(COLLECTION_COLORS[0]);
                setSelectedIcon('Folder');
                setIsPinned(false);
                setImageUrl('');
                setIsShared(false);
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
                is_pinned: isPinned,
                image_url: imageUrl.trim() || undefined
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // If shared toggle is on and this is a new collection, trigger invite flow
            if (isShared && !existingFolder?.id && onCreatedShared) {
                // Fetch the just-created collection to get its ID
                const { data: created } = await supabase
                    .from('folders')
                    .select('id')
                    .eq('user_id', user?.id)
                    .eq('name', name.trim())
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (created?.id) {
                    onClose();
                    // Small delay so modal close animation finishes before opening invite
                    setTimeout(() => onCreatedShared(created.id, name.trim()), 400);
                    return;
                }
            }

            onClose();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save collection');
        } finally {
            setSaving(false);
        }
    };

    const handleUseLatestSift = async () => {
        if (!existingFolder?.id) return;

        try {
            const { data: pages, error } = await supabase
                .from('pages')
                .select('image_url')
                .eq('folder_id', existingFolder.id)
                .not('image_url', 'is', null)
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) throw error;

            if (pages && pages.length > 0 && pages[0].image_url) {
                setImageUrl(pages[0].image_url);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                Alert.alert('No Images', 'No sifts with images found in this collection.');
            }
        } catch (error: any) {
            Alert.alert('Error', 'Failed to fetch latest sift image.');
        }
    };

    const handleDelete = () => {
        if (!existingFolder?.id || !onDelete) return;

        Alert.alert(
            'Delete Collection',
            `Are you sure you want to delete "${existingFolder.name}"? Sifts in this collection won't be deleted.`,
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
            statusBarTranslucent
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

                        {/* Cover Image Upload */}
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

                            {isEditMode && (
                                <TouchableOpacity
                                    style={[styles.smallActionButton, { backgroundColor: colors.subtle, borderColor: colors.separator }]}
                                    onPress={handleUseLatestSift}
                                >
                                    <ImageSquare size={20} color={colors.ink} />
                                </TouchableOpacity>
                            )}

                            {imageUrl !== '' && (
                                <TouchableOpacity
                                    style={[styles.smallActionButton, { backgroundColor: OVERLAYS.light.dangerTint, borderColor: 'transparent' }]}
                                    onPress={() => setImageUrl('')}
                                >
                                    <X size={20} color={colors.danger} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Shared Toggle — only for new collections */}
                        {!isEditMode && (
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => {
                                    setIsShared(!isShared);
                                    Haptics.selectionAsync();
                                }}
                                style={[styles.sharedToggle, {
                                    backgroundColor: isShared ? (isDark ? 'rgba(138,175,154,0.15)' : 'rgba(138,175,154,0.1)') : (isDark ? 'rgba(255,255,255,0.05)' : colors.subtle),
                                    borderColor: isShared ? colors.accent : colors.separator,
                                }]}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                    <UsersThree size={20} color={isShared ? colors.accent : colors.stone} weight={isShared ? 'fill' : 'regular'} />
                                    <View style={{ flex: 1 }}>
                                        <Typography variant="bodyMedium">Shared Collection</Typography>
                                        <Typography variant="caption" color="stone" style={{ marginTop: 1 }}>
                                            Invite friends to collaborate after creating
                                        </Typography>
                                    </View>
                                </View>
                                <Switch
                                    value={isShared}
                                    onValueChange={(val) => {
                                        setIsShared(val);
                                        Haptics.selectionAsync();
                                    }}
                                    trackColor={{ false: isDark ? 'rgba(255,255,255,0.1)' : '#D1D1D6', true: colors.accent }}
                                    thumbColor="#FFFFFF"
                                    {...(Platform.OS === 'ios' ? { ios_backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#D1D1D6' } : {})}
                                />
                            </TouchableOpacity>
                        )}

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
                                <Trash size={20} color={colors.danger} />
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
        width: 40,
        height: 40,
        borderRadius: 20,
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
        width: 40, // Match colorOption width
        height: 40, // Match colorOption height
        borderRadius: 20, // Circular to match colorOption
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
        backgroundColor: OVERLAYS.light.dangerTint,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveButton: {
        flex: 1,
        borderRadius: RADIUS.m,
    },
    smallActionButton: {
        width: 52,
        height: 52,
        borderRadius: RADIUS.m,
        borderWidth: StyleSheet.hairlineWidth,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sharedToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.m,
        borderRadius: RADIUS.m,
        borderWidth: 1,
        marginBottom: SPACING.l,
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
