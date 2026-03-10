import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
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
    const router = useRouter();
    const { tier, maxSiftsTotal, description } = useSubscription();

    const handleUpgrade = async () => {
        onClose();
        router.push('/settings/subscription');
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
                        You're on a roll!
                    </Typography>

                    <Typography variant="body" color="secondary" style={styles.description}>
                        You've created {maxSiftsTotal} sifts on your {description} plan. {tier === 'free' ? 'Upgrade to Pro to unlock 40 more sifts plus smart data extraction.' : 'Upgrade to Unlimited to continue sifting without limits.'}
                    </Typography>

                    <Button
                        label={tier === 'free' ? "Upgrade to Pro" : "Upgrade to Unlimited"}
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
