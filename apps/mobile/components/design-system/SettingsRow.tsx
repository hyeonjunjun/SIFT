import React from 'react';
import { View, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { Typography } from './Typography';
import { COLORS, SPACING } from '../../lib/theme';

import { useTheme } from '../../context/ThemeContext';

interface SettingsRowProps {
    label: string;
    value?: boolean;
    onValueChange?: (value: boolean) => void;
    onPress?: () => void;
    type?: 'toggle' | 'button' | 'info';
    description?: string;
    icon?: React.ReactNode;
}

export function SettingsRow({
    label,
    value,
    onValueChange,
    onPress,
    type = 'button',
    description,
    icon
}: SettingsRowProps) {
    const { colors } = useTheme();

    const content = (
        <View style={styles.container}>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            <View style={styles.textContainer}>
                <Typography variant="body" color={colors.ink}>{label}</Typography>
                {description && (
                    <Typography variant="caption" color={colors.stone}>{description}</Typography>
                )}
            </View>

            {type === 'toggle' && (
                <Switch
                    value={value}
                    onValueChange={onValueChange}
                    trackColor={{ false: colors.separator, true: colors.accent }}
                    thumbColor={colors.paper}
                    ios_backgroundColor={colors.separator}
                />
            )}
        </View>
    );

    if (type === 'button') {
        return (
            <TouchableOpacity
                style={[styles.wrapper, { backgroundColor: colors.paper, borderBottomColor: colors.separator }]}
                onPress={onPress}
            >
                {content}
            </TouchableOpacity>
        );
    }

    return <View style={[styles.wrapper, { backgroundColor: colors.paper, borderBottomColor: colors.separator }]}>{content}</View>;
}

const styles = StyleSheet.create({
    wrapper: {
        paddingHorizontal: 20,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        minHeight: 64,
    },
    iconContainer: {
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    }
});
