import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { TEXT } from '../../lib/typography';
import { COLORS } from '../../lib/theme';
import { cssInterop } from 'nativewind';

interface TypographyProps extends TextProps {
    variant?: 'h1' | 'h2' | 'h3' | 'body' | 'bodyMedium' | 'caption' | 'label' | 'subhead';
    color?: string;
}

export function Typography({ variant = 'body', style, children, color, ...props }: TypographyProps) {
    const variantStyle = TEXT[variant] || TEXT.body;
    const colorStyle = color ? { color } : {};

    return (
        <Text
            style={[variantStyle, colorStyle, style]}
            {...props}
        >
            {children}
        </Text>
    );
}

// Enable support for className via NativeWind
cssInterop(Typography, {
    className: {
        target: 'style',
    },
});

