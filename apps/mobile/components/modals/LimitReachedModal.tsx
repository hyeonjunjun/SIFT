import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Typography } from '../design-system/Typography';
import { Button } from '../design-system/Button';
import { COLORS, SPACING, RADIUS, Theme } from '../../lib/theme';
import { Crown, X } from 'phosphor-react-native';

interface LimitReachedModalProps {
    visible: boolean;
    onClose: () => void;
    upgradeUrl?: string;
}

export const LimitReachedModal = ({ visible, onClose, upgradeUrl }: LimitReachedModalProps) => {
    const handleUpgrade = () => {
        if (upgradeUrl) {
            Linking.openURL(upgradeUrl);
        } else {
            // Fallback or default upgrade URL
            Linking.openURL('https://sift.so/upgrade');
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.content}>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <X size={20} color={COLORS.stone} />
                    </TouchableOpacity>

                    <View style={styles.iconContainer}>
                        <Crown size={32} color={COLORS.ink} weight="duotone" />
                    </View>
                    <Typography variant="h3" style={styles.title}>
                        Sift Limit Reached
                    </Typography>

                    <Typography variant="body" color="secondary" style={styles.description}>
                        You've used all 10 free sifts for this month. Upgrade to SIFT Plus for unlimited sifting and advanced AI summaries.
                    </Typography>

                    <Button
                        label="Upgrade to Plus"
                        onPress={handleUpgrade}
                        variant="primary"
                        style={styles.upgradeButton}
                    />

                    <TouchableOpacity onPress={onClose} style={styles.maybeLater}>
                        <Typography variant="caption" color="tertiary">
                            Maybe Later
                        </Typography>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    content: {
        backgroundColor: COLORS.paper,
        borderRadius: RADIUS.xl,
        padding: SPACING.xl,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        ...Theme.shadows.medium,
    },
    closeButton: {
        position: 'absolute',
        top: SPACING.m,
        right: SPACING.m,
        padding: SPACING.s,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: RADIUS.l,
        backgroundColor: COLORS.subtle,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.l,
    },
    title: {
        textAlign: 'center',
        marginBottom: SPACING.s,
    },
    description: {
        textAlign: 'center',
        marginBottom: SPACING.xl,
    },
    upgradeButton: {
        width: '100%',
        marginBottom: SPACING.m,
    },
    maybeLater: {
        padding: SPACING.s,
    },
});
