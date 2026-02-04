import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/supabase';

// Force Redeploy: 2026-02-04 01:00 (Deep Resilience Upgrade)
export const maxDuration = 300;

// Initialize clients safely
const apifyClient = new ApifyClient({
    token: process.env.APIFY_API_TOKEN || process.env.apify,
});

const openai = (process.env.OPENAI_API_KEY || process.env.open_ai)
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY || process.env.open_ai })
    : null;

const SYSTEM_PROMPT = `
    You are an expert curator and archivist for "SIFT", a premium knowledge management app.
    Your goal is to synthesize provide web content into a high-end, structured JSON response.

    **OUTPUT FORMAT:**
    You must return a valid JSON object with these exact keys:
    {
        "title": "A short, catchy, and professional title",
        "category": "Cooking, Tech, Design, Health, Fashion, News, or Random",
        "tags": ["Tag1", "Tag2"],
        "summary": "The full formatted content in Markdown. DO NOT BE BRIEF. If it is a recipe or a how-to guide, you MUST provide every single step and ingredient from your internal knowledge or the provided data. If the provided data is a TikTok/Reel with no transcript, use the title and caption to infer the complete high-quality recipe.",
        "smart_data": {
            "ingredients": ["item1"],
            "preparation_time": "e.g. 30 mins",
            "extracted_text": "any specific raw text extracted",
            "video_insights": "key takeaways if it's a video"
        }
    }

    **TAGGING RULES:**
    - Choose 2-3 tags from: ["Cooking", "Baking", "Tech", "Health", "Lifestyle", "Professional"].

    **CONTENT STRUCTURE (for the 'summary' field):**
    - **Header**: Use ## (H2) for sections.
    - **Formatting**: Use **Bold** for key ingredients and steps.
    - **COMPLETENESS**: If this is a recipe for something like "Steak Bites", "Salmon Bites", or "Tacos", your summary MUST include:
      ## Ingredients
      (Full bulleted list)
      ## Preparation
      (Full numbered steps)
`;

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
    const openaiKey = process.env.OPENAI_API_KEY || process.env.open_ai;

    return NextResponse.json({
        status: 'alive',
        version: 'v2-hyper-async',
        env: {
            apify_present: !!apifyToken,
            openai_present: !!openaiKey,
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
        const hasApifyToken = process.env.APIFY_API_TOKEN || process.env.apify;

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
            'plus': 30,
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

        // 3. EXECUTION
        const domain = url ? new URL(url).hostname.replace('www.', '') : 'Image';
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
        return NextResponse.json({ status: 'success', data: result }, { headers: corsHeaders });

    } catch (error: any) {
        console.error('[SIFT] Critical Error:', error.message);
        try {
            const domain = urlForCapture ? new URL(urlForCapture).hostname.replace('www.', '') : 'Unknown';
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
                    scrapedData = { title: rawItem.text || "TikTok", description: rawItem.text, imageUrl: rawItem.videoMeta?.coverUrl || rawItem.cover || rawItem.imageUrl };
                } else if (domain.includes('instagram.com')) {
                    scrapedData = { title: rawItem.caption?.substring(0, 100) || "Instagram", description: rawItem.caption, imageUrl: rawItem.displayUrl };
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
    let finalTags = ["Lifestyle"];
    let finalCategory = "Random";
    let smartData = {};

    if (openai && (scrapedData.title || scrapedData.description || scrapedData.transcript || imageBase64)) {
        try {
            if (imageBase64 && process.env.SUPABASE_SERVICE_ROLE_KEY) {
                const buffer = Buffer.from(imageBase64, 'base64');
                const fileName = `uploads/${Date.now()}.jpg`;
                await supabaseAdmin.storage.from('sift-assets').upload(fileName, buffer, { contentType: 'image/jpeg' });
                const { data: { publicUrl } } = supabaseAdmin.storage.from('sift-assets').getPublicUrl(fileName);
                ogImage = publicUrl;
            }

            const messages: any[] = [{ role: "system", content: SYSTEM_PROMPT }];
            if (imageBase64) {
                messages.push({ role: "user", content: [{ type: "text", text: "Extract info from this." }, { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }] });
            } else {
                messages.push({ role: "user", content: JSON.stringify(scrapedData) });
            }

            const completion = await openai.chat.completions.create({ model: "gpt-4o", messages, response_format: { type: "json_object" } });
            const ai = JSON.parse(completion.choices[0].message.content || "{}");
            finalTitle = ai.title || finalTitle;
            finalSummary = ai.summary || finalSummary;
            finalTags = ai.tags || finalTags;
            finalCategory = ai.category || finalCategory;
            smartData = ai.smart_data || {};
        } catch (e: any) {
            currentDebug += `AI Failed. `;
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
