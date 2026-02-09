import { Platform, StyleSheet } from "react-native";

// Cozy Design System (Digital Hygge)
export const LIGHT_COLORS = {
    ink: '#1A1A18',       // High-Contrast Deep Matte Ink
    paper: '#FFFFFF',     // Pure White
    canvas: '#FAF9F6',    // Refined Warm Oatmeal (Off-White)
    stone: '#8E8E8A',     // Warm Grey
    separator: '#E8E8E3', // Subtle Organic Divider
    subtle: '#F4F4F0',    // Soft Background Highlight
    accent: '#6E7C94',    // Muted Slate
    danger: '#B56E56',    // Clay Red
    success: '#7D9389',   // Sage Green
};

export const DARK_COLORS = {
    ink: '#FFFFFF',       // Pure White (Primary Text) - Increased from Bone White
    paper: '#141413',     // Slightly darker Obsidian
    canvas: '#000000',    // True Black (Backgrounds)
    stone: '#999995',     // Lighter Stone (Secondary Text) - Increased contrast
    separator: '#2A2A28', // Slightly more visible dividers
    subtle: '#1F1F1E',    // Dark Highlight
    accent: '#7E8DA4',    // Muted Slate Blue
    danger: '#CF6679',    // Brighter Red (Material Dark standard)
    success: '#81C784',   // Brighter Green
};

export const HIGH_CONTRAST_LIGHT_COLORS = {
    ...LIGHT_COLORS,
    ink: '#000000',       // Pure Black
    stone: '#555555',     // Darker Grey
    accent: '#2C3E50',    // Deep Navy
    separator: '#000000', // Black Dividers
};

export const HIGH_CONTRAST_DARK_COLORS = {
    ...DARK_COLORS,
    ink: '#FFFFFF',       // Pure White
    stone: '#DDDDDD',     // Much Lighter Grey
    accent: '#3498DB',    // Vibrant Blue
    separator: '#FFFFFF', // White Dividers
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
    s: 10,
    m: 20,
    l: 24,       // Softened from 32 to 24 for a more natural card feel
    xl: 44,      // Bottom Sheet Large
    pill: 100,   // Rounded Buttons
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
            // "Soft Lift" - Airy and floating
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 3,
        },
        medium: {
            // Elevated Card Shadow
            shadowColor: "#1A1A18",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.06,
            shadowRadius: 20,
            elevation: 4,
        },
        sharp: {
            // Crisp Definition
            shadowColor: "#1A1A18",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 2,
            elevation: 1,
        }
    }
} as const;

