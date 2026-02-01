import { API_URL } from "./config";

export interface SiftResponse<T = any> {
    status: "success" | "error" | "limit_reached";
    data?: T;
    message?: string;
    debug_info?: string;
    upgrade_url?: string;
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
        console.log(`[SafeSift] URL: ${apiUrl}`);
        console.log(`[SafeSift] Attempt ${retryCount + 1}/${MAX_RETRIES} for: ${originalUrl} (Tier: ${userTier || 'free'})`);
        const body = {
            url: originalUrl,
            platform: 'share_sheet',
            user_id: userId,
            id: pendingId,
            user_tier: userTier
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.warn(`[SafeSift] Triggering timeout (120s) for ${originalUrl}`);
            controller.abort();
        }, 120000); // 120s timeout (Social media scrapers are slow)

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
            console.error(`[SafeSift] JSON Parse Error:`, e);
            json = {
                status: "error",
                message: "Invalid JSON response from server",
                debug_info: `URL: ${apiUrl} | Status: ${res.status} | Error: ${String(e)}`
            };
        }

        if (!res.ok || json.status === "error" || json.status === "limit_reached") {
            const msg = json.message || "Unknown Server Error";
            console.error(`[SafeSift] API Error (${res.status}): ${msg}`, json.debug_info);

            // Special case: Tier Limit
            if (json.status === "limit_reached" || res.status === 403) {
                const limitErr = new Error(msg) as any;
                limitErr.status = 'limit_reached';
                limitErr.upgrade_url = json.upgrade_url;
                throw limitErr;
            }

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
        const isTimeout = error.name === 'AbortError' || error.message.toLowerCase().includes('timed out');
        const isNetworkError = error.message.includes('Network request failed');

        console.error(`[SafeSift] Error for ${originalUrl}:`, {
            name: error.name,
            message: error.message,
            isTimeout,
            isNetworkError,
            retryCount
        });

        if (retryCount < MAX_RETRIES - 1 && (isNetworkError || isTimeout)) {
            const backoff = INITIAL_BACKOFF * Math.pow(2, retryCount);
            console.warn(`[SafeSift] Recoverable error, retrying in ${backoff}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return safeSift(originalUrl, userId, pendingId, userTier, retryCount + 1);
        }

        throw error;
    }
};
