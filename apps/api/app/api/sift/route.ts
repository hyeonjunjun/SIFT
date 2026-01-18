
import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/supabase';

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
    Your goal is to read the provided web content and synthesize it into a structured JSON response.

    **OUTPUT FORMAT:**
    You must return a valid JSON object with these exact keys:
    {
        "title": "A short, catchy title",
        "category": "Cooking, Tech, Design, Health, Fashion, News, or Random",
        "tags": ["Tag1", "Tag2"],
        "summary": "The full formatted content in Markdown"
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

export async function POST(request: Request) {
    let debugInfoSnippet = "";
    let urlForCapture = "";
    let userIdForCapture = "";

    try {
        const body = await request.json();
        const { url, user_id, mock } = body;
        urlForCapture = url;
        userIdForCapture = user_id;

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

        if (!url) {
            return NextResponse.json({ status: 'error', message: 'URL is required' }, { status: 400, headers: corsHeaders });
        }

        console.log(`[SIFT] Processing URL: ${url} User: ${user_id || 'Guest'}`);

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
            input = { "startUrls": [{ "url": url }] };
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
        if (process.env.APIFY_API_TOKEN) {
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
                            imageUrl: rawItem.videoMeta?.coverUrl
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
                debugInfoSnippet += `Scraper Failed: ${e.message}. `;
            }
        }

        // 2. PARTIAL SUCCESS / FALLBACK LOGIC
        // If we have no title yet, try one last meta fetch
        if (!scrapedData.title) {
            try {
                const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
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

        if (openai && scrapedData.description) {
            try {
                const completion = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [
                        { role: "system", content: SYSTEM_PROMPT },
                        { role: "user", content: JSON.stringify(scrapedData) }
                    ],
                    response_format: { type: "json_object" }
                });

                const ai = JSON.parse(completion.choices[0].message.content || "{}");
                finalTitle = ai.title || finalTitle;
                finalSummary = ai.summary || finalSummary;
                finalTags = ai.tags || finalTags;
                finalCategory = ai.category || finalCategory;
                debugInfoSnippet += "AI: Success. ";
            } catch (e) {
                console.error('[SIFT] AI Failed');
                debugInfoSnippet += "AI: Failed. ";
            }
        }

        // 4. STORAGE (Re-host image to avoid hotlinking Protections)
        if (ogImage && process.env.SUPABASE_SERVICE_ROLE_KEY) {
            try {
                const imgResponse = await fetch(ogImage);
                if (imgResponse.ok) {
                    const imgBlob = await imgResponse.arrayBuffer();
                    const fileName = `covers/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
                    await supabaseAdmin.storage.from('sift-assets').upload(fileName, imgBlob, { contentType: 'image/jpeg' });
                    const { data: { publicUrl } } = supabaseAdmin.storage.from('sift-assets').getPublicUrl(fileName);
                    ogImage = publicUrl;
                }
            } catch (e) { }
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
                image_url: ogImage,
                category: finalCategory,
                debug_info: debugInfoSnippet,
                scraped_at: new Date().toISOString()
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
            const domain = new URL(urlForCapture).hostname.replace('www.', '');
            const fallbackData = {
                user_id: userIdForCapture,
                url: urlForCapture,
                title: `Link from ${domain}`,
                summary: "Content extraction failed, but link saved.",
                content: "Content extraction failed, but link saved.",
                tags: ["Link"],
                metadata: { debug_info: "Ultimate Fallback triggered." }
            };

            let data;
            // Handle body parsing if possible, otherwise use captures
            const body = await request.clone().json().catch(() => ({}));
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
