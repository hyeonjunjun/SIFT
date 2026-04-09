import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Typography } from '../design-system/Typography';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, RADIUS, Theme } from '../../lib/theme';
import {
    ArrowsClockwise, ArrowRight, Bell, BellSlash, Trash, Users,
    CalendarX, CalendarCheck, Copy, X, CookingPot, ArrowSquareOut,
} from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';

interface MealOptionsSheetProps {
    visible: boolean;
    onClose: () => void;
    meal: {
        id: string;
        meal_type: string;
        date: string;
        recurring_rule?: string | null;
        reminder_time?: string | null;
        page?: {
            id?: string;
            title?: string;
            metadata?: {
                image_url?: string;
                smart_data?: {
                    total_time?: string;
                    nutrition_per_serving?: { calories?: number };
                };
            };
        };
    } | null;
    mealTypes: string[];
    onViewRecipe: () => void;
    onStartCooking: () => void;
    onMoveTo: (newType: string) => void;
    onSetReminder: () => void;
    onRemoveReminder: () => void;
    onShareWithFriend: () => void;
    onToggleRecurring: () => void;
    onStopRepeating: () => void;
    onDeleteThis: () => void;
    onDeleteAllInstances: () => void;
    onDeleteFutureInstances: () => void;
    onDeletePastInstances: () => void;
    onCopyToDay: () => void;
}

