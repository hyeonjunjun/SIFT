import { API_URL } from "./config";

export interface SiftResponse<T = any> {
    status: "success" | "error";
    data?: T;
    message?: string;
    debug_info?: string;
}

const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 1000; // 1s

export const safeSift = async <T = any>(
    originalUrl: string,
    userId?: string,
    pendingId?: string | undefined,
    userTier?: string,
    retryCount = 0
): Promise<T | null> => {
    try {
        const apiUrl = `${API_URL}/api/sift`;
        console.log(`[SafeSift] Attempt ${retryCount + 1}/${MAX_RETRIES} for: ${originalUrl} (Tier: ${userTier || 'free'})`);
        const body = {
            url: originalUrl,
            platform: 'share_sheet',
            user_id: userId,
            id: pendingId,
            user_tier: userTier
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 Minutes

        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        // Parse JSON safely
        let json: SiftResponse<T>;
        try {
            json = await res.json();
        } catch (e) {
            json = {
                status: "error",
                message: "Invalid JSON response from server",
                debug_info: `URL: ${apiUrl} | Status: ${res.status}`
            };
        }

        if (!res.ok || json.status === "error") {
            const msg = json.message || "Unknown Server Error";

            // Should we retry? 5xx or specific network-like errors
            if (retryCount < MAX_RETRIES - 1 && (res.status >= 500 || res.status === 429)) {
                const backoff = INITIAL_BACKOFF * Math.pow(2, retryCount);
                console.warn(`[SafeSift] Retrying in ${backoff}ms... (${msg})`);
                await new Promise(resolve => setTimeout(resolve, backoff));
                return safeSift(originalUrl, userId, pendingId, userTier, retryCount + 1);
            }

            throw new Error(msg);
        }

        return json.data || (json as any);

    } catch (error: any) {
        // Handle fetch/network exceptions
        if (retryCount < MAX_RETRIES - 1 && (error.message.includes('Network request failed') || error.message.toLowerCase().includes('timed out') || error.name === 'AbortError')) {
            const backoff = INITIAL_BACKOFF * Math.pow(2, retryCount);
            console.warn(`[SafeSift] Network error, retrying in ${backoff}ms...`, error.message);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return safeSift(originalUrl, userId, pendingId, userTier, retryCount + 1);
        }

        console.error("[SafeSift] Terminal Exception:", error);
        throw error;
    }
};
