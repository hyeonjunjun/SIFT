
import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/supabase';

// Force Redeploy: 2026-01-19 18:40

// Vercel Timeout Fix: Increase max duration for long-running social media scrapes
export const maxDuration = 60;

// Initialize clients safely
const apifyClient = new ApifyClient({
    token: process.env.APIFY_API_TOKEN || process.env.apify,
});

const openai = (process.env.OPENAI_API_KEY || process.env.open_ai)
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY || process.env.open_ai })
    : null;

const SYSTEM_PROMPT = `
    You are an expert curator and archivist.
    Your goal is to read the provided web content, video transcripts, or image OCR data and synthesize it into a structured JSON response.

    **OUTPUT FORMAT:**
    You must return a valid JSON object with these exact keys:
    {
        "title": "A short, catchy title",
        "category": "Cooking, Tech, Design, Health, Fashion, News, or Random",
        "tags": ["Tag1", "Tag2"],
        "summary": "The full formatted content in Markdown",
        "smart_data": {
            "ingredients": ["item1"],
            "price": "$0.00",
            "extracted_text": "any specific raw text extracted",
            "video_insights": "key takeaways if it's a video"
        }
    }

    **TAGGING RULES (STRICT):**
    - You must select tags **ONLY** from this list: ["Cooking", "Baking", "Tech", "Health", "Lifestyle", "Professional"].
    - **DO NOT** create new tags.
    - If no tag fits, use "Lifestyle".
    - Select exactly 2-3 tags.

    **CONTENT INSTRUCTIONS (for the 'summary' field):**
    - **Voice**: Clean, concise, functional.
    - **Structure**:
      - Start with a 1-sentence synopsis.
      - Use **H2 (##)** for headers.
      - Use **Bold** for key items.
      - Use **Bullet Points** for lists.
    
    **CRITICAL FOR RECIPES/HOW-TO:**
    - If the content is a Recipe, you MUST extract the full **Ingredients** and **Preparation/Steps** verbatim into the markdown.
    - Use headers: ## Ingredients, ## Preparation.

    **CRITICAL FOR IMAGES (OCR):**
    - If OCR data or image analysis is provided, focus on extracting structured data like prices, ingredients, dates, or key entities.

    **CRITICAL FOR VIDEOS (Transcript):**
    - Use the provided transcript to provide specific insights and a detailed summary of the video's content.
`;

