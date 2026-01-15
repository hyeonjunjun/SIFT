import Constants from 'expo-constants';

const getApiUrl = () => {
    // 1. Production / Explicit Override
    const productionUrl = process.env.EXPO_PUBLIC_API_URL;
    if (productionUrl) return productionUrl;

    // 2. Development Fallback (Expo Go)
    const debuggerHost = Constants.expoConfig?.hostUri;
    const localhost = debuggerHost?.split(':')[0] || 'localhost';

    // Default to localhost for simulator/local dev
    return `http://${localhost}:3000`;
};

export const API_URL = getApiUrl();
