import { Platform, StyleSheet } from "react-native";

// ──────────────────────────────────────────────────────
// Gentle SIFT Design System — OKLCH-Derived Tokens
// Source of truth: OKLCH values (web-native)
// Mobile: hex equivalents parsed from OKLCH
// ──────────────────────────────────────────────────────

export const LIGHT_COLORS = {
    ink: '#443732',       // oklch(0.35 0.02 45)  — Warm Espresso
    paper: '#FDFCF8',     // oklch(0.99 0.005 85) — Warm Near-White
    canvas: '#FBF8F1',    // oklch(0.98 0.01 85)  — Soft Oat
    stone: '#7C726D',     // oklch(0.56 0.015 45) — Warm Grey (WCAG 4.56:1 on paper)
    separator: '#E7E4DF', // oklch(0.92 0.008 85) — Warm Divider
    subtle: '#F4F1EC',    // oklch(0.96 0.008 85) — Soft Highlight
    accent: '#CF957B',    // oklch(0.72 0.08 45)  — Muted Clay
    danger: '#C46761',    // oklch(0.62 0.12 25)  — Warm Coral
    success: '#8AAF9A',   // oklch(0.72 0.05 160) — Gentle Sage
};

export const DARK_COLORS = {
    ink: '#F1EEE7',       // oklch(0.95 0.01 85)  — Warm Off-White
    paper: '#16100E',     // oklch(0.18 0.01 45)  — Warm Obsidian
    canvas: '#0B0605',    // oklch(0.13 0.01 45)  — Warm Near-Black
    stone: '#ADA29D',     // oklch(0.72 0.015 45) — Warm Light Grey
    separator: '#2D2725', // oklch(0.28 0.01 45)  — Warm Dark Divider
    subtle: '#1F1917',    // oklch(0.22 0.01 45)  — Warm Dark Highlight
    accent: '#DEAA93',    // oklch(0.78 0.07 45)  — Light Clay
    danger: '#DC8C85',    // oklch(0.72 0.10 25)  — Soft Coral
    success: '#A2C0AF',   // oklch(0.78 0.04 160) — Light Sage
};

export const HIGH_CONTRAST_LIGHT_COLORS = {
    ...LIGHT_COLORS,
    ink: '#000000',
    stone: '#4A4340',     // Much darker for max contrast
    accent: '#8B5E48',    // Deep clay
    separator: '#443732',
};

export const HIGH_CONTRAST_DARK_COLORS = {
    ...DARK_COLORS,
    ink: '#FFFFFF',
    stone: '#D4CFC9',     // Much lighter for max contrast
    accent: '#F0C4AB',    // Bright clay
    separator: '#F1EEE7',
};

export const COLORS = LIGHT_COLORS;

export const SPACING = {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
};

export const RADIUS = {
    xs: 4,
    s: 14,        // Organic: was 10
    m: 24,        // Organic: was 20
    l: 32,        // Pebble-like: was 24
    xl: 48,       // Bottom Sheet: was 44
    pill: 100,
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
};

// Timing-based motion tokens (replacing springs)
export const MOTION = {
    standard: { duration: 300, easing: 'ease-in-out' },
    gentle: { duration: 500, easing: 'ease-out' },
} as const;

export const Theme = {
    shadows: {
        soft: {
            shadowColor: "#443732",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.04,
            shadowRadius: 12,
            elevation: 3,
        },
        medium: {
            shadowColor: "#443732",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.06,
            shadowRadius: 24,
            elevation: 4,
        },
        sharp: {
            shadowColor: "#443732",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 2,
            elevation: 1,
        }
    }
} as const;

