import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Pressable, Platform } from 'react-native';
import { Typography } from '../design-system/Typography';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, RADIUS, Theme } from '../../lib/theme';

export interface ActionSheetOption {
    label: string;
    onPress: () => void;
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
    const { colors } = useTheme();

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable
                style={styles.overlay}
                onPress={onClose}
            >
                <View style={[styles.content, { backgroundColor: colors.paper }]}>
                    {title && (
                        <Typography
                            variant="label"
                            color="stone"
                            style={styles.title}
                        >
                            {title}
                        </Typography>
                    )}

                    {options.map((option, index) => {
                        const isLast = index === options.length - 1;
                        // Determine color based on type
                        let textColor = 'ink';
                        if (option.isDestructive) textColor = 'danger';
                        // if (option.isCancel) textColor = 'ink'; // Cancel usually implies default ink/primary

                        return (
                            <React.Fragment key={index}>
                                <TouchableOpacity
                                    style={[styles.button, option.isCancel && styles.cancelButton]}
                                    onPress={() => {
                                        // Close first, then execute
                                        onClose();
                                        // Small formatting delay if needed, or immediate
                                        requestAnimationFrame(() => option.onPress());
                                    }}
                                >
                                    <Typography
                                        variant="h3"
                                        color={textColor as any}
                                        style={option.isCancel ? { fontWeight: '600' } : {}}
                                    >
                                        {option.label}
                                    </Typography>
                                </TouchableOpacity>

                                {!isLast && !option.isCancel && (
                                    <View style={[styles.divider, { backgroundColor: colors.separator }]} />
                                )}
                            </React.Fragment>
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
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    content: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        ...Theme.shadows.medium,
    },
    title: {
        marginBottom: 16,
        textAlign: 'center',
        letterSpacing: 1,
    },
    button: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    cancelButton: {
        marginBottom: 0,
        marginTop: 8,
    },
    divider: {
        height: 1,
        width: '100%',
    },
});
