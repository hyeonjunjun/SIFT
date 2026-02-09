import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LIGHT_COLORS, DARK_COLORS, HIGH_CONTRAST_LIGHT_COLORS, HIGH_CONTRAST_DARK_COLORS } from '../lib/theme';

type ThemeType = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: ThemeType;
    setTheme: (theme: ThemeType) => void;
    colors: typeof LIGHT_COLORS;
    isDark: boolean;
    highContrast: boolean;
    setHighContrast: (enabled: boolean) => Promise<void>;
    reduceMotion: boolean;
    setReduceMotion: (enabled: boolean) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [theme, setThemeState] = useState<ThemeType>('system');
    const [highContrast, setHighContrastState] = useState(false);
    const [reduceMotion, setReduceMotionState] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem('user_theme');
                const savedHC = await AsyncStorage.getItem('settings_high_contrast');
                const savedRM = await AsyncStorage.getItem('settings_reduce_motion');

                if (savedTheme) setThemeState(savedTheme as ThemeType);
                if (savedHC !== null) setHighContrastState(savedHC === 'true');
                if (savedRM !== null) setReduceMotionState(savedRM === 'true');
            } catch (e) {
                console.error('[ThemeContext] Failed to load settings:', e);
            }
        };
        loadSettings();
    }, []);

    const setTheme = async (newTheme: ThemeType) => {
        setThemeState(newTheme);
        await AsyncStorage.setItem('user_theme', newTheme);
    };

    const setHighContrast = async (enabled: boolean) => {
        setHighContrastState(enabled);
        await AsyncStorage.setItem('settings_high_contrast', String(enabled));
    };

    const setReduceMotion = async (enabled: boolean) => {
        setReduceMotionState(enabled);
        await AsyncStorage.setItem('settings_reduce_motion', String(enabled));
    };

    const currentTheme = theme === 'system' ? systemColorScheme || 'light' : theme;
    const isDark = currentTheme === 'dark';

    // Pick palette based on theme and contrast setting
    let colors = isDark ? DARK_COLORS : LIGHT_COLORS;
    if (highContrast) {
        colors = isDark ? HIGH_CONTRAST_DARK_COLORS : HIGH_CONTRAST_LIGHT_COLORS;
    }

    return (
        <ThemeContext.Provider value={{
            theme,
            setTheme,
            colors,
            isDark,
            highContrast,
            setHighContrast,
            reduceMotion,
            setReduceMotion
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
