import { Platform, StyleSheet } from "react-native";

// Cozy Design System (Digital Hygge)
export const LIGHT_COLORS = {
    ink: '#333330',       // Soft Charcoal (Primary Text)
    paper: '#FFFFFF',     // Pure White (Cards/Surfaces)
    canvas: '#FAFAF9',    // Warm Stone/Oatmeal (Backgrounds)
    stone: '#8E8E8A',     // Warm Grey (Secondary Text)
    separator: '#E5E5E0', // Organic Grey (Dividers)
    subtle: '#F2F2F0',    // Soft Highlight
    accent: '#6E7C94',    // Slate Blue
    danger: '#C47F65',    // Clay Red
    success: '#8DA399',   // Sage Green
};

export const DARK_COLORS = {
    ink: '#F2F2F0',       // Off-White (Primary Text)
    paper: '#1C1C1A',     // Deep Charcoal (Cards/Surfaces)
    canvas: '#121211',    // Midnight (Backgrounds)
    stone: '#8E8E8A',     // Warm Grey (Secondary Text)
    separator: '#2C2C2A', // Dark Dividers
    subtle: '#252523',    // Dark Highlight
    accent: '#8D9DB6',    // Lighter Slate Blue
    danger: '#D99A84',    // Lighter Clay Red
    success: '#A5B7AF',   // Lighter Sage Green
};

export const COLORS = LIGHT_COLORS; // Default export for backwards compatibility

export const SPACING = {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,  // Increased for breath
    xl: 32,
    xxl: 48,
};

export const RADIUS = {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,       // Pebble Card
    xl: 32,      // Bottom Sheet
    pill: 100,   // Buttons
    continuous: 0,
};

export const BORDER = {
    hairline: StyleSheet.hairlineWidth,
    thin: 1,
};

export const Theme = {
    shadows: {
        soft: {
            // Ambient Occlusion Shadow (Soft Cloud)
            shadowColor: "#5A5A50",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.05,
            shadowRadius: 20,
            elevation: 5,
        },
        sharp: {
            // For smaller elements
            shadowColor: "#5A5A50",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 2,
        }
    }
} as const;

