import { TextStyle } from 'react-native';
import { COLORS } from './theme';

export const TEXT: Record<string, TextStyle> = {
    // Editorial Headers (Serif)
    h1: {
        fontFamily: 'PlayfairDisplay_700Bold',
        fontSize: 32,
        color: COLORS.ink,
        lineHeight: 40,
    },
    h2: {
        fontFamily: 'PlayfairDisplay_600SemiBold',
        fontSize: 24,
        color: COLORS.ink,
        lineHeight: 30,
    },
    h3: {
        fontFamily: 'InstrumentSerif_400Regular',
        fontSize: 20,
        color: COLORS.ink,
    },

    // Technical Labels (Sans-Serif)
    label: {
        fontFamily: 'Inter_700Bold',
        fontSize: 11,
        color: COLORS.stone,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },

    // Reading Text (Sans-Serif)
    body: {
        fontFamily: 'Inter_400Regular',
        fontSize: 15,
        color: COLORS.ink,
        lineHeight: 22,
    },
    bodyMedium: {
        fontFamily: 'Inter_500Medium',
        fontSize: 15,
        color: COLORS.ink,
        lineHeight: 22,
    },
    caption: {
        fontFamily: 'Inter_400Regular',
        fontSize: 13,
        color: COLORS.stone,
    }
};
