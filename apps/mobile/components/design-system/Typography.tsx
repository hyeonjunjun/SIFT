import * as React from 'react';
import { Text, TextProps, StyleSheet, TextStyle } from 'react-native';
import { TEXT } from '../../lib/typography';
import { COLORS } from '../../lib/theme';
import { cssInterop } from 'nativewind';

interface TypographyProps extends TextProps {
    variant?: 'h1' | 'h2' | 'h3' | 'body' | 'bodyMedium' | 'caption' | 'label' | 'subhead';
    color?: string;
    weight?: TextStyle['fontWeight'];
}

export function Typography({ variant = 'body', style, children, color, weight, ...props }: TypographyProps) {
    const variantStyle = TEXT[variant] || TEXT.body;
    const colorStyle = color ? { color } : {};
    const weightStyle = weight ? { fontWeight: weight } : {};

    return (
        <Text
            style={[variantStyle, colorStyle, weightStyle, style]}
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

