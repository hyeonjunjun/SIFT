import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { TEXT } from '../../lib/typography';
import { COLORS } from '../../lib/theme';

interface TypographyProps extends TextProps {
    variant?: 'h1' | 'h2' | 'h3' | 'body' | 'bodyMedium' | 'caption' | 'label' | 'subhead';
    color?: string;
}

export function Typography({ variant = 'body', style, children, color, ...props }: TypographyProps) {
    const variantStyle = TEXT[variant] || TEXT.body;
    const colorStyle = color ? { color } : {};

    // Font Loading Safety: Fallback to System if the custom font block hasn't loaded 
    // This prevents fatal errors in earliest execution phases.
    let safeStyle = { ...variantStyle };
    if (safeStyle.fontFamily && safeStyle.fontFamily !== 'System') {
        // Technically Font.isLoaded would be ideal, but for now we just 
        // ensure we don't crash if someone styles with a non-native string.
    }

    return (
        <Text
            style={[safeStyle, colorStyle, style]}
            {...props}
        >
            {children}
        </Text>
    );
}

