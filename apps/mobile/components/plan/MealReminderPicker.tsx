import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Typography } from '../design-system/Typography';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, RADIUS } from '../../lib/theme';
import { X, Bell, BellSlash } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';

interface MealReminderPickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (minutesBefore: number | null) => void;
    currentReminder?: string | null;
    mealTitle: string;
}

const REMINDER_OPTIONS = [
    { label: 'At meal time', minutes: 0 },
    { label: '15 minutes before', minutes: 15 },
    { label: '30 minutes before', minutes: 30 },
    { label: '1 hour before', minutes: 60 },
    { label: '2 hours before', minutes: 120 },
];

export function MealReminderPicker({ visible, onClose, onSelect, currentReminder, mealTitle }: MealReminderPickerProps) {
    const { colors, isDark } = useTheme();

    const handleSelect = (minutes: number) => {
        Haptics.selectionAsync();
        onSelect(minutes);
        onClose();
    };

    const handleRemove = () => {
        Haptics.selectionAsync();
        onSelect(null);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={onClose} />
                <View style={[styles.card, { backgroundColor: colors.canvas }]}>
                    <View style={styles.header}>
                        <Bell size={20} color={colors.accent} weight="fill" />
                        <Typography variant="h3" style={{ marginLeft: SPACING.s, flex: 1 }}>Set Reminder</Typography>
                        <TouchableOpacity onPress={onClose} hitSlop={8}>
                            <X size={20} color={colors.stone} />
                        </TouchableOpacity>
                    </View>

                    <Typography variant="caption" color="stone" style={{ paddingHorizontal: SPACING.l, marginBottom: SPACING.m }}>
                        {mealTitle}
                    </Typography>

                    {REMINDER_OPTIONS.map(opt => (
                        <TouchableOpacity
                            key={opt.minutes}
                            style={[
                                styles.option,
                                { backgroundColor: colors.surface, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
                            ]}
                            onPress={() => handleSelect(opt.minutes)}
                            activeOpacity={0.7}
                        >
                            <Typography variant="body" style={{ fontSize: 15 }}>
                                {opt.label}
                            </Typography>
                        </TouchableOpacity>
                    ))}

                    {currentReminder && (
                        <TouchableOpacity
                            style={[styles.removeBtn, { borderColor: colors.danger }]}
                            onPress={handleRemove}
                        >
                            <BellSlash size={16} color={colors.danger} />
                            <Typography variant="label" style={{ color: colors.danger, marginLeft: 6 }}>
                                Remove Reminder
                            </Typography>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    dismissArea: {
        ...StyleSheet.absoluteFillObject,
    },
    card: {
        width: '100%',
        borderRadius: RADIUS.xl,
        paddingVertical: SPACING.l,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.l,
        marginBottom: SPACING.s,
    },
    option: {
        marginHorizontal: SPACING.l,
        marginBottom: 8,
        padding: SPACING.m,
        borderRadius: RADIUS.m,
        borderWidth: 1,
    },
    removeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: SPACING.l,
        marginTop: SPACING.s,
        padding: SPACING.m,
        borderRadius: RADIUS.m,
        borderWidth: 1,
    },
});
