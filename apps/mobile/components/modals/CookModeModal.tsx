import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    View, Modal, StyleSheet, TouchableOpacity, FlatList,
    StatusBar, useWindowDimensions, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, CaretLeft, CaretRight, CookingPot, ListChecks, TextAa, Timer } from 'phosphor-react-native';
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

type TextSize = 'default' | 'large' | 'xlarge';

const TEXT_SIZES: Record<TextSize, { step: number; lineHeight: number; ingredient: number; ingredientLine: number }> = {
    default: { step: 24, lineHeight: 38, ingredient: 18, ingredientLine: 26 },
    large: { step: 30, lineHeight: 46, ingredient: 22, ingredientLine: 32 },
    xlarge: { step: 36, lineHeight: 54, ingredient: 26, ingredientLine: 38 },
};

/** Extract time durations mentioned in a step (e.g. "bake for 25 minutes") */
function parseTimerFromStep(step: string): { seconds: number; label: string } | null {
    const pattern = /(\d+)\s*[-–]?\s*(?:to\s*\d+\s*)?(?:(hour|hr|minute|min|second|sec)s?)/i;
    const match = step.match(pattern);
    if (!match) return null;

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    let seconds = value;
    if (unit.startsWith('hour') || unit.startsWith('hr')) seconds = value * 3600;
    else if (unit.startsWith('min')) seconds = value * 60;

    const label = unit.startsWith('hour') || unit.startsWith('hr')
        ? `${value} hr` : unit.startsWith('min')
            ? `${value} min` : `${value} sec`;

    return { seconds, label };
}

