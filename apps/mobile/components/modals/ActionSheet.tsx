import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Pressable, Platform } from 'react-native';
import { Typography } from '../design-system/Typography';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, RADIUS, Theme, OVERLAYS } from '../../lib/theme';
import { IconProps } from 'phosphor-react-native';

export interface ActionSheetOption {
    label: string;
    onPress: () => void;
    icon?: React.ComponentType<IconProps>;
    isDestructive?: boolean;
    isCancel?: boolean;
}

interface ActionSheetProps {
    visible: boolean;
    onClose: () => void;
    title?: string;
    options: ActionSheetOption[];
}

export const ActionSheet = ({ visible, onClose, title, options }: ActionSheetProps) => {
    const { colors, isDark } = useTheme();

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable
                style={[styles.overlay, { backgroundColor: isDark ? OVERLAYS.dark.scrim : OVERLAYS.light.scrim }]}
                onPress={onClose}
            >
                <View style={[styles.content, { backgroundColor: colors.paper }]}>
                    {title && (
                        <Typography
                            variant="label"
                            color="stone"
                            style={styles.title}
                        >
                            {title.toUpperCase()}
                        </Typography>
                    )}

                    {options.map((option, index) => {
                        const Icon = option.icon;
                        const isCancel = option.isCancel;
                        const isDestructive = option.isDestructive;

                        let textColor = 'ink';
                        if (isDestructive) textColor = 'danger';

                        // Cancel button styling (optional separation)
                        if (isCancel) {
                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[styles.cancelButton, { backgroundColor: colors.subtle }]}
                                    onPress={() => {
                                        onClose();
                                        requestAnimationFrame(() => option.onPress());
                                    }}
                                >
                                    <Typography variant="h3" color="ink" style={{ fontWeight: '600' }}>
                                        {option.label}
                                    </Typography>
                                </TouchableOpacity>
                            )
                        }

                        return (
                            <TouchableOpacity
                                key={index}
                                style={styles.optionRow}
                                onPress={() => {
                                    onClose();
                                    requestAnimationFrame(() => option.onPress());
                                }}
                            >
                                {Icon && (
                                    <View style={styles.iconContainer}>
                                        <Icon
                                            size={22}
                                            color={isDestructive ? colors.danger : colors.ink}
                                            weight="regular"
                                        />
                                    </View>
                                )}
                                <Typography
                                    variant="h3"
                                    color={textColor as any}
                                    style={{ fontWeight: '500' }}
                                >
                                    {option.label}
                                </Typography>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    content: {
        borderTopLeftRadius: RADIUS.m,
        borderTopRightRadius: RADIUS.m,
        paddingHorizontal: SPACING.l,
        paddingTop: SPACING.l,
        paddingBottom: Platform.OS === 'ios' ? SPACING.xxl : SPACING.l,
        ...Theme.shadows.medium,
    },
    title: {
        marginBottom: SPACING.l,
        textAlign: 'center',
        letterSpacing: 1,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.m,
    },
    iconContainer: {
        width: 32,
        marginRight: SPACING.m - 4,
        alignItems: 'flex-start',
    },
    cancelButton: {
        marginTop: SPACING.m,
        paddingVertical: SPACING.m,
        borderRadius: RADIUS.pill,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
