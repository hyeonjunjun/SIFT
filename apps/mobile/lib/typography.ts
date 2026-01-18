import { TextStyle } from 'react-native';
import { COLORS } from './theme';

export const TEXT: Record<string, TextStyle> = {
    // Editorial Headers (Serif)
    h1: {
        fontFamily: 'PlayfairDisplay_700Bold',
        fontSize: 34,
        color: COLORS.ink,
        fontWeight: '700',
    },
    h2: {
        fontFamily: 'System',
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.ink,
    },
    h3: {
        fontFamily: 'System',
        fontSize: 17,
        fontWeight: '600', // iOS Headline
        color: COLORS.ink,
    },

    // Technical Labels (Sans-Serif)
    label: {
        fontFamily: 'System',
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.stone,
        letterSpacing: 0.5,
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
