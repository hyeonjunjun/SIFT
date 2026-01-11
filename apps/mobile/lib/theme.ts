export const Theme = {
    colors: {
        background: '#F2F2F7', // Apple System Gray 6
        surface: '#FFFFFF',    // Pure white cards
        text: {
            primary: '#1C1C1E',  // Soft Black (Apple Label)
            secondary: '#3A3A3C', // Darker gray for better readability
            tertiary: '#8E8E93',
        },
        border: '#E5E5EA',     // Very subtle divider
        accent: '#007AFF',     // iOS Blue
        danger: '#FF3B30',
    },
    spacing: {
        xs: 4,
        s: 8,
        m: 16,
        l: 24,
        xl: 32,
    },
    borderRadius: {
        card: 16,
        pill: 9999, // Pill shape
        button: 12, // Standard button
    },
    typography: {
        header: {
            fontSize: 28,
            fontWeight: '700',
            letterSpacing: -0.5, // The "tight" editorial look
            color: '#1C1C1E',
        },
        subheader: {
            fontSize: 20,
            fontWeight: '600',
            letterSpacing: -0.3,
            color: '#1C1C1E',
        },
        body: {
            fontSize: 17,
            lineHeight: 22,
            color: '#3A3A3C',
        },
        caption: {
            fontSize: 13,
            color: '#8E8E93',
        }
    },
    shadows: {
        card: {
            shadowColor: "#000",
            shadowOffset: {
                width: 0,
                height: 4,
            },
            shadowOpacity: 0.08, // Very low opacity (no harsh black shadows)
            shadowRadius: 12,    // High radius for "glow" effect
            elevation: 5,        // Android fallback
        }
    }
} as const;

export type ThemeType = typeof Theme;
