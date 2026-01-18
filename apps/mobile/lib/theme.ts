import { Platform } from "react-native";

export const COLORS = {
    // The Foundation
    canvas: '#FDFCF8',      // Oatmeal (Main Background)
    paper: '#FFFFFF',       // White (Cards)
    surface: 'rgba(253, 252, 248, 0.85)', // Warm translucent glass
    vapor: '#F2F2F7',       // Light Gray (Inputs/Secondary backgrounds)

    // The Ink
    ink: '#1A1A1A',         // Soft Charcoal (Primary Text)
    stone: '#999999',       // Muted Gray (Secondary Text)
    subtle: '#E5E5E5',      // Light Gray (Strict borders)

    // The Accents
    sage: '#7A8B7D',        // Dried Sage (Primary Brand Color)
    terracotta: '#C67D63',  // Warning/Delete

    // Overlays
    overlay: 'rgba(0, 0, 0, 0.04)', // Grain texture tint
};

export const SPACING = {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
};

export const RADIUS = {
    xs: 2,
    s: 4,
    m: 8,   // Tight corners
    l: 0,   // Sharp corners (strictly reduced)
    pill: 0, // Even buttons are sharp now
    dock: 0,
};

export const Theme = {
    colors: {
        background: COLORS.canvas,
        surface: COLORS.surface,
        text: {
            primary: COLORS.ink,
            secondary: COLORS.stone,
            tertiary: '#A1A1A1',
            action: COLORS.ink,
        },
        border: COLORS.subtle,
        primary: COLORS.sage,
        accent: COLORS.ink,
        danger: COLORS.terracotta,
        overlay: 'rgba(0,0,0,0.4)',
    },
    spacing: SPACING,
    borderRadius: RADIUS,
    shadows: {
        soft: {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.04,
            shadowRadius: 12,
            elevation: 2,
        },
        medium: {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.08,
            shadowRadius: 24,
            elevation: 5,
        },
        dock: {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.08,
            shadowRadius: 30,
            elevation: 10,
        }
    }
} as const;

export type ThemeType = typeof Theme;

