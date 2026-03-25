import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    View, Modal, StyleSheet, TouchableOpacity, FlatList,
    StatusBar, useWindowDimensions, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, CaretLeft, CaretRight, CookingPot, ListChecks } from 'phosphor-react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';

import { Typography } from '../design-system/Typography';
import { SPACING, RADIUS } from '../../lib/theme';
import { useTheme } from '../../context/ThemeContext';

interface CookModeModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    ingredients: string[];
    summary: string;
    servingMultiplier?: number;
    scaleIngredient?: (ingredient: string, multiplier: number) => string;
}

function parseSteps(summary: string): string[] {
    const steps: string[] = [];
    // Match numbered steps: "1. **Step**:" or "1. Step" patterns
    const lines = summary.split('\n');
    let currentStep = '';

    for (const line of lines) {
        const trimmed = line.trim();
        // Detect numbered step start
        const stepMatch = trimmed.match(/^\d+[\.\)]\s+/);
        if (stepMatch) {
            if (currentStep) steps.push(currentStep.trim());
            // Remove the number prefix and markdown bold
            currentStep = trimmed.replace(/^\d+[\.\)]\s+/, '').replace(/\*\*/g, '');
        } else if (currentStep && trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('-')) {
            // Continue multi-line step
            currentStep += ' ' + trimmed.replace(/\*\*/g, '');
        }
    }
    if (currentStep) steps.push(currentStep.trim());

    // Fallback: split by sentences if no numbered steps found
    if (steps.length === 0) {
        const preparationMatch = summary.match(/## Preparation([\s\S]*?)(?=##|$)/i);
        const text = preparationMatch ? preparationMatch[1] : summary;
        const sentences = text.split(/\.\s+/).filter(s => s.trim().length > 20);
        return sentences.map(s => s.replace(/\*\*/g, '').trim() + (s.endsWith('.') ? '' : '.'));
    }

    return steps;
}

