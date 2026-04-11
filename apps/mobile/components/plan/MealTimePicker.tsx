import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Typography } from '../design-system/Typography';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, RADIUS } from '../../lib/theme';
import { X, Clock } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';

interface MealTimePickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (time: string | null) => void; // "HH:mm" or null to remove
    currentTime?: string | null;
    mealTitle: string;
    mealType: string;
}

// Generate time slots from 6:00 AM to 11:00 PM in 30 min increments
const TIME_SLOTS = (() => {
    const slots: { value: string; label: string }[] = [];
    for (let h = 6; h <= 23; h++) {
        for (const m of [0, 30]) {
            const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
            const period = h >= 12 ? 'PM' : 'AM';
            const label = `${hour12}:${String(m).padStart(2, '0')} ${period}`;
            slots.push({ value, label });
        }
    }
    return slots;
})();

export function MealTimePicker({ visible, onClose, onSelect, currentTime, mealTitle }: MealTimePickerProps) {
    const { colors, isDark } = useTheme();

    const handleSelect = (value: string) => {
        Haptics.selectionAsync();
        onSelect(value);
        onClose();
    };

    const handleRemove = () => {
        Haptics.selectionAsync();
        onSelect(null);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={onClose} />
                <View style={[styles.sheet, { backgroundColor: colors.canvas }]}>
                    <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }]} />

                    <View style={styles.header}>
                        <Clock size={20} color={colors.accent} weight="fill" />
                        <View style={{ marginLeft: SPACING.s, flex: 1 }}>
                            <Typography variant="h3" style={{ fontSize: 18 }}>Set Time</Typography>
                            <Typography variant="caption" color="stone" numberOfLines={1}>{mealTitle}</Typography>
                        </View>
                        <TouchableOpacity onPress={onClose} hitSlop={8} style={[styles.closeBtn, { backgroundColor: colors.subtle }]}>
                            <X size={16} color={colors.ink} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
                        {TIME_SLOTS.map(slot => {
                            const isSelected = slot.value === currentTime;
                            return (
                                <TouchableOpacity
                                    key={slot.value}
                                    style={[
                                        styles.timeRow,
                                        { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
                                        isSelected && { backgroundColor: colors.accent + '15' },
                                    ]}
                                    onPress={() => handleSelect(slot.value)}
                                    activeOpacity={0.6}
                                >
                                    <Typography
                                        variant="body"
                                        style={[
                                            { fontSize: 16 },
                                            isSelected && { color: colors.accent, fontWeight: '600' },
                                        ]}
                                    >
                                        {slot.label}
                                    </Typography>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {currentTime && (
                        <View style={styles.footer}>
                            <TouchableOpacity
                                style={[styles.removeBtn, { borderColor: colors.danger }]}
                                onPress={handleRemove}
                            >
                                <Typography variant="label" style={{ color: colors.danger }}>
                                    Remove Time
                                </Typography>
                            </TouchableOpacity>
                        </View>
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
        justifyContent: 'flex-end',
    },
    dismissArea: { flex: 1 },
    sheet: {
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
        maxHeight: '70%',
        paddingBottom: SPACING.l,
    },
    handle: {
        width: 40,
        height: 5,
        borderRadius: 2.5,
        alignSelf: 'center',
        marginTop: SPACING.s + 2,
        marginBottom: SPACING.m,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.l,
        marginBottom: SPACING.m,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: {
        paddingHorizontal: SPACING.l,
    },
    timeRow: {
        paddingVertical: SPACING.m - 2,
        paddingHorizontal: SPACING.m,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderRadius: RADIUS.s,
    },
    footer: {
        paddingHorizontal: SPACING.l,
        paddingTop: SPACING.m,
    },
    removeBtn: {
        paddingVertical: SPACING.m - 2,
        borderRadius: RADIUS.pill,
        borderWidth: 1,
        alignItems: 'center',
    },
});
