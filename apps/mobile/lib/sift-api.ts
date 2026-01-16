import { API_URL } from "./config";

export interface SiftResponse<T = any> {
    status: "success" | "error";
    data?: T;
    message?: string;
    debug_info?: string;
}

export const safeSift = async <T = any>(originalUrl: string, userId?: string): Promise<T | null> => {
    try {
        const apiUrl = `${API_URL}/api/sift`;
        console.log(`[SafeSift] Requesting to sift: ${originalUrl} via ${apiUrl}`);

        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: originalUrl,
                platform: 'share_sheet',
                user_id: userId
            })
        });

        // Parse JSON regardless of status
        const json: SiftResponse<T> = await res.json().catch(() => ({
            status: "error",
            message: "Invalid JSON response from server",
            debug_info: "Response could not be parsed"
        }));

        if (!res.ok || json.status === "error") {
            const msg = json.message || "Unknown Server Error";
            const debug = json.debug_info || `Status: ${res.status}`;
            console.error(`[SafeSift] Failed: ${msg} (${debug})`);

            // Re-throw to start handling manually if needed, or return null to fail gracefully
            // Per requirements: "Alert the user gracefully, tell developer exactly why"
            // We'll throw an Error with the message so the UI can toast it.
            throw new Error(msg);
        }

        return json.data || (json as any);

    } catch (error: any) {
        console.error("[SafeSift] Exception:", error);
        throw error; // Let the UI layer show the Toast
    }
};