export function CookModeModal({
    visible,
    onClose,
    title,
    ingredients,
    summary,
    servingMultiplier = 1,
    scaleIngredient,
}: CookModeModalProps) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const [currentStep, setCurrentStep] = useState(0);
    const [showIngredients, setShowIngredients] = useState(false);
    const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
    const flatListRef = useRef<FlatList>(null);

    const steps = React.useMemo(() => parseSteps(summary), [summary]);

    // Reset state and keep screen awake when modal opens
    useEffect(() => {
        if (visible) {
            setCurrentStep(0);
            setShowIngredients(false);
            setCheckedIngredients(new Set());
            activateKeepAwakeAsync('cook-mode').catch(() => {});
        } else {
            deactivateKeepAwake('cook-mode');
        }
        return () => { deactivateKeepAwake('cook-mode'); };
    }, [visible]);

    const goToStep = useCallback((index: number) => {
        if (index < 0 || index >= steps.length) return;
        setCurrentStep(index);
        flatListRef.current?.scrollToIndex({ index, animated: true });
        Haptics.selectionAsync();
    }, [steps.length]);

    const toggleIngredient = (idx: number) => {
        setCheckedIngredients(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
        Haptics.selectionAsync();
    };

    const bg = isDark ? '#0A0908' : '#FDFCF8';
    const textColor = isDark ? '#F5F2ED' : '#2C2420';
    const subtleColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';

    const renderStep = ({ item, index }: { item: string; index: number }) => (
        <View style={[styles.stepPage, { width: width - SPACING.xl * 2 }]}>
            <Typography variant="caption" color="stone" style={styles.stepCounter}>
                STEP {index + 1} OF {steps.length}
            </Typography>
            <Typography style={[styles.stepText, { color: textColor }]}>
                {item}
            </Typography>
        </View>
    );

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" {...(Platform.OS === 'ios' ? { presentationStyle: 'fullScreen' } : { statusBarTranslucent: true })}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <View style={[styles.container, { backgroundColor: bg, paddingTop: insets.top }]}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={12}>
                        <X size={24} color={textColor} weight="bold" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                        <CookingPot size={20} color={colors.stone} weight="fill" />
                        <Typography variant="caption" color="stone" style={{ fontSize: 10, letterSpacing: 1, marginTop: 2 }}>
                            COOK MODE
                        </Typography>
                    </View>
                    <TouchableOpacity
                        onPress={() => {
                            setShowIngredients(!showIngredients);
                            Haptics.selectionAsync();
                        }}
                        style={[styles.ingredientToggle, { backgroundColor: showIngredients ? colors.ink : subtleColor }]}
                        hitSlop={8}
                    >
                        <ListChecks size={18} color={showIngredients ? colors.paper : textColor} weight="bold" />
                    </TouchableOpacity>
                </View>

                {/* Recipe title */}
                <Typography variant="h3" numberOfLines={2} style={[styles.recipeTitle, { color: textColor }]}>
                    {title}
                </Typography>

                {/* Progress bar */}
                <View style={[styles.progressBar, { backgroundColor: subtleColor }]}>
                    <View style={[
                        styles.progressFill,
                        {
                            backgroundColor: colors.accent,
                            width: `${((currentStep + 1) / steps.length) * 100}%`,
                        }
                    ]} />
                </View>

                {showIngredients ? (
                    /* Ingredients Checklist */
                    <FlatList
                        data={ingredients}
                        keyExtractor={(_, i) => `ing-${i}`}
                        contentContainerStyle={{ paddingHorizontal: SPACING.xl, paddingTop: SPACING.l, paddingBottom: insets.bottom + 100 }}
                        renderItem={({ item, index }) => {
                            const checked = checkedIngredients.has(index);
                            const scaled = scaleIngredient ? scaleIngredient(item, servingMultiplier) : item;
                            return (
                                <TouchableOpacity
                                    onPress={() => toggleIngredient(index)}
                                    style={styles.ingredientRow}
                                    activeOpacity={0.7}
                                >
                                    <View style={[
                                        styles.checkbox,
                                        {
                                            borderColor: checked ? colors.accent : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'),
                                            backgroundColor: checked ? colors.accent : 'transparent',
                                        }
                                    ]}>
                                        {checked && <Typography style={{ color: '#FFF', fontSize: 12, lineHeight: 14 }}>✓</Typography>}
                                    </View>
                                    <Typography style={[
                                        styles.ingredientText,
                                        { color: textColor, opacity: checked ? 0.4 : 1 },
                                        checked && { textDecorationLine: 'line-through' },
                                    ]}>
                                        {scaled}
                                    </Typography>
                                </TouchableOpacity>
                            );
                        }}
                    />
                ) : (
                    /* Steps View */
                    <>
                        <FlatList
                            ref={flatListRef}
                            data={steps}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={(_, i) => `step-${i}`}
                            renderItem={renderStep}
                            contentContainerStyle={{ paddingHorizontal: SPACING.xl }}
                            snapToInterval={width - SPACING.xl * 2}
                            decelerationRate="fast"
                            onMomentumScrollEnd={(e) => {
                                const idx = Math.round(e.nativeEvent.contentOffset.x / (width - SPACING.xl * 2));
                                setCurrentStep(idx);
                            }}
                            getItemLayout={(_, index) => ({
                                length: width - SPACING.xl * 2,
                                offset: (width - SPACING.xl * 2) * index,
                                index,
                            })}
                        />

                        {/* Step Navigation */}
                        <View style={[styles.navRow, { paddingBottom: insets.bottom + SPACING.m }]}>
                            <TouchableOpacity
                                onPress={() => goToStep(currentStep - 1)}
                                style={[styles.navButton, { backgroundColor: subtleColor, opacity: currentStep === 0 ? 0.3 : 1 }]}
                                disabled={currentStep === 0}
                            >
                                <CaretLeft size={24} color={textColor} weight="bold" />
                            </TouchableOpacity>

                            {/* Step dots */}
                            <View style={styles.dots}>
                                {steps.map((_, i) => (
                                    <View
                                        key={i}
                                        style={[
                                            styles.dot,
                                            {
                                                backgroundColor: i === currentStep ? colors.accent : subtleColor,
                                                width: i === currentStep ? 24 : 8,
                                            }
                                        ]}
                                    />
                                ))}
                            </View>

                            <TouchableOpacity
                                onPress={() => {
                                    if (currentStep === steps.length - 1) {
                                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                        onClose();
                                    } else {
                                        goToStep(currentStep + 1);
                                    }
                                }}
                                style={[
                                    styles.navButton,
                                    {
                                        backgroundColor: currentStep === steps.length - 1 ? colors.accent : subtleColor,
                                    }
                                ]}
                            >
                                {currentStep === steps.length - 1 ? (
                                    <Typography style={{ color: '#FFF', fontFamily: 'Satoshi-Bold', fontSize: 14 }}>Done</Typography>
                                ) : (
                                    <CaretRight size={24} color={textColor} weight="bold" />
                                )}
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.m,
        paddingBottom: SPACING.s,
    },
    closeButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ingredientToggle: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.m,
        justifyContent: 'center',
        alignItems: 'center',
    },
    recipeTitle: {
        paddingHorizontal: SPACING.xl,
        marginBottom: SPACING.m,
        fontSize: 20,
        lineHeight: 26,
    },
    progressBar: {
        height: 3,
        marginHorizontal: SPACING.xl,
        borderRadius: 2,
        marginBottom: SPACING.l,
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
    stepPage: {
        flex: 1,
        justifyContent: 'center',
        paddingVertical: SPACING.xl,
    },
    stepCounter: {
        fontSize: 12,
        letterSpacing: 2,
        fontFamily: 'GeistMono_400Regular',
        marginBottom: SPACING.l,
        opacity: 0.5,
    },
    stepText: {
        fontSize: 24,
        lineHeight: 38,
        fontFamily: 'Lora_400Regular',
    },
    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.m,
    },
    navButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dots: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
        justifyContent: 'center',
        flexWrap: 'wrap',
    },
    dot: {
        height: 8,
        borderRadius: 4,
    },
    ingredientRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 12,
        gap: SPACING.m,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(128,128,128,0.15)',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    ingredientText: {
        flex: 1,
        fontSize: 18,
        lineHeight: 26,
        fontFamily: 'Satoshi-Medium',
    },
});