export function MealOptionsSheet({
    visible, onClose, meal, mealTypes,
    onViewRecipe, onStartCooking, onMoveTo, onSetReminder, onRemoveReminder,
    onShareWithFriend, onToggleRecurring, onStopRepeating,
    onDeleteThis, onDeleteAllInstances, onDeleteFutureInstances, onDeletePastInstances,
    onCopyToDay,
}: MealOptionsSheetProps) {
    const { colors, isDark } = useTheme();

    if (!meal) return null;

    const isRecurring = !!meal.recurring_rule;
    const hasReminder = !!meal.reminder_time;
    const hasIngredients = (meal.page?.metadata?.smart_data as any)?.ingredients?.length > 0;
    const otherTypes = mealTypes.filter(t => t !== meal.meal_type);

    const Section = ({ children }: { children: React.ReactNode }) => (
        <View style={[styles.section, { borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
            {children}
        </View>
    );

    const Option = ({ icon, label, color, onPress, destructive }: {
        icon: React.ReactNode; label: string; color?: string; onPress: () => void; destructive?: boolean;
    }) => (
        <TouchableOpacity
            style={styles.option}
            onPress={() => { Haptics.selectionAsync(); onPress(); onClose(); }}
            activeOpacity={0.6}
        >
            {icon}
            <Typography variant="body" style={[styles.optionLabel, destructive && { color: colors.danger }, color ? { color } : {}]}>
                {label}
            </Typography>
        </TouchableOpacity>
    );

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={onClose} />
                <View style={[styles.sheet, { backgroundColor: colors.canvas }]}>
                    {/* Drag handle */}
                    <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }]} />

                    {/* Meal header */}
                    <View style={styles.header}>
                        {meal.page?.metadata?.image_url && (
                            <Image source={{ uri: meal.page.metadata.image_url }} style={styles.mealImage} />
                        )}
                        <View style={{ flex: 1, marginLeft: meal.page?.metadata?.image_url ? SPACING.m : 0 }}>
                            <Typography variant="h3" numberOfLines={2} style={{ fontSize: 18 }}>
                                {meal.page?.title || 'Untitled'}
                            </Typography>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                <Typography variant="caption" color="stone">{meal.meal_type}</Typography>
                                {meal.page?.metadata?.smart_data?.total_time && (
                                    <Typography variant="caption" color="stone">• {meal.page.metadata.smart_data.total_time}</Typography>
                                )}
                                {meal.page?.metadata?.smart_data?.nutrition_per_serving?.calories && (
                                    <Typography variant="caption" color="stone">• {meal.page.metadata.smart_data.nutrition_per_serving.calories} cal</Typography>
                                )}
                                {isRecurring && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                        <ArrowsClockwise size={10} color={colors.accent} weight="bold" />
                                        <Typography variant="caption" style={{ color: colors.accent, fontSize: 10 }}>Repeats</Typography>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Actions */}
                    <View style={styles.actions}>
                        {/* Quick actions */}
                        <Section>
                            <Option
                                icon={<ArrowSquareOut size={20} color={colors.ink} />}
                                label="View Recipe"
                                onPress={onViewRecipe}
                            />
                            {hasIngredients && (
                                <Option
                                    icon={<CookingPot size={20} color={colors.ink} />}
                                    label="Start Cooking"
                                    onPress={onStartCooking}
                                />
                            )}
                            <Option
                                icon={<Users size={20} color={colors.ink} />}
                                label="Share with Friend"
                                onPress={onShareWithFriend}
                            />
                            <Option
                                icon={<Copy size={20} color={colors.ink} />}
                                label="Copy to Another Day"
                                onPress={onCopyToDay}
                            />
                        </Section>

                        {/* Move to */}
                        {otherTypes.length > 0 && (
                            <Section>
                                {otherTypes.map(t => (
                                    <Option
                                        key={t}
                                        icon={<ArrowRight size={20} color={colors.ink} />}
                                        label={`Move to ${t}`}
                                        onPress={() => onMoveTo(t)}
                                    />
                                ))}
                            </Section>
                        )}

                        {/* Reminder & Repeat */}
                        <Section>
                            {hasReminder ? (
                                <Option
                                    icon={<BellSlash size={20} color={colors.ink} />}
                                    label="Remove Reminder"
                                    onPress={onRemoveReminder}
                                />
                            ) : (
                                <Option
                                    icon={<Bell size={20} color={colors.ink} />}
                                    label="Set Reminder"
                                    onPress={onSetReminder}
                                />
                            )}
                            {isRecurring ? (
                                <Option
                                    icon={<CalendarX size={20} color={colors.ink} />}
                                    label="Stop Repeating"
                                    onPress={onStopRepeating}
                                />
                            ) : (
                                <Option
                                    icon={<ArrowsClockwise size={20} color={colors.ink} />}
                                    label="Repeat Every Week"
                                    onPress={onToggleRecurring}
                                />
                            )}
                        </Section>

                        {/* Delete options */}
                        <Section>
                            <Option
                                icon={<Trash size={20} color={colors.danger} />}
                                label="Remove This Meal"
                                onPress={onDeleteThis}
                                destructive
                            />
                            {isRecurring && (
                                <>
                                    <Option
                                        icon={<CalendarX size={20} color={colors.danger} />}
                                        label="Remove All Instances"
                                        onPress={onDeleteAllInstances}
                                        destructive
                                    />
                                    <Option
                                        icon={<CalendarX size={20} color={colors.danger} />}
                                        label="Remove This & Future"
                                        onPress={onDeleteFutureInstances}
                                        destructive
                                    />
                                    <Option
                                        icon={<CalendarX size={20} color={colors.danger} />}
                                        label="Remove Past Instances"
                                        onPress={onDeletePastInstances}
                                        destructive
                                    />
                                </>
                            )}
                        </Section>
                    </View>
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
        maxHeight: '80%',
        paddingBottom: 40,
    },
    handle: {
        width: 40,
        height: 5,
        borderRadius: 2.5,
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: SPACING.m,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.l,
        marginBottom: SPACING.l,
    },
    mealImage: {
        width: 60,
        height: 60,
        borderRadius: RADIUS.m,
    },
    actions: {
        paddingHorizontal: SPACING.l,
    },
    section: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        marginBottom: SPACING.s,
        paddingBottom: SPACING.s,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: SPACING.m,
    },
    optionLabel: {
        fontSize: 15,
    },
});
