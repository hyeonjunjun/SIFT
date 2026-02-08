import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PinIconType = 'star' | 'pin' | 'heart';

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

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const savedIcon = await AsyncStorage.getItem('settings_pin_icon');
                if (savedIcon === 'star' || savedIcon === 'pin' || savedIcon === 'heart') {
                    setPinIconState(savedIcon);
                }
            } catch (e) {
                console.error("Failed to load personalization settings", e);
            }
        };
        loadSettings();
    }, []);

    const setPinIcon = async (icon: PinIconType) => {
        setPinIconState(icon);
        try {
            await AsyncStorage.setItem('settings_pin_icon', icon);
        } catch (e) {
            console.error("Failed to save pin icon preference", e);
        }
    };

    return (
        <PersonalizationContext.Provider value={{ pinIcon, setPinIcon }}>
            {children}
        </PersonalizationContext.Provider>
    );
};
