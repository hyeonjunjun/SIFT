import React from 'react';
import { View, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { Typography } from './Typography';
import { COLORS, SPACING } from '../../lib/theme';

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
    const content = (
        <View style={styles.container}>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            <View style={styles.textContainer}>
                <Typography variant="body">{label}</Typography>
                {description && (
                    <Typography variant="caption" color={COLORS.stone}>{description}</Typography>
                )}
            </View>

            {type === 'toggle' && (
                <Switch
                    value={value}
                    onValueChange={onValueChange}
                    trackColor={{ false: COLORS.separator, true: COLORS.accent }}
                    thumbColor={COLORS.paper}
                    ios_backgroundColor={COLORS.separator}
                />
            )}
        </View>
    );

    if (type === 'button') {
        return (
            <TouchableOpacity style={styles.wrapper} onPress={onPress}>
                {content}
            </TouchableOpacity>
        );
    }

    return <View style={styles.wrapper}>{content}</View>;
}

const styles = StyleSheet.create({
    wrapper: {
        backgroundColor: COLORS.paper,
        paddingHorizontal: 20,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.separator,
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
