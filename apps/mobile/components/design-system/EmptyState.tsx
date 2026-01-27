import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Typography } from './Typography';
import { COLORS, SPACING, RADIUS } from '../../lib/theme';
import { MagnifyingGlass, PlusCircle, SelectionBackground } from 'phosphor-react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { Button } from './Button';

interface EmptyStateProps {
    title: string;
    description: string;
    type: 'no-sifts' | 'no-results';
    onAction?: () => void;
    actionLabel?: string;
}

export const EmptyState = ({ title, description, type, onAction, actionLabel }: EmptyStateProps) => {
    const Icon = type === 'no-sifts' ? SelectionBackground : MagnifyingGlass;

    return (
        <View style={styles.container}>
            <Animated.View
                entering={FadeInUp.duration(600).delay(200)}
                style={styles.illustrationContainer}
            >
                <View style={styles.iconCircle}>
                    <Icon size={48} color={COLORS.stone} weight="thin" />
                </View>
                {/* Subtle back decoration */}
                <View style={[styles.decoration, { top: -10, right: -10, opacity: 0.1 }]} />
                <View style={[styles.decoration, { bottom: -15, left: -20, width: 40, height: 40, opacity: 0.05 }]} />
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(600).delay(400)} style={styles.textContainer}>
                <Typography variant="h2" style={styles.title}>{title}</Typography>
                <Typography style={styles.description}>{description}</Typography>
            </Animated.View>

            {onAction && actionLabel && (
                <Animated.View entering={FadeInDown.duration(600).delay(600)}>
                    <Button
                        label={actionLabel}
                        onPress={onAction}
                        variant="primary"
                        icon={type === 'no-sifts' ? <PlusCircle size={20} color="white" /> : undefined}
                    />
                </Animated.View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
        marginTop: 60,
    },
    illustrationContainer: {
        marginBottom: 32,
        position: 'relative',
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: COLORS.subtle,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
    },
    decoration: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.accent,
    },
    textContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        textAlign: 'center',
        marginBottom: 12,
    },
    description: {
        textAlign: 'center',
        color: COLORS.stone,
        paddingHorizontal: 20,
        lineHeight: 20,
    }
});
