import React from 'react';
import { View, ViewProps } from 'react-native';
import { Theme } from '../../lib/theme';

export function Card({ className, style, children, ...props }: ViewProps) {
    return (
        <View
            className={`bg-canvas-card rounded-[16px] p-5 ${className || ''}`}
            style={[
                Theme.shadows.soft,
                style
            ]}
            {...props}
        >
            {children}
        </View>
    );
}
