import { API_URL } from "./config";

export interface SiftResponse<T = any> {
    status: "success" | "error" | "limit_reached";
    data?: T;
    message?: string;
    debug_info?: string;
    upgrade_url?: string;
}

const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 2000;

export const safeSift = async <T = any>(
    originalUrl: string,
    userId?: string,
    pendingId?: string | undefined,
    userTier?: string,
    retryCount = 0
): Promise<T | null> => {
    const startTime = Date.now();
    try {
        const apiUrl = `${API_URL}/api/sift`;
        console.log(`[SafeSift] Attempt ${retryCount + 1}/${MAX_RETRIES} for: ${originalUrl}`);

        const body = {
            url: originalUrl,
            platform: 'share_sheet',
            user_id: userId,
            id: pendingId,
            user_tier: userTier
        };

        const controller = new AbortController();
        const TIMEOUT_MS = 45000; // 45s timeout
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[SafeSift] Request resolved in ${duration}s with status ${res.status}`);

        let json: SiftResponse<T>;
        try {
            json = await res.json();
        } catch (e) {
            json = { status: "error", message: "Invalid JSON from server" };
        }

        if (!res.ok || json.status === "error") {
            if (json.status === "limit_reached" || res.status === 403) {
                const err = new Error(json.message || "Limit Reached") as any;
                err.status = 'limit_reached';
                throw err;
            }

            if (retryCount < MAX_RETRIES - 1 && res.status >= 500) {
                await new Promise(r => setTimeout(r, INITIAL_BACKOFF * (retryCount + 1)));
                return safeSift(originalUrl, userId, pendingId, userTier, retryCount + 1);
            }
            throw new Error(json.message || "Server Error");
        }

        return json.data || (json as any);

    } catch (error: any) {
        const isTimeout = error.name === 'AbortError' || error.message.includes('timed out');
        if (retryCount < MAX_RETRIES - 1 && isTimeout) {
            console.warn(`[SafeSift] Timeout, retrying...`);
            await new Promise(r => setTimeout(r, INITIAL_BACKOFF));
            return safeSift(originalUrl, userId, pendingId, userTier, retryCount + 1);
        }
        throw error;
    }
};
