import { Platform, StyleSheet } from "react-native";

// Apple Semantic Color System
export const COLORS = {
    ink: '#1C1C1E',      // System Black (Soft)
    paper: '#FFFFFF',     // Pure White
    canvas: '#FDFCF8',    // Oatmeal (SIFT Brand Background)
    stone: '#8E8E93',     // System Gray (Secondary Label)
    separator: '#C6C6C8', // System Separator
    subtle: '#E5E5EA',    // System Gray 5 (Borders)
    accent: '#007AFF',    // System Blue
    danger: '#FF3B30',    // System Red
};

export const SPACING = {
    xs: 4,
    s: 8,
    m: 16,
    l: 20,
    xl: 32,
    xxl: 48,
};

export const RADIUS = {
    xs: 2,
    s: 4,
    m: 8,
    l: 12,
    continuous: 0, // Placeholder for logic
};

export const BORDER = {
    hairline: StyleSheet.hairlineWidth,
    thin: 1,
};

export const Theme = {
    shadows: {
        soft: {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 2,
        },
    }
} as const;

