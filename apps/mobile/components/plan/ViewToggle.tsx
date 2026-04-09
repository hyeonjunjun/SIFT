import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Typography } from '../design-system/Typography';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS } from '../../lib/theme';
import Animated, { useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

type ViewMode = 'day' | 'week' | 'month';

interface ViewToggleProps {
    value: ViewMode;
    onChange: (mode: ViewMode) => void;
}

const OPTIONS: { key: ViewMode; label: string }[] = [
    { key: 'day', label: 'D' },
    { key: 'week', label: 'W' },
    { key: 'month', label: 'M' },
];

export function ViewToggle({ value, onChange }: ViewToggleProps) {
    const { colors, isDark } = useTheme();
    const activeIndex = OPTIONS.findIndex(o => o.key === value);

    const indicatorStyle = useAnimatedStyle(() => ({
        transform: [{
            translateX: withTiming(activeIndex * 40, { duration: 200, easing: Easing.out(Easing.quad) }),
        }],
    }));

    return (
        <View style={[styles.container, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
            <Animated.View style={[styles.indicator, { backgroundColor: colors.ink }, indicatorStyle]} />
            {OPTIONS.map(opt => {
                const isActive = opt.key === value;
                return (
                    <TouchableOpacity
                        key={opt.key}
                        style={styles.option}
                        onPress={() => {
                            if (opt.key !== value) {
                                Haptics.selectionAsync();
                                onChange(opt.key);
                            }
                        }}
                        activeOpacity={0.8}
                    >
                        <Typography
                            variant="label"
                            style={[styles.label, { color: isActive ? colors.paper : colors.stone }]}
                        >
                            {opt.label}
                        </Typography>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        borderRadius: RADIUS.pill,
        padding: 3,
        position: 'relative',
    },
    indicator: {
        position: 'absolute',
        top: 3,
        left: 3,
        width: 40,
        height: 30,
        borderRadius: RADIUS.pill,
    },
    option: {
        width: 40,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
});
