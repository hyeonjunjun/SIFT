import Constants from 'expo-constants';

const getApiUrl = () => {
    // 1. Development (Switch to true for local testing, false for prod testing)
    const USE_LOCAL = false;

    if (__DEV__ && USE_LOCAL) {
        const debuggerHost = Constants.expoConfig?.hostUri;
        const localhost = debuggerHost?.split(':')[0] || 'localhost';
        const url = `http://${localhost}:3000`;
        console.log(`[Config] API_URL (DEV/LOCAL): ${url}`);
        return url;
    }

    let url = process.env.EXPO_PUBLIC_API_URL || 'https://sift-rho.vercel.app';

    // 2. Production Safety: If the URL is a known stale preview URL, force fallback
    if (!__DEV__ && url.includes('sift-8azyad')) {
        console.log(`[Config] Blocking stale preview URL: ${url}. Falling back to production.`);
        url = 'https://sift-rho.vercel.app';
    }

    console.log(`[Config] API_URL (PROD): ${url}`);
    return url;
};

export const API_URL = getApiUrl();
