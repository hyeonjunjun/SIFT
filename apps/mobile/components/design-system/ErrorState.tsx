import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { WarningCircle, ArrowsClockwise } from 'phosphor-react-native';
import { Typography } from './Typography';
import { COLORS, RADIUS, SPACING } from '../../lib/theme';
import { useTheme } from '../../context/ThemeContext';

interface ErrorStateProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
    retryLabel?: string;
}

export function ErrorState({
    title = "Something went wrong",
    message = "We couldn't load this content. Please check your connection and try again.",
    onRetry,
    retryLabel = "Tap to Retry"
}: ErrorStateProps) {
    const { colors } = useTheme();

    return (
        <View style={styles.container}>
            <View style={[styles.iconContainer, { backgroundColor: colors.subtle }]}>
                <WarningCircle size={40} color={COLORS.danger} weight="thin" />
            </View>
            <Typography variant="h2" style={styles.title}>{title}</Typography>
            <Typography variant="body" color="stone" style={styles.message}>{message}</Typography>
            
            {onRetry && (
                <TouchableOpacity 
                    style={[styles.retryButton, { backgroundColor: colors.ink }]} 
                    onPress={onRetry}
                    activeOpacity={0.7}
                >
                    <ArrowsClockwise size={18} color={colors.paper} style={{ marginRight: 8 }} />
                    <Typography variant="label" style={{ color: colors.paper }}>{retryLabel}</Typography>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
        marginVertical: SPACING.l,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.l,
    },
    title: {
        marginBottom: SPACING.s,
        textAlign: 'center',
    },
    message: {
        textAlign: 'center',
        marginBottom: SPACING.l,
        maxWidth: '80%',
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: RADIUS.pill,
    }
});
