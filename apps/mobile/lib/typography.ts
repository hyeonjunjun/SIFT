import { TextStyle, Platform } from 'react-native';
import { COLORS } from './theme';

export const TEXT: Record<string, TextStyle> = {
    // Editorial Headers (Serif)
    h1: {
        fontFamily: 'PlayfairDisplay_700Bold',
        fontSize: 34,
        fontWeight: '700',
        color: COLORS.ink,
        letterSpacing: Platform.OS === 'android' ? 0 : -0.5,
    },
    h2: {
        fontFamily: 'PlayfairDisplay_600SemiBold',
        fontSize: 28,
        fontWeight: '600',
        color: COLORS.ink,
        letterSpacing: Platform.OS === 'android' ? 0 : -0.3,
    },
    h3: {
        fontFamily: 'Satoshi-Bold',
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.ink,
    },

    // Technical Labels (Sans-Serif — Satoshi)
    label: {
        fontFamily: 'Satoshi-Medium',
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.stone,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },

    // Reading Text (Sans-Serif — Satoshi)
    body: {
        fontFamily: 'Satoshi-Regular',
        fontSize: 17,
        fontWeight: '400',
        color: COLORS.ink,
        lineHeight: 26,
        letterSpacing: 0.2,
    },
    bodyMedium: {
        fontFamily: 'Satoshi-Medium',
        fontSize: 15,
        fontWeight: '500',
        color: COLORS.ink,
        lineHeight: 22.5,
        letterSpacing: 0.15,
    },
    subhead: {
        fontFamily: 'Satoshi-Regular',
        fontSize: 15,
        fontWeight: '400',
        color: COLORS.stone,
        lineHeight: 22.5,
        letterSpacing: 0.15,
    },
    caption: {
        fontFamily: 'Satoshi-Medium',
        fontSize: 12,
        fontWeight: '500',
        color: COLORS.stone,
        lineHeight: 18,
        letterSpacing: 0.25,
    }
};
