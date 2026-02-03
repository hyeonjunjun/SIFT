import React from 'react';
import { View, Switch, TouchableOpacity, StyleSheet, Pressable, Platform } from 'react-native';
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

    const renderContent = (hovered = false) => (
        <View style={[
            styles.container,
            hovered && Platform.OS === 'web' && { backgroundColor: colors.subtle }
        ]}>
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

    if (type === 'button' || type === 'toggle' || onPress) {
        return (
            <Pressable
                style={({ hovered }: any) => [
                    styles.wrapper,
                    { backgroundColor: colors.paper, borderBottomColor: colors.separator },
                    hovered && Platform.OS === 'web' && { backgroundColor: colors.subtle }
                ]}
                onPress={onPress}
            >
                {({ hovered }: any) => renderContent(hovered)}
            </Pressable>
        );
    }

    return (
        <View style={[styles.wrapper, { backgroundColor: colors.paper, borderBottomColor: colors.separator }]}>
            {renderContent()}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        paddingHorizontal: 20,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 20,
        minHeight: 72,
    },
    iconContainer: {
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    }
});
