import Constants from 'expo-constants';

const getApiUrl = () => {
    // 1. Development (Localhost)
    if (__DEV__) {
        const debuggerHost = Constants.expoConfig?.hostUri;
        const localhost = debuggerHost?.split(':')[0] || 'localhost';
        const url = `http://${localhost}:3000`;
        console.log(`[Config] API_URL (DEV): ${url} (hostUri: ${debuggerHost})`);
        return url;
    }

    const url = process.env.EXPO_PUBLIC_API_URL || 'https://sift-rho.vercel.app';
    console.log(`[Config] API_URL (PROD): ${url}`);
    return url;
};

export const API_URL = getApiUrl();
