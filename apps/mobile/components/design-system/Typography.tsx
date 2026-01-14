import React from 'react';
import { Text, TextProps } from 'react-native';
import { Theme } from '../../lib/theme';

interface TypographyProps extends TextProps {
    variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'action';
    color?: string;
}

export function Typography({ variant = 'body', className, style, children, ...props }: TypographyProps) {
    const getVariantStyles = () => {
        switch (variant) {
            case 'h1': // Page Title
                return 'text-[28px] font-serif font-bold tracking-[-0.5px] text-ink';
            case 'h2': // Card Title
                return 'text-[18px] font-serif font-bold tracking-[-0.3px] text-ink'; // 18px, 700 weight
            case 'h3': // Keeping for legacy or smaller headers
                return 'text-[16px] font-semibold text-ink';
            case 'body': // Body Text
                return 'text-[15px] font-medium leading-[22px] text-ink-secondary'; // 500 weight, 15px, #666666 (ink-secondary)
            case 'caption':
                return 'text-[13px] font-normal text-ink-tertiary';
            case 'action': // New Action Text
                return 'text-[12px] font-semibold tracking-[1.5px] uppercase text-ink';
        }
    };

    return (
        <Text
            className={`${getVariantStyles()} ${className || ''}`}
            style={style}
            {...props}
        >
            {children}
        </Text>
    );
}
