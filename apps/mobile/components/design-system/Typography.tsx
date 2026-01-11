import React from 'react';
import { Text, TextProps } from 'react-native';
import { Theme } from '../../lib/theme';

interface TypographyProps extends TextProps {
    variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption';
    color?: string;
}

export function Typography({ variant = 'body', className, style, children, ...props }: TypographyProps) {
    const getVariantStyles = () => {
        switch (variant) {
            case 'h1':
                return 'text-[28px] font-bold tracking-[-0.5px] leading-tight text-ink';
            case 'h2':
                return 'text-[22px] font-semibold tracking-[-0.3px] leading-snug text-ink';
            case 'h3':
                return 'text-[20px] font-semibold tracking-[-0.3px] leading-snug text-ink';
            case 'body':
                return 'text-[17px] font-normal leading-[22px] text-ink';
            case 'caption':
                return 'text-[13px] font-normal text-ink-secondary';
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