function formatTime(totalSeconds: number): string {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function parseSteps(summary: string): string[] {
    const steps: string[] = [];
    const lines = summary.split('\n');
    let currentStep = '';

    for (const line of lines) {
        const trimmed = line.trim();
        const stepMatch = trimmed.match(/^\d+[\.\)]\s+/);
        if (stepMatch) {
            if (currentStep) steps.push(currentStep.trim());
            currentStep = trimmed.replace(/^\d+[\.\)]\s+/, '').replace(/\*\*/g, '');
        } else if (currentStep && trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('-')) {
            currentStep += ' ' + trimmed.replace(/\*\*/g, '');
        }
    }
    if (currentStep) steps.push(currentStep.trim());

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

    // Text size
    const [textSize, setTextSize] = useState<TextSize>('default');
    const sizes = TEXT_SIZES[textSize];

    // Timer state
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [timerRunning, setTimerRunning] = useState(false);
    const [timerInitial, setTimerInitial] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const steps = React.useMemo(() => parseSteps(summary), [summary]);

    // Parse timer for current step
    const stepTimer = React.useMemo(() => {
        if (steps.length === 0) return null;
        return parseTimerFromStep(steps[currentStep] || '');
    }, [steps, currentStep]);

    // Reset state and keep screen awake when modal opens
    useEffect(() => {
        if (visible) {
            setCurrentStep(0);
            setShowIngredients(false);
            setCheckedIngredients(new Set());
            setTimerRunning(false);
            setTimerSeconds(0);
            setTimerInitial(0);
            activateKeepAwakeAsync('cook-mode').catch(() => {});
        } else {
            deactivateKeepAwake('cook-mode');
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            deactivateKeepAwake('cook-mode');
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [visible]);

    // Timer countdown
    useEffect(() => {
        if (timerRunning && timerSeconds > 0) {
            timerRef.current = setInterval(() => {
                setTimerSeconds(prev => {
                    if (prev <= 1) {
                        setTimerRunning(false);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [timerRunning, timerSeconds]);

    // Stop timer when changing steps
    useEffect(() => {
        setTimerRunning(false);
        setTimerSeconds(0);
        setTimerInitial(0);
    }, [currentStep]);

    const startTimer = useCallback((seconds: number) => {
        setTimerInitial(seconds);
        setTimerSeconds(seconds);
        setTimerRunning(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, []);

    const cycleTextSize = useCallback(() => {
        setTextSize(prev => {
            if (prev === 'default') return 'large';
            if (prev === 'large') return 'xlarge';
            return 'default';
        });
        Haptics.selectionAsync();
    }, []);

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

    const renderStep = ({ item, index }: { item: string; index: number }) => {
        const timer = parseTimerFromStep(item);
        return (
            <View style={[styles.stepPage, { width: width - SPACING.xl * 2 }]}>
                <Typography variant="caption" color="stone" style={styles.stepCounter}>
                    STEP {index + 1} OF {steps.length}
                </Typography>
                <Typography style={[styles.stepText, { color: textColor, fontSize: sizes.step, lineHeight: sizes.lineHeight }]}>
                    {item}
                </Typography>
                {timer && index === currentStep && !timerRunning && timerSeconds === 0 && (
                    <TouchableOpacity
                        onPress={() => startTimer(timer.seconds)}
                        style={[styles.timerButton, { backgroundColor: colors.accent }]}
                        activeOpacity={0.8}
                    >
                        <Timer size={18} color="#FFF" weight="bold" />
                        <Typography style={styles.timerButtonText}>
                            Start {timer.label} timer
                        </Typography>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    if (!visible) return null;

    const timerProgress = timerInitial > 0 ? timerSeconds / timerInitial : 0;

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
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity
                            onPress={cycleTextSize}
                            style={[styles.headerToggle, { backgroundColor: textSize !== 'default' ? colors.ink : subtleColor }]}
                            hitSlop={8}
                        >
                            <TextAa size={18} color={textSize !== 'default' ? colors.paper : textColor} weight="bold" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                setShowIngredients(!showIngredients);
                                Haptics.selectionAsync();
                            }}
                            style={[styles.headerToggle, { backgroundColor: showIngredients ? colors.ink : subtleColor }]}
                            hitSlop={8}
                        >
                            <ListChecks size={18} color={showIngredients ? colors.paper : textColor} weight="bold" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Recipe title */}
                <Typography variant="h3" numberOfLines={2} style={[styles.recipeTitle, { color: textColor }]}>
                    {title}
                </Typography>

                {/* Active timer banner */}
                {timerRunning || (timerSeconds === 0 && timerInitial > 0) ? (
                    <View style={[styles.timerBanner, { backgroundColor: timerSeconds === 0 ? colors.accent : subtleColor }]}>
                        <View style={styles.timerBannerContent}>
                            <Timer size={20} color={timerSeconds === 0 ? '#FFF' : colors.accent} weight="bold" />
                            <Typography style={[
                                styles.timerBannerText,
                                { color: timerSeconds === 0 ? '#FFF' : textColor }
                            ]}>
                                {timerSeconds === 0 ? "Timer done!" : formatTime(timerSeconds)}
                            </Typography>
                        </View>
                        {timerSeconds > 0 && (
                            <View style={[styles.timerProgressBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
                                <View style={[styles.timerProgressFill, { backgroundColor: colors.accent, width: `${timerProgress * 100}%` }]} />
                            </View>
                        )}
                        <TouchableOpacity
                            onPress={() => {
                                setTimerRunning(false);
                                setTimerSeconds(0);
                                setTimerInitial(0);
                                Haptics.selectionAsync();
                            }}
                            hitSlop={12}
                        >
                            <X size={16} color={timerSeconds === 0 ? '#FFF' : colors.stone} />
                        </TouchableOpacity>
                    </View>
                ) : null}

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
                                        {
                                            color: textColor,
                                            opacity: checked ? 0.4 : 1,
                                            fontSize: sizes.ingredient,
                                            lineHeight: sizes.ingredientLine,
                                        },
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
                            extraData={[textSize, timerRunning, timerSeconds]}
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
    headerToggle: {
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
    timerBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: SPACING.xl,
        marginBottom: SPACING.m,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: RADIUS.m,
        gap: 12,
    },
    timerBannerContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    timerBannerText: {
        fontFamily: 'GeistMono_400Regular',
        fontSize: 20,
        fontWeight: '700',
    },
    timerProgressBg: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        borderBottomLeftRadius: RADIUS.m,
        borderBottomRightRadius: RADIUS.m,
        overflow: 'hidden',
    },
    timerProgressFill: {
        height: '100%',
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
        fontFamily: 'Lora_400Regular',
    },
    timerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 8,
        marginTop: SPACING.l,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: RADIUS.pill,
    },
    timerButtonText: {
        color: '#FFF',
        fontFamily: 'Satoshi-Bold',
        fontSize: 14,
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
        fontFamily: 'Satoshi-Medium',
    },
});
