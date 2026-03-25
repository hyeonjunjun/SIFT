import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from '@/lib/supabase';
import { sendPushNotification } from '@/lib/notifications';

// Force Redeploy: 2026-03-24 (Gemini Flash Migration)
export const maxDuration = 300;

// Initialize clients safely
const apifyClient = new ApifyClient({
    token: process.env.APIFY_API_TOKEN || process.env.apify,
});

const geminiKey = process.env.GEMINI_API_KEY || process.env.gemini;
const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;

// Master list of allowed tags — used by prompt and validation
const ALLOWED_TAGS = [
    "Cooking", "Baking", "Tech", "Health", "Lifestyle", "Professional",
    "Finance", "Design", "Travel", "Entertainment", "Science", "Shopping",
    "Fitness", "Beauty", "Education", "News", "DIY", "Parenting",
    "Music", "Photography", "Gaming", "Productivity", "Fashion", "Food"
] as const;

const SYSTEM_PROMPT = `You are a content curator that extracts high-fidelity structured data from web content, images, videos, and social media posts. Preserve every specific detail, measurement, and data point — never dilute or omit.

Return valid JSON with this schema:
{
  "title": "Catchy, accurate title (max 80 chars)",
  "category": "Best-fit category from the tags list",
  "tags": ["Tag1", "Tag2"],
  "summary": "Markdown summary (150-300 words)",
  "reading_time_minutes": 3,
  "smart_data": {
    "ingredients": ["1 cup flour", "2 eggs"],
    "preparation_time": "15 mins",
    "cook_time": "30 mins",
    "total_time": "45 mins",
    "servings": 4,
    "cuisine": "Italian",
    "nutrition_per_serving": { "calories": 350, "protein_g": 12, "carbs_g": 45, "fat_g": 14, "fiber_g": 3, "sugar_g": 8 },
    "extracted_text": "raw text if relevant",
    "video_insights": "key takeaways for video content",
    "key_links": ["important URLs from content"],
    "difficulty": "easy | medium | advanced",
    "dietary_tags": ["High Protein", "Low Carb"]
  }
}

RULES:
- Tags: Pick 2-3 ONLY from: ${JSON.stringify(ALLOWED_TAGS)}. Default to "Lifestyle" if none fit. Prefer specific tags (e.g. "Cooking" over "Food").
- smart_data: Only include relevant fields. Omit empty/irrelevant ones. "servings" must be an integer.
- ingredients: Array of strings with quantities (e.g. "2 cups all-purpose flour").
- nutrition_per_serving: For recipes, always estimate this even if the source omits it.
- dietary_tags (recipes only): Include all applicable from: "High Protein", "Low Carb", "Low Calorie", "High Fiber", "Keto", "Vegan", "Vegetarian", "Gluten Free", "Dairy Free", "Nut Free", "Meal Prep", "Quick Meal", "One Pot", "Budget Friendly".
- reading_time_minutes: Integer estimate for original content (min 1).

SUMMARY FORMAT — General content:
1. Bulleted key points (markdown \`-\`)
2. Followed by a short conversational paragraph with additional context
Use markdown headers (###), bold for key terms. Be specific — capture exact arguments, data, techniques. No filler.

SUMMARY FORMAT — Recipes/Cooking (overrides above):
## Overview
[1-2 paragraphs: description, taste, origin]
## Preparation
1. **[Action]**: [Concise instruction]
2. **[Action]**: [Next step...]
## Notes & Equipment (optional)
- [Tips, pan sizes, storage, substitutions]
Do NOT put ingredients in the recipe summary — they go in smart_data.ingredients only.

DOMAIN RULES:
- Technical content: Explain concepts naturally, no raw code blocks.
- Videos/TikToks with no transcript: Infer takeaways from title, caption, and visuals.
- Short content (tweets, captions): 80-150 word summary. Dense content: up to 400 words.`;

// Validate AI-returned tags against the allowed list
function validateTags(tags: string[]): string[] {
    const allowedSet = new Set(ALLOWED_TAGS.map(t => t.toLowerCase()));
    const validated = tags
        .filter(t => typeof t === 'string')
        .filter(t => allowedSet.has(t.toLowerCase()))
        .map(t => {
            // Normalize casing to match our canonical list
            const match = ALLOWED_TAGS.find(a => a.toLowerCase() === t.toLowerCase());
            return match || t;
        });
    return validated.length > 0 ? validated.slice(0, 3) : ["Lifestyle"];
}

// Estimate reading time from word count
function estimateReadingTime(text: string): number {
    const words = text.trim().split(/\s+/).length;
    return Math.max(1, Math.round(words / 238)); // avg reading speed ~238 wpm
}

