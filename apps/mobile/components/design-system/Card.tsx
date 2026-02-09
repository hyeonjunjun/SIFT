import React from 'react';
import { View, ViewProps } from 'react-native';
import { Theme, RADIUS } from '../../lib/theme';
import { useTheme } from '../../context/ThemeContext';

export function Card({ className, style, children, ...props }: ViewProps) {
    const { colors, highContrast, isDark } = useTheme();

    return (
        <View
            style={[
                {
                    backgroundColor: colors.paper,
                    borderRadius: RADIUS.m,
                    borderWidth: highContrast ? 2 : (isDark ? 1 : 0),
                    borderColor: highContrast ? colors.separator : (isDark ? 'rgba(255,255,255,0.05)' : 'transparent'),
                },
                Theme.shadows.soft,
                style
            ]}
            {...props}
        >
            {children}
        </View>
    );
}
