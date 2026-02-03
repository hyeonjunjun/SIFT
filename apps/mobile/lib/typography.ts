import { TextStyle } from 'react-native';
import { COLORS } from './theme';

export const TEXT: Record<string, TextStyle> = {
    // Editorial Headers (Serif)
    h1: {
        fontFamily: 'PlayfairDisplay_700Bold',
        fontSize: 34,
        fontWeight: '700',
        color: COLORS.ink,
        letterSpacing: -0.5,
    },
    h2: {
        fontFamily: 'PlayfairDisplay_600SemiBold', // Use SemiBold Serif if available, otherwise 700
        fontSize: 28,
        fontWeight: '600',
        color: COLORS.ink,
        letterSpacing: -0.3,
    },
    h3: {
        fontFamily: 'System',
        fontSize: 20,
        fontWeight: '600', // Apple Style Title 3
        color: COLORS.ink,
    },

    // Technical Labels (Sans-Serif)
    label: {
        fontFamily: 'System',
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.stone,
        letterSpacing: 0.8,
        textTransform: 'uppercase', // Force branding feel
    },

    // Reading Text (Sans-Serif)
    body: {
        fontFamily: 'System',
        fontSize: 17,
        fontWeight: '400',
        color: COLORS.ink,
    },
    bodyMedium: {
        fontFamily: 'System',
        fontSize: 15,
        fontWeight: '500',
        color: COLORS.ink,
    },
    subhead: {
        fontFamily: 'System',
        fontSize: 15,
        fontWeight: '400',
        color: COLORS.stone, // Secondary Text
    },
    caption: {
        fontFamily: 'System',
        fontSize: 12,
        fontWeight: '500',
        color: COLORS.stone,
    }
};
