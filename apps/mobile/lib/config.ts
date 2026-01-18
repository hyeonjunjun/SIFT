import Constants from 'expo-constants';

const getApiUrl = () => {
    // 1. Production / Vercel (Set this in your .env or EAS Secrets)
    const productionUrl = process.env.EXPO_PUBLIC_API_URL;
    if (productionUrl) return productionUrl;

    // 2. Development (Localhost)
    if (__DEV__) {
        const debuggerHost = Constants.expoConfig?.hostUri;
        const localhost = debuggerHost?.split(':')[0] || 'localhost';
        return `http://${localhost}:3000`;
    }

    // 3. Fallback (should not happen in prod)
    return 'https://sift-8azyad04z-ryan-juns-projects.vercel.app';
};

export const API_URL = getApiUrl();
console.log(`[Config] API URL: ${API_URL}`);
