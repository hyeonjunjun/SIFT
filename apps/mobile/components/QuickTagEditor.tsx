
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, Platform, KeyboardAvoidingView, ActionSheetIOS } from 'react-native';
import { Typography } from './design-system/Typography';
import { COLORS, SPACING, RADIUS, Theme } from '../lib/theme';
import { X, Plus, Check } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';

interface QuickTagEditorProps {
    visible: boolean;
    onClose: () => void;
    initialTags: string[];
    onSave: (tags: string[]) => void;
    title?: string;
}

const ALLOWED_TAGS = ["Cooking", "Baking", "Tech", "Health", "Lifestyle", "Professional"];

export function QuickTagEditor({ visible, onClose, initialTags, onSave, title = "Edit Tags" }: QuickTagEditorProps) {
    const [tags, setTags] = useState<string[]>(initialTags);
    const [customTag, setCustomTag] = useState("");

    useEffect(() => {
        if (visible) {
            setTags(initialTags);
        }
    }, [visible, initialTags]);

    const toggleTag = (tag: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (tags.includes(tag)) {
            setTags(tags.filter(t => t !== tag));
        } else {
            setTags([...tags, tag]);
        }
    };

    const addCustomTag = () => {
        if (customTag.trim() && !tags.includes(customTag.trim())) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTags([...tags, customTag.trim()]);
            setCustomTag("");
        }
    };

    const handleSave = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onSave(tags);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <TouchableOpacity
                    style={styles.dismissArea}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View style={styles.sheet}>
                    <View style={styles.header}>
                        <Typography variant="h3">{title}</Typography>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={20} color={COLORS.ink} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        <Typography variant="label" color={COLORS.stone} style={styles.sectionLabel}>
                            CATEGORIES
                        </Typography>
                        <View style={styles.tagGrid}>
                            {ALLOWED_TAGS.map(tag => (
                                <TouchableOpacity
                                    key={tag}
                                    style={[
                                        styles.tag,
                                        tags.includes(tag) && styles.tagSelected
                                    ]}
                                    onPress={() => toggleTag(tag)}
                                >
                                    <View style={[styles.dot, tags.includes(tag) && styles.dotSelected]} />
                                    <Typography
                                        variant="label"
                                        style={[styles.tagText, tags.includes(tag) && styles.tagTextSelected]}
                                    >
                                        {tag.toUpperCase()}
                                    </Typography>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Typography variant="label" color={COLORS.stone} style={[styles.sectionLabel, { marginTop: 24 }]}>
                            CUSTOM TAGS
                        </Typography>
                        <View style={styles.customTagsContainer}>
                            {tags.filter(t => !ALLOWED_TAGS.includes(t)).map(tag => (
                                <View key={tag} style={styles.customTagPill}>
                                    <Typography variant="label" style={styles.customTagText}>{tag}</Typography>
                                    <TouchableOpacity onPress={() => toggleTag(tag)}>
                                        <X size={14} color={COLORS.ink} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>

                        <View style={styles.inputRow}>
                            <TextInput
                                style={styles.input}
                                placeholder="Add custom tag..."
                                placeholderTextColor={COLORS.stone}
                                value={customTag}
                                onChangeText={setCustomTag}
                                onSubmitEditing={addCustomTag}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            <TouchableOpacity style={styles.addButton} onPress={addCustomTag}>
                                <Plus size={20} color={COLORS.ink} />
                            </TouchableOpacity>
                        </View>
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                            <Typography variant="label" color="white" style={styles.saveButtonText}>
                                SAVE CHANGES
                            </Typography>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    dismissArea: {
        flex: 1,
    },
    sheet: {
        backgroundColor: COLORS.canvas,
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        maxHeight: '80%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.separator,
    },
    closeButton: {
        padding: 4,
    },
    content: {
        padding: 24,
    },
    sectionLabel: {
        marginBottom: 16,
        letterSpacing: 1,
    },
    tagGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: RADIUS.m,
        backgroundColor: COLORS.paper,
        borderWidth: 1,
        borderColor: COLORS.separator,
    },
    tagSelected: {
        backgroundColor: COLORS.ink,
        borderColor: COLORS.ink,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.separator,
        marginRight: 8,
    },
    dotSelected: {
        backgroundColor: COLORS.accent,
    },
    tagText: {
        fontSize: 11,
        color: COLORS.ink,
    },
    tagTextSelected: {
        color: 'white',
    },
    customTagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    customTagPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F2F2F2',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 4,
        gap: 6,
    },
    customTagText: {
        fontSize: 12,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
        marginBottom: 24,
    },
    input: {
        flex: 1,
        height: 48,
        backgroundColor: COLORS.paper,
        borderRadius: RADIUS.m,
        paddingHorizontal: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: COLORS.separator,
    },
    addButton: {
        width: 48,
        height: 48,
        backgroundColor: COLORS.paper,
        borderRadius: RADIUS.m,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.separator,
    },
    footer: {
        paddingHorizontal: 24,
        paddingTop: 16,
    },
    saveButton: {
        height: 56,
        backgroundColor: COLORS.ink,
        borderRadius: RADIUS.pill,
        alignItems: 'center',
        justifyContent: 'center',
        // @ts-ignore
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    saveButtonText: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.5,
    }
});
