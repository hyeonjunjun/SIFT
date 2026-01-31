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
    ink: '#F5F5F0',       // Bone White (Primary Text)
    paper: '#161615',     // Obsidian (Cards/Surfaces)
    canvas: '#0D0D0C',    // Near Black (Backgrounds)
    stone: '#70706C',     // Dimmed Stone (Secondary Text)
    separator: '#222220', // Stealth Dividers
    subtle: '#1C1C1A',    // Dark Highlight
    accent: '#7E8DA4',    // Muted Slate Blue
    danger: '#B56E56',    // Deep Clay Red
    success: '#7D9389',   // Deep Sage Green
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

export const TRANSITIONS = {
    short: 200,
    normal: 300,
    long: 500,
    // Forbid spring animations - use withTiming + Easing.inOut(Easing.ease)
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
        medium: {
            // Slightly more pronounced shadow for cards
            shadowColor: "#5A5A50",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.08,
            shadowRadius: 24,
            elevation: 8,
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