function extractMetaTags(html: string) {
    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    const titleMatch = html.match(/<title>([^<]*)<\/title>/i) || html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
        html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
    const keywordsMatch = html.match(/<meta\s+name=["']keywords["']\s+content=["']([^"']+)["']/i);

    return {
        ogImage: ogImageMatch ? ogImageMatch[1] : null,
        title: titleMatch ? titleMatch[1] : null,
        description: descMatch ? descMatch[1] : null,
        keywords: keywordsMatch ? keywordsMatch[1] : null
    };
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
    const apifyToken = process.env.APIFY_API_TOKEN || process.env.apify;

    return NextResponse.json({
        status: 'alive',
        version: 'v3-gemini-flash',
        env: {
            apify_present: !!apifyToken,
            gemini_present: !!geminiKey,
            supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing'
        }
    }, { headers: corsHeaders });
}

export async function POST(request: Request) {
    let debugInfoSnippet = "";
    let urlForCapture = "";
    let userIdForCapture = "";
    let body: any = {};

    try {
        body = await request.json();
        const { url, user_id, mock } = body;
        urlForCapture = url;
        userIdForCapture = user_id;

        console.log(`[SIFT] Start. URL: ${url}`);

        if (mock) {
            const { data, error } = await supabaseAdmin
                .from('pages')
                .insert({
                    url: 'https://mock.sift.app',
                    title: '🚀 Mock Sift Connection Test',
                    summary: 'If you can see this, the API and Supabase are connected correctly!',
                    user_id: user_id,
                    metadata: {
                        image_url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80',
                        debug_info: 'Mock Mode: Success'
                    },
                    tags: ['Test']
                })
                .select()
                .single();

            if (error) throw error;
            return NextResponse.json({ status: 'success', data }, { headers: corsHeaders });
        }

        if (!url && !body.image_base64) {
            return NextResponse.json({ status: 'error', message: 'URL or Image is required' }, { status: 400, headers: corsHeaders });
        }

        // 2. SUBSCRIPTION CHECK
        const userTier = body.user_tier || 'free';
        const tierLimits: Record<string, number> = {
            'free': 10,
            'plus': 50,
            'unlimited': 999999,
            'admin': 999999
        };
        const currentLimit = tierLimits[userTier] || tierLimits['free'];

        if (userTier !== 'unlimited' && userTier !== 'admin') {
            const { count, error: countError } = await supabaseAdmin
                .from('pages')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user_id);

            if (!countError && count && count >= currentLimit) {
                return NextResponse.json({
                    status: 'limit_reached',
                    message: `Limit reached (${currentLimit}). Upgrade for more!`,
                    upgrade_url: 'https://sift.app/upgrade'
                }, { status: 403, headers: corsHeaders });
            }
        }

        // 3. URL DEDUPLICATION — return cached result if same user sifted this URL recently
        if (url && user_id && !body.id) {
            const { data: existing } = await supabaseAdmin
                .from('pages')
                .select('*')
                .eq('user_id', user_id)
                .eq('url', url)
                .eq('metadata->>status', 'completed')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (existing) {
                console.log(`[SIFT] Dedup hit — returning existing sift for ${url}`);
                return NextResponse.json({
                    status: 'success',
                    data: existing,
                    deduplicated: true
                }, { headers: corsHeaders });
            }
        }

        // 4. EXECUTION
        let domain = 'Image';
        try { if (url) domain = new URL(url).hostname.replace('www.', ''); } catch {}
        let actorId: string | null = 'apify/website-content-crawler';
        let input: any = { "startUrls": [{ "url": url }], "maxCrawlDepth": 0 };

        if (url) {
            if (domain.includes('tiktok.com')) {
                actorId = 'clockworks/tiktok-scraper';
                input = { "postURLs": [url], "resultsPerPage": 1 };
            } else if (domain.includes('instagram.com') || domain.includes('instagr.am')) {
                actorId = 'apify/instagram-scraper';
                input = { "directUrls": [url], "resultsType": "details", "resultsLimit": 1 };
            } else if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
                actorId = 'apify/youtube-scraper';
                input = { "urls": [url], "downloadSubtitles": true, "maxResultStream": 1 };
            }
        } else {
            actorId = null; // Image scan
        }

        const result = await performFullSift(url, user_id, body.id, userTier, domain, actorId, input, "Sync. ", body.image_base64, body.metadata);

        // Fire and forget notification
        if (result && user_id) {
            sendPushNotification(
                user_id,
                "Sift Complete ✨",
                `"${result.title}" has been curated.`,
                { siftId: result.id, type: 'sift_complete' }
            ).catch(err => console.error('[Push] Trigger Error:', err));
        }

        return NextResponse.json({ status: 'success', data: result }, { headers: corsHeaders });

    } catch (error: any) {
        console.error('[SIFT] Critical Error:', error.message);
        try {
            let domain = 'Unknown';
            try { if (urlForCapture) domain = new URL(urlForCapture).hostname.replace('www.', ''); } catch {}
            const fallbackData = {
                user_id: userIdForCapture,
                url: urlForCapture,
                title: `Link from ${domain}`,
                summary: "Content extraction failed, but link saved.",
                content: "Content extraction failed, but link saved.",
                tags: ["Link"],
                metadata: {
                    ...body.metadata,
                    debug_info: `Fallback Error: ${error.message}`,
                    status: 'failed'
                }
            };

            let data;
            if (body.id) {
                const { data: updateData } = await supabaseAdmin.from('pages').update(fallbackData).eq('id', body.id).select().single();
                data = updateData;
            } else {
                const { data: insertData } = await supabaseAdmin.from('pages').insert(fallbackData).select().single();
                data = insertData;
            }
            // Fire and forget failure notification
            if (data && userIdForCapture) {
                sendPushNotification(
                    userIdForCapture,
                    "Sift Incomplete ⚠️",
                    `Extraction failed for your link, but we've saved it for you.`,
                    { siftId: data.id, type: 'sift_failed' }
                ).catch(err => console.error('[Push] Trigger Error (Fallback):', err));
            }

            return NextResponse.json({ status: 'success', data, debug_info: 'Fallback Success' }, { headers: corsHeaders });
        } catch (innerError) {
            return NextResponse.json({ status: 'error', message: 'Total Failure' }, { status: 500, headers: corsHeaders });
        }
    }
}

// --- ENGINE: CORE BUSINESS LOGIC ---
async function performFullSift(
    url: string,
    user_id: string,
    id: string | undefined,
    userTier: string,
    domain: string,
    actorId: string | null,
    input: any,
    debugInfoSnippet: string,
    imageBase64?: string,
    metadata?: any
) {
    let scrapedData: any = {};
    let ogImage: string | null = null;
    let currentDebug = debugInfoSnippet;

    // 1. SCRAPE
    if (actorId && url) {
        try {
            console.log(`[ENGINE] Apify: ${actorId}`);
            const run = await apifyClient.actor(actorId).call(input, { memory: 2048 });
            const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
            const rawItem = items[0] as any;

            if (rawItem) {
                if (domain.includes('tiktok.com')) {
                    scrapedData = {
                        title: rawItem.text || "TikTok",
                        description: rawItem.text,
                        imageUrl: rawItem.videoMeta?.coverUrl || rawItem.cover || rawItem.imageUrl,
                        transcript: rawItem.transcript || rawItem.subtitles || (rawItem.videoMeta && rawItem.videoMeta.subtitle) || (rawItem.suggestedWords ? rawItem.suggestedWords.join(' ') : "")
                    };
                } else if (domain.includes('instagram.com')) {
                    const images: string[] = [];
                    if (rawItem.displayUrl) images.push(rawItem.displayUrl);
                    if (rawItem.childPosts && Array.isArray(rawItem.childPosts)) {
                        rawItem.childPosts.forEach((post: any) => {
                            if (post.displayUrl && !images.includes(post.displayUrl)) images.push(post.displayUrl);
                        });
                    }
                    scrapedData = {
                        title: rawItem.caption?.substring(0, 100) || "Instagram",
                        description: rawItem.caption,
                        imageUrl: rawItem.displayUrl,
                        images: images.slice(0, 10),
                        transcript: rawItem.transcript || rawItem.subtitles || rawItem.video_subtitles || rawItem.video_transcripts || ""
                    };
                } else if (domain.includes('youtube.com')) {
                    scrapedData = { title: rawItem.title, description: rawItem.description, imageUrl: rawItem.thumbnailUrl, transcript: rawItem.subtitles ? JSON.stringify(rawItem.subtitles) : "" };
                } else {
                    scrapedData = { title: rawItem.metadata?.title || rawItem.title, description: rawItem.metadata?.description || rawItem.text, imageUrl: rawItem.metadata?.ogImage || rawItem.ogImage };
                }
                ogImage = scrapedData.imageUrl;
            }
        } catch (e: any) {
            currentDebug += `Scrape Failed: ${e.message}. `;
        }
    }

    // 2. FALLBACK META
    if (!scrapedData.title && url) {
        try {
            const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const html = await resp.text();
            const meta = extractMetaTags(html);
            scrapedData.title = meta.title || `Saved from ${domain}`;
            scrapedData.description = meta.description || "";
            ogImage = ogImage || meta.ogImage;
        } catch (e) { }
    }

    // 3. AI & IMAGE HANDLING
    let finalTitle = scrapedData.title || (imageBase64 ? "Image Scan" : "Untitled");
    let finalSummary = scrapedData.description || "Synthesizing...";
    let finalTags: string[] = ["Lifestyle"];
    let finalCategory = "Random";
    let smartData: Record<string, any> = {};
    let readingTime = estimateReadingTime(scrapedData.description || scrapedData.transcript || "");

    if (genAI && (scrapedData.title || scrapedData.description || scrapedData.transcript || imageBase64)) {
        try {
            if (imageBase64 && process.env.SUPABASE_SERVICE_ROLE_KEY) {
                const buffer = Buffer.from(imageBase64, 'base64');
                const fileName = `uploads/${Date.now()}.jpg`;
                await supabaseAdmin.storage.from('sift-assets').upload(fileName, buffer, { contentType: 'image/jpeg' });
                const { data: { publicUrl } } = supabaseAdmin.storage.from('sift-assets').getPublicUrl(fileName);
                ogImage = publicUrl;
            }

            const model = genAI.getGenerativeModel({
                model: 'gemini-2.5-flash-preview-05-20',
                generationConfig: {
                    responseMimeType: 'application/json',
                },
                systemInstruction: SYSTEM_PROMPT,
            });

            // Build content parts for Gemini
            const parts: any[] = [];

            if (imageBase64) {
                parts.push({ text: "Extract info from this image." });
                parts.push({ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } });
            } else if (scrapedData.images && scrapedData.images.length > 1) {
                parts.push({ text: JSON.stringify({ title: scrapedData.title, description: scrapedData.description }) });
                // Fetch and inline up to 4 images for Gemini vision
                const imagePromises = scrapedData.images.slice(0, 4).map(async (imgUrl: string) => {
                    try {
                        const resp = await fetch(imgUrl);
                        if (!resp.ok) return null;
                        const buffer = Buffer.from(await resp.arrayBuffer());
                        return { inlineData: { mimeType: 'image/jpeg', data: buffer.toString('base64') } };
                    } catch { return null; }
                });
                const imageParts = (await Promise.all(imagePromises)).filter(Boolean);
                parts.push(...imageParts);
            } else {
                parts.push({ text: JSON.stringify(scrapedData) });
            }

            const result = await model.generateContent(parts);
            const responseText = result.response.text();
            let ai;
            try {
                ai = JSON.parse(responseText);
            } catch {
                console.error('[SIFT] Invalid JSON from Gemini:', responseText.slice(0, 200));
                ai = {};
            }

            finalTitle = ai.title || finalTitle;
            finalSummary = ai.summary || finalSummary;
            finalTags = validateTags(ai.tags || []);
            finalCategory = ai.category || finalCategory;
            smartData = ai.smart_data || {};
            if (ai.reading_time_minutes && typeof ai.reading_time_minutes === 'number') {
                readingTime = ai.reading_time_minutes;
            }
        } catch (e: any) {
            currentDebug += `AI Failed: ${e.message}. `;
        }
    }

    // 4. STORAGE (Re-host image)
    if (ogImage && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
            if (!ogImage.includes('supabase.co')) {
                const imgResp = await fetch(ogImage);
                if (imgResp.ok) {
                    const blob = await imgResp.arrayBuffer();
                    const fileName = `covers/${Date.now()}.jpg`;
                    await supabaseAdmin.storage.from('sift-assets').upload(fileName, blob, { contentType: 'image/jpeg' });
                    const { data: { publicUrl } } = supabaseAdmin.storage.from('sift-assets').getPublicUrl(fileName);
                    ogImage = publicUrl;
                }
            }
        } catch (e) { }
    }

    // 5. UPDATE
    const recordData = {
        user_id,
        url,
        title: finalTitle,
        summary: finalSummary,
        content: finalSummary,
        tags: finalTags,
        metadata: {
            ...metadata,
            image_url: ogImage,
            category: finalCategory,
            smart_data: smartData,
            reading_time_minutes: readingTime,
            debug_info: currentDebug,
            scraped_at: new Date().toISOString(),
            status: 'completed'
        }
    };

    if (id) {
        const { data, error } = await supabaseAdmin.from('pages').update(recordData).eq('id', id).select().single();
        if (error) throw error;
        return data;
    } else {
        const { data, error } = await supabaseAdmin.from('pages').insert(recordData).select().single();
        if (error) throw error;
        return data;
    }
}
