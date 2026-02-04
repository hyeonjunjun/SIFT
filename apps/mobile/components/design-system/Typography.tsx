import * as React from 'react';
import { Text, TextProps, StyleSheet, TextStyle, Platform } from 'react-native';
import { TEXT } from '../../lib/typography';
import { COLORS } from '../../lib/theme';
import { useTheme } from '../../context/ThemeContext';
import { cssInterop } from 'nativewind';

interface TypographyProps extends TextProps {
    variant?: 'h1' | 'h2' | 'h3' | 'body' | 'bodyMedium' | 'caption' | 'label' | 'subhead';
    color?: string;
    weight?: TextStyle['fontWeight'];
}

export function Typography({ variant = 'body', style, children, color, weight, ...props }: TypographyProps) {
    const { colors } = useTheme();
    const variantStyle = TEXT[variant] || TEXT.body;

    // Map theme keys if provided, otherwise use raw color or default ink
    const resolvedColor = (color && (colors as any)[color]) ? (colors as any)[color] : (color || colors.ink);
    const colorStyle = { color: resolvedColor };
    const weightStyle = weight ? { fontWeight: weight } : {};
    const androidStyle = Platform.OS === 'android' ? { includeFontPadding: false } : {};

    return (
        <Text
            style={[variantStyle, colorStyle, weightStyle, androidStyle, style]}
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