function extractMetaTags(html: string) {
    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    const titleMatch = html.match(/<title>([^<]*)<\/title>/i) || html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
    return {
        ogImage: ogImageMatch ? ogImageMatch[1] : null,
        title: titleMatch ? titleMatch[1] : null
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
        version: 'v2-debug-robust',
        env: {
            apify_present: !!apifyToken,
            apify_prefix: apifyToken ? apifyToken.substring(0, 5) + '...' : 'N/A',
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

        // DEBUG: Verify Keys (Masked)
        console.log(`[SIFT] Start. URL: ${url}`);
        console.log(`[SIFT] Apify Token Present: ${!!(process.env.APIFY_API_TOKEN || process.env.apify)}`);
        console.log(`[SIFT] OpenAI Key Present: ${!!(process.env.OPENAI_API_KEY || process.env.open_ai)}`);

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

            if (error) return NextResponse.json({ status: 'error', message: error.message }, { status: 500, headers: corsHeaders });
            return NextResponse.json({ status: 'success', data }, { headers: corsHeaders });
        }

        if (!url && !body.image_base64) {
            return NextResponse.json({ status: 'error', message: 'URL or Image is required' }, { status: 400, headers: corsHeaders });
        }

        // 0. SUBSCRIPTION CHECK
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
                    message: `You have reached your tier limit (${currentLimit} sifts). Upgrade for more!`,
                    upgrade_url: 'https://sift.app/upgrade'
                }, { status: 403, headers: corsHeaders });
            }
        }

        console.log(`[SIFT] Processing URL: ${url || 'Image Scan'} User: ${user_id || 'Guest'} Tier: ${userTier}`);

        // 1. DISPATCH ROUTER (Switchboard Strategy)
        let scrapedData: any = {};
        let ogImage: string | null = null;
        let actorId: string | null = null;
        let input: any = {};

        const domain = new URL(url).hostname.replace('www.', '');

        // Route Selection
        if (domain.includes('tiktok.com')) {
            console.log('[SIFT] Switchboard -> TikTok');
            actorId = 'clockworks/tiktok-scraper';
            input = { "postURLs": [url] };
        } else if (domain.includes('instagram.com')) {
            console.log('[SIFT] Switchboard -> Instagram');
            actorId = 'apify/instagram-scraper';
            input = { "directUrls": [url], "resultsType": "details" };
        } else if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
            console.log('[SIFT] Switchboard -> YouTube');
            actorId = 'apify/youtube-scraper';
            input = { "urls": [url], "downloadSubtitles": true };
        } else {
            console.log('[SIFT] Switchboard -> General Web');
            actorId = 'apify/website-content-crawler';
            input = { "startUrls": [{ "url": url }], "maxCrawlDepth": 0 };
        }

        // Execution
        const hasApifyToken = process.env.APIFY_API_TOKEN || process.env.apify;
        if (hasApifyToken) {
            try {
                const run = await apifyClient.actor(actorId!).call(input);
                const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
                const rawItem = items[0] as any;

                if (rawItem) {
                    // Standardized Output Mapping
                    if (domain.includes('tiktok.com')) {
                        scrapedData = {
                            title: rawItem.text || "TikTok Video",
                            description: rawItem.text,
                            imageUrl: rawItem.videoMeta?.coverUrl || rawItem.cover || rawItem.imageUrl
                        };
                    } else if (domain.includes('instagram.com')) {
                        scrapedData = {
                            title: rawItem.caption?.substring(0, 50) || "Instagram Post",
                            description: rawItem.caption,
                            imageUrl: rawItem.displayUrl
                        };
                    } else if (domain.includes('youtube.com')) {
                        scrapedData = {
                            title: rawItem.title,
                            description: rawItem.description,
                            imageUrl: rawItem.thumbnailUrl,
                            transcript: rawItem.subtitles ? JSON.stringify(rawItem.subtitles) : ""
                        };
                    } else {
                        // General Web Crawler
                        scrapedData = {
                            title: rawItem.metadata?.title || rawItem.title,
                            description: rawItem.metadata?.description || rawItem.text,
                            imageUrl: rawItem.metadata?.ogImage || rawItem.ogImage
                        };
                    }
                    ogImage = scrapedData.imageUrl;
                    debugInfoSnippet += `Scraper: Success (${domain}). `;
                } else {
                    throw new Error("Empty items from Apify");
                }
            } catch (e: any) {
                console.error('[SIFT] Scraper Failed:', e.message);
                // DETAILED ERROR CAPTURE
                debugInfoSnippet += `Scraper Failed: ${e.message} (Stack: ${e.stack ? e.stack.substring(0, 100) : 'N/A'}). `;
            }
        }

        // 2. PARTIAL SUCCESS / FALLBACK LOGIC
        // If we have no title yet, try one last meta fetch
        if (!scrapedData.title) {
            try {
                // ROBUST USER AGENT
                const response = await fetch(url, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
                });
                const html = await response.text();
                const meta = extractMetaTags(html);
                scrapedData.title = meta.title || `Saved from ${domain}`;
                ogImage = ogImage || meta.ogImage;
                debugInfoSnippet += "Fallback: Meta Capture. ";
            } catch (e) {
                scrapedData.title = `Saved from ${domain}`;
                debugInfoSnippet += "Fallback: Domain Capture. ";
            }
        }

        // 3. AI SYNTHESIS (Optional, do not block success)
        let finalTitle = scrapedData.title;
        let finalSummary = scrapedData.description || "Summary unavailable.";
        let finalTags = ["Lifestyle"];
        let finalCategory = "Random";
        let smartData = {};

        if (openai && (scrapedData.description || scrapedData.transcript || body.image_base64)) {
            try {
                // If it's a direct image sift, we should host the image so it shows up on the card
                if (body.image_base64 && process.env.SUPABASE_SERVICE_ROLE_KEY) {
                    try {
                        const buffer = Buffer.from(body.image_base64, 'base64');
                        const fileName = `uploads/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
                        await supabaseAdmin.storage.from('sift-assets').upload(fileName, buffer, { contentType: 'image/jpeg' });
                        const { data: { publicUrl } } = supabaseAdmin.storage.from('sift-assets').getPublicUrl(fileName);
                        ogImage = publicUrl;
                    } catch (storageError) {
                        console.error('[SIFT] Image storage failed:', storageError);
                    }
                }

                const messages: any[] = [
                    { role: "system", content: SYSTEM_PROMPT }
                ];

                if (body.image_base64) {
                    messages.push({
                        role: "user",
                        content: [
                            { type: "text", text: "Analyze this image and extract all relevant data." },
                            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${body.image_base64}` } }
                        ]
                    });
                } else {
                    messages.push({ role: "user", content: JSON.stringify(scrapedData) });
                }

                const completion = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages,
                    response_format: { type: "json_object" }
                });

                const ai = JSON.parse(completion.choices[0].message.content || "{}");
                finalTitle = ai.title || finalTitle;
                finalSummary = ai.summary || finalSummary;
                finalTags = ai.tags || finalTags;
                finalCategory = ai.category || finalCategory;
                smartData = ai.smart_data || {};
                debugInfoSnippet += "AI: Success. ";
            } catch (e) {
                console.error('[SIFT] AI Failed');
                debugInfoSnippet += "AI: Failed. ";
            }
        }

        // 4. STORAGE (Re-host image to avoid hotlinking Protections)
        if (ogImage && process.env.SUPABASE_SERVICE_ROLE_KEY) {
            try {
                // Optimization: Don't re-host if it's already on a high-availability CDN
                const reliableDomains = ['supabase.co', 'cloudfront.net', 'imgix.net', 'fbcdn.net', 'static.xx.fbcdn.net'];
                const isReliable = reliableDomains.some(d => ogImage!.includes(d));

                if (!isReliable) {
                    const imgResponse = await fetch(ogImage);
                    if (imgResponse.ok) {
                        const imgBlob = await imgResponse.arrayBuffer();
                        const fileName = `covers/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
                        await supabaseAdmin.storage.from('sift-assets').upload(fileName, imgBlob, { contentType: 'image/jpeg' });
                        const { data: { publicUrl } } = supabaseAdmin.storage.from('sift-assets').getPublicUrl(fileName);
                        ogImage = publicUrl;
                    }
                }
            } catch (e) {
                console.error('[SIFT] Storage error:', e);
            }
        }

        // 5. FINAL SAVE (Insert or Update if optimistic ID provided)
        const recordData = {
            user_id,
            url,
            title: finalTitle,
            summary: finalSummary,
            content: finalSummary,
            tags: finalTags,
            metadata: {
                ...body.metadata,
                image_url: ogImage,
                category: finalCategory,
                smart_data: smartData,
                debug_info: debugInfoSnippet,
                scraped_at: new Date().toISOString(),
                status: 'completed'
            }
        };

        let result;
        if (body.id) {
            console.log(`[SIFT] Updating existing record: ${body.id}`);
            const { data, error } = await supabaseAdmin
                .from('pages')
                .update(recordData)
                .eq('id', body.id)
                .select()
                .single();
            if (error) throw error;
            result = data;
        } else {
            console.log('[SIFT] Inserting new record');
            const { data, error } = await supabaseAdmin
                .from('pages')
                .insert(recordData)
                .select()
                .single();
            if (error) throw error;
            result = data;
        }

        return NextResponse.json({ status: 'success', data: result }, { headers: corsHeaders });

    } catch (error: any) {
        console.error('[SIFT] Critical Error:', error.message);

        // ULTIMATE FALLBACK: Save even if everything exploded
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
                    debug_info: `Ultimate Fallback: ${error.message}`,
                    status: 'failed'
                }
            };

            let data;
            if (body.id) {
                const { data: updateData } = await supabaseAdmin
                    .from('pages')
                    .update(fallbackData)
                    .eq('id', body.id)
                    .select()
                    .single();
                data = updateData;
            } else {
                const { data: insertData } = await supabaseAdmin
                    .from('pages')
                    .insert(fallbackData)
                    .select()
                    .single();
                data = insertData;
            }

            return NextResponse.json({ status: 'success', data, debug_info: 'Fallback Success' }, { headers: corsHeaders });
        } catch (innerError) {
            return NextResponse.json({ status: 'error', message: 'Total System Failure' }, { status: 500, headers: corsHeaders });
        }
    }
}
