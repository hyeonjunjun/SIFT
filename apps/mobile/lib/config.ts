import Constants from 'expo-constants';

const getApiUrl = () => {
    // 1. Development (Localhost)
    if (__DEV__) {
        const debuggerHost = Constants.expoConfig?.hostUri;
        const localhost = debuggerHost?.split(':')[0] || 'localhost';
        return `http://${localhost}:3000`;
    }

    // 2. Production (FORCE CORRECT URL)
    // We ignore process.env.EXPO_PUBLIC_API_URL because it might be poisoned by old EAS Secrets
    return 'https://sift-rho.vercel.app';
};

export const API_URL = getApiUrl();
