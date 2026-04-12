import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { CaretLeft, Plus, Trash, ArrowsOutCardinal, Check, X } from 'phosphor-react-native';
import { Typography } from '../../components/design-system/Typography';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, RADIUS, Theme } from '../../lib/theme';
import ScreenWrapper from '../../components/ScreenWrapper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const DEFAULT_MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const STORAGE_KEY = 'meal_types';

export default function MealTypesScreen() {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const [mealTypes, setMealTypes] = useState<string[]>(DEFAULT_MEAL_TYPES);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editValue, setEditValue] = useState('');
    const [adding, setAdding] = useState(false);
    const [newValue, setNewValue] = useState('');

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then(val => {
            if (val) setMealTypes(JSON.parse(val));
        }).catch(() => {});
    }, []);

    const save = (next: string[]) => {
        setMealTypes(next);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        Haptics.selectionAsync();
    };

    const handleAdd = () => {
        const trimmed = newValue.trim();
        if (!trimmed) {
            setAdding(false);
            return;
        }
        if (mealTypes.includes(trimmed)) {
            Alert.alert('Already exists', 'That meal type is already in your list.');
            return;
        }
        save([...mealTypes, trimmed]);
        setNewValue('');
        setAdding(false);
    };

    const handleRename = (idx: number) => {
        const trimmed = editValue.trim();
        if (!trimmed) return;
        if (mealTypes.includes(trimmed) && mealTypes[idx] !== trimmed) {
            Alert.alert('Already exists', 'That meal type is already in your list.');
            return;
        }
        const next = [...mealTypes];
        next[idx] = trimmed;
        save(next);
        setEditingIndex(null);
    };

    const handleDelete = (idx: number) => {
        if (mealTypes.length <= 1) {
            Alert.alert('Cannot delete', 'You must have at least one meal type.');
            return;
        }
        Alert.alert('Delete meal type?', `"${mealTypes[idx]}" will be removed. Existing meals with this type will stay on your plan.`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: () => {
                    save(mealTypes.filter((_, i) => i !== idx));
                }
            },
        ]);
    };

    const handleMove = (idx: number, dir: 'up' | 'down') => {
        const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= mealTypes.length) return;
        const next = [...mealTypes];
        [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
        save(next);
    };

    const handleReset = () => {
        Alert.alert('Reset to defaults?', 'Your meal types will be reset to Breakfast, Lunch, Dinner, Snack.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Reset', style: 'destructive', onPress: () => save(DEFAULT_MEAL_TYPES) },
        ]);
    };

    return (
        <ScreenWrapper edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
                    <CaretLeft size={28} color={colors.ink} />
                </TouchableOpacity>
                <Typography variant="h3" style={{ flex: 1 }}>Meal Types</Typography>
                <TouchableOpacity onPress={handleReset}>
                    <Typography variant="caption" color="stone">Reset</Typography>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Typography variant="caption" color="stone" style={styles.description}>
                    Customize the meal slots that appear in your meal plan. You can rename, reorder, add, or remove meal types.
                </Typography>

                {mealTypes.map((type, idx) => (
                    <View
                        key={`${type}-${idx}`}
                        style={[styles.row, { backgroundColor: colors.surface, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}
                    >
                        {editingIndex === idx ? (
                            <>
                                <TextInput
                                    value={editValue}
                                    onChangeText={setEditValue}
                                    autoFocus
                                    style={[styles.input, { color: colors.ink }]}
                                    onSubmitEditing={() => handleRename(idx)}
                                    placeholderTextColor={colors.stone}
                                />
                                <TouchableOpacity onPress={() => handleRename(idx)} hitSlop={8} style={styles.iconBtn}>
                                    <Check size={18} color={colors.accent} weight="bold" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setEditingIndex(null)} hitSlop={8} style={styles.iconBtn}>
                                    <X size={18} color={colors.stone} />
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <View style={styles.handles}>
                                    <TouchableOpacity onPress={() => handleMove(idx, 'up')} disabled={idx === 0} hitSlop={6}>
                                        <Typography variant="caption" style={{ color: idx === 0 ? colors.stone + '40' : colors.stone, fontSize: 16 }}>↑</Typography>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleMove(idx, 'down')} disabled={idx === mealTypes.length - 1} hitSlop={6}>
                                        <Typography variant="caption" style={{ color: idx === mealTypes.length - 1 ? colors.stone + '40' : colors.stone, fontSize: 16 }}>↓</Typography>
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity
                                    style={{ flex: 1 }}
                                    onPress={() => { setEditingIndex(idx); setEditValue(type); }}
                                >
                                    <Typography variant="body" style={{ fontSize: 16 }}>{type}</Typography>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDelete(idx)} hitSlop={8} style={styles.iconBtn}>
                                    <Trash size={18} color={colors.stone} />
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                ))}

                {adding ? (
                    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.accent }]}>
                        <TextInput
                            value={newValue}
                            onChangeText={setNewValue}
                            autoFocus
                            placeholder="e.g. Pre-workout, Dessert"
                            style={[styles.input, { color: colors.ink }]}
                            onSubmitEditing={handleAdd}
                            placeholderTextColor={colors.stone}
                        />
                        <TouchableOpacity onPress={handleAdd} hitSlop={8} style={styles.iconBtn}>
                            <Check size={18} color={colors.accent} weight="bold" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setAdding(false); setNewValue(''); }} hitSlop={8} style={styles.iconBtn}>
                            <X size={18} color={colors.stone} />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[styles.addBtn, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}
                        onPress={() => setAdding(true)}
                        activeOpacity={0.6}
                    >
                        <Plus size={18} color={colors.stone} />
                        <Typography variant="body" color="stone" style={{ marginLeft: SPACING.s }}>
                            Add Meal Type
                        </Typography>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.l,
        height: 60,
        gap: SPACING.s,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    content: {
        paddingHorizontal: SPACING.l,
        paddingTop: SPACING.m,
        paddingBottom: 60,
    },
    description: {
        marginBottom: SPACING.l,
        lineHeight: 18,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.m,
        borderRadius: RADIUS.m,
        borderWidth: 1,
        marginBottom: SPACING.s,
        gap: SPACING.s,
    },
    handles: {
        gap: 2,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'Satoshi-Regular',
        paddingVertical: 0,
    },
    iconBtn: {
        padding: 4,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.m,
        borderRadius: RADIUS.m,
        borderWidth: 1,
        borderStyle: 'dashed',
        marginTop: SPACING.s,
    },
});
