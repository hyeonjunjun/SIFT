import AsyncStorage from '@react-native-async-storage/async-storage';

async function clearQueryCache() {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const queryKeys = keys.filter(key => key.startsWith('REACT_QUERY'));
        if (queryKeys.length > 0) {
            await AsyncStorage.multiRemove(queryKeys);
            console.log(`✅ Cleared ${queryKeys.length} corrupted query cache entries`);
        }
    } catch (e) {
        console.error('Failed to clear cache:', e);
    }
}

clearQueryCache();
