import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Typography } from '../design-system/Typography';
import { Button } from '../design-system/Button';
import { COLORS, SPACING, RADIUS, Theme } from '../../lib/theme';
import { Crown, X, Star } from 'phosphor-react-native';
import { useSubscription } from '../../hooks/useSubscription';

interface LimitReachedModalProps {
    visible: boolean;
    onClose: () => void;
    upgradeUrl?: string;
}

export const LimitReachedModal = ({ visible, onClose, upgradeUrl }: LimitReachedModalProps) => {
    const { tier, maxSiftsTotal, description } = useSubscription();

    const handleUpgrade = async () => {
        const url = upgradeUrl || 'https://sift.so/upgrade';
        try {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
            } else {
                console.warn(`Cannot open upgrade URL: ${url}`);
            }
        } catch (error) {
            console.error('Error opening upgrade URL:', error);
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
                        {tier === 'free' ? (
                            <Star size={32} color={COLORS.stone} weight="duotone" />
                        ) : (
                            <Crown size={32} color={COLORS.ink} weight="duotone" />
                        )}
                    </View>
                    <Typography variant="h3" style={styles.title}>
                        Sift Limit Reached
                    </Typography>

                    <Typography variant="body" color="secondary" style={styles.description}>
                        You've used all {maxSiftsTotal} sifts included in your {description} plan. Upgrade for more storage and advanced AI.
                    </Typography>

                    <Button
                        label="Upgrade to Pro"
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
