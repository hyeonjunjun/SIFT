import { Platform } from "react-native";

export const Theme = {
    colors: {
        background: '#FDFCF8', // Oatmeal / Natural Off-White
        surface: 'rgba(253, 252, 248, 0.85)', // Warm translucent glass
        text: {
            primary: '#1C1C1E',    // Soft Black
            secondary: '#666666',  // Medium Gray
            tertiary: '#A1A1A1',   // Muted Warm Gray (was #8E8E93)
            action: '#2A2A2A',     // Charcoal (Active State)
        },
        border: 'rgba(0,0,0,0.06)',  // Refined subtle border
        primary: '#7A8B7D',          // Dried Sage (Brand Accent)
        accent: '#2A2A2A',           // Charcoal
        danger: '#FF3B30',
        overlay: 'rgba(0,0,0,0.4)',
    },
    spacing: {
        xs: 4,
        s: 8,
        m: 16,
        l: 20,
        xl: 32,
        xxl: 40,
    },
    borderRadius: {
        card: 24,
        inner: 16,
        medium: 12,
        small: 8,
        pill: 9999,
        dock: 30, // For the Navigation Pill
    },
    typography: {
        header: {
            pageTitle: {
                fontSize: 28,
                fontWeight: '700',
                letterSpacing: -0.5,
                color: '#1C1C1E',
                fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
            },
            cardTitle: {
                fontSize: 18,
                fontWeight: '700',
                letterSpacing: -0.3,
                color: '#1C1C1E',
                fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
            },
        },
        body: {
            fontSize: 15,
            fontWeight: '500',
            lineHeight: 22,
            color: '#666666',
        },
        action: {
            fontSize: 12,
            fontWeight: '600',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: '#2A2A2A',
        },
        caption: {
            fontSize: 13,
            color: '#A1A1A1',
        }
    },
    shadows: {
        card: {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 2,
            borderWidth: 1,
            borderColor: "rgba(0,0,0,0.05)",
        },
        dock: {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.08,
            shadowRadius: 30,
            elevation: 10,
        },
        floating: {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.12,
            shadowRadius: 16,
            elevation: 10,
        }
    }
} as const;

export type ThemeType = typeof Theme;
