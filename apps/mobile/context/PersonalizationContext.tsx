import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../lib/auth';

export type PinIconType = 'star' | 'pin' | 'heart' | 'bookmark' | 'lightning';

interface PersonalizationContextType {
    pinIcon: PinIconType;
    setPinIcon: (icon: PinIconType) => Promise<void>;
}

const PersonalizationContext = createContext<PersonalizationContextType>({
    pinIcon: 'star',
    setPinIcon: async () => { },
});

export const usePersonalization = () => useContext(PersonalizationContext);

export const PersonalizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [pinIcon, setPinIconState] = useState<PinIconType>('star');
    const { profile, updateProfileInDB } = useAuth();

    // 1. Load initial from AsyncStorage
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const savedIcon = await AsyncStorage.getItem('settings_pin_icon');
                if (isValidIcon(savedIcon)) {
                    setPinIconState(savedIcon as PinIconType);
                }
            } catch (e) {
                console.error("Failed to load personalization settings", e);
            }
        };
        loadSettings();
    }, []);

    // 2. Sync from Auth Profile (Remote source of truth)
    useEffect(() => {
        if (profile?.pin_style && isValidIcon(profile.pin_style)) {
            setPinIconState(profile.pin_style as PinIconType);
        }
    }, [profile?.pin_style]);

    const isValidIcon = (icon: string | null | undefined): icon is PinIconType => {
        return ['star', 'pin', 'heart', 'bookmark', 'lightning'].includes(icon as string);
    };

    const setPinIcon = async (icon: PinIconType) => {
        setPinIconState(icon);
        try {
            // Save locally
            await AsyncStorage.setItem('settings_pin_icon', icon);

            // Save to DB if logged in
            if (updateProfileInDB) {
                await updateProfileInDB({ pin_style: icon });
            }
        } catch (e) {
            console.error("Failed to save personalization settings", e);
        }
    };

    return (
        <PersonalizationContext.Provider value={{ pinIcon, setPinIcon }}>
            {children}
        </PersonalizationContext.Provider>
    );
};
