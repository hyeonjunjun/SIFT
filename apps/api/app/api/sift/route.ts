
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { ApifyClient } from 'apify-client';
import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/supabase';

// Initialize clients safely
const apifyClient = new ApifyClient({
    token: process.env.APIFY_API_TOKEN || process.env.apify,
});

// Avoid crashing if key is missing
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

// Helper to extract meta tags
function extractMetaTags(html: string) {
    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    const titleMatch = html.match(/<title>([^<]*)<\/title>/i) || html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
    return {
        ogImage: ogImageMatch ? ogImageMatch[1] : null,
        title: titleMatch ? titleMatch[1] : null
    };
}

// CORS Headers for Mobile
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { url, platform, user_id } = body;

        if (!url) {
            return NextResponse.json(
                { status: 'error', message: 'URL is required' },
                { status: 400, headers: corsHeaders }
            );
        }

        const logEntry = `[${new Date().toISOString()}] SIFT ${url} - User: ${user_id || 'Guest'}\n`;
        fs.appendFileSync(path.join(process.cwd(), 'sift.log'), logEntry);

        console.log(`[SIFT] Processing URL: ${url} (${platform}) User: ${user_id || 'Guest'}`);
        if (!user_id) {
            console.warn('[SIFT] WARNING: No user_id provided. Sift will be orphaned.');
        }
        console.log(`[SIFT] Env Check - Apify: ${!!process.env.APIFY_API_TOKEN}, OpenAI: ${!!process.env.OPENAI_API_KEY}, Supabase: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`);

        // 1. Scrape Content & Metadata
        let scrapedData: any = {}; // Use any for Apify data
        let ogImage: string | null = null;
        let debugInfoSnippet = "";

        // Fetch HTML for generic OG tags (Fastest, good for articles)
        try {
            console.log('[SIFT] Fetching HTML for metadata...');
            // Add better headers to avoid blocks
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                }
            });
            const html = await response.text();
            const meta = extractMetaTags(html);
            ogImage = meta.ogImage;
            if (meta.title) {
                scrapedData = { ...scrapedData, title: meta.title };
            }
            console.log('[SIFT] Found OG Image:', ogImage);
            debugInfoSnippet += `Meta: ${meta.title ? 'Found title' : 'No title'}. `;
        } catch (e) {
            console.log('[SIFT] Metadata fetch failed:', e);
            debugInfoSnippet += `Meta Fetch Failed. `;
        }

        if (process.env.APIFY_API_TOKEN) {
            console.log('[SIFT] Apify Token present. Starting scrape...');

            let actorId: string | null = 'clockworks/tiktok-scraper'; // Default
            let input: any = {};

            // Platform Router
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
                console.log('[SIFT] Detected YouTube URL');
                actorId = 'apify/youtube-scraper';
                input = {
                    "urls": [url],
                    "downloadSubtitles": true,
                    "saveSubsToKVS": false
                };
            } else if (url.includes('instagram.com')) {
                console.log('[SIFT] Detected Instagram URL (Using User Config)');
                actorId = 'shu8hvrXbJbY3Eb9W'; // User specified Actor
                input = {
                    "directUrls": [url],
                    "resultsType": "posts",
                    "resultsLimit": 1,   // We only need the one post
                    "addParentData": false,
                    "proxyConfiguration": { "useApifyProxy": true }
                };
            } else if (url.includes('tiktok.com')) {
                // Default / TikTok (Revert to Clockworks - Previous Working Ver)
                console.log('[SIFT] Detected TikTok URL (Reverted to Clockworks)');
                actorId = 'clockworks/tiktok-scraper';
                input = {
                    "postURLs": [url],
                    "shouldDownloadVideos": false,
                    "shouldDownloadCovers": false,
                    "shouldDownloadSlideshowImages": false,
                    "proxyConfiguration": { "useApifyProxy": true }
                };
            } else {
                console.log('[SIFT] Regular Website - Skipping Apify, relying on Meta + AI');
                actorId = null;
            }

            if (actorId) {
                try {
                    const run = await apifyClient.actor(actorId).call(input);
                    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

                    // Normalization Strategy: Try to get data into a common format for OpenAI
                    if (!items || items.length === 0) {
                        console.warn('[SIFT] Apify returned 0 items.');
                        debugInfoSnippet += `Apify: 0 items. `;
                        throw new Error("No items returned from scraper");
                    }

                    const rawItem: any = items[0] || {};
                    console.log("🔍 [1] Apify Raw Input Keys:", Object.keys(rawItem));
                    debugInfoSnippet += `Apify: Got ${Object.keys(rawItem).length} keys. `;

                    if (url.includes('youtube.com') || url.includes('youtu.be')) {
                        scrapedData = {
                            title: rawItem.title,
                            description: rawItem.description,
                            caption: rawItem.description, // Mapping to caption for AI
                            author: rawItem.channelName,
                            transcript: rawItem.subtitles ? JSON.stringify(rawItem.subtitles) : "No transcript available.",
                            videoMeta: { coverUrl: rawItem.thumbnailUrl }
                        };
                    } else if (url.includes('instagram.com')) {
                        const captionText = (typeof rawItem.caption === 'object' && rawItem.caption !== null)
                            ? rawItem.caption.text
                            : (rawItem.caption || rawItem.text || "No caption detected.");

                        scrapedData = {
                            caption: captionText,
                            author: rawItem.ownerUsername || (rawItem.owner && rawItem.owner.username),
                            imageUrl: rawItem.displayUrl || rawItem.thumbnailUrl,
                            videoMeta: { coverUrl: rawItem.displayUrl || rawItem.thumbnailUrl }
                        };
                    } else if (url.includes('tiktok.com')) {
                        scrapedData = {
                            caption: rawItem.text || rawItem.description || "No caption.",
                            author: rawItem.authorMeta ? rawItem.authorMeta.name : rawItem.author,
                            imageUrl: rawItem.imageUrl || rawItem.videoMeta?.coverUrl,
                            videoMeta: { coverUrl: rawItem.imageUrl }
                        };
                    } else {
                        scrapedData = rawItem;
                    }

                    if (scrapedData) {
                        const possibleImage = scrapedData.videoMeta?.coverUrl || scrapedData.imageUrl || scrapedData.thumbnailUrl;
                        if (possibleImage) {
                            ogImage = possibleImage;
                        }
                    }
                } catch (apifyError: any) {
                    console.error('[SIFT] Apify Error:', apifyError.message);
                    debugInfoSnippet += `Apify Error: ${apifyError.message.substring(0, 30)}. `;
                    // DO NOT overwrite scrapedData with error, keep title/og captured earlier
                    scrapedData = { ...scrapedData, scraper_error: apifyError.message };
                }
            }
        }

        // 1.5. Validate Scraped Data & Re-host Image
        if (scrapedData && !scrapedData.error) {
            const targetImageUrl = scrapedData.videoMeta?.coverUrl || scrapedData.imageUrl || scrapedData.thumbnailUrl;
            if (targetImageUrl && process.env.SUPABASE_SERVICE_ROLE_KEY) {
                try {
                    const imgResponse = await fetch(targetImageUrl);
                    if (imgResponse.ok) {
                        const imgBlob = await imgResponse.arrayBuffer();
                        const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
                        const ext = contentType.split('/')[1] || 'jpg';
                        const fileName = `covers/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

                        const { error: uploadError } = await supabaseAdmin.storage
                            .from('sift-assets')
                            .upload(fileName, imgBlob, { contentType, upsert: true });

                        if (!uploadError) {
                            const { data: { publicUrl } } = supabaseAdmin.storage
                                .from('sift-assets')
                                .getPublicUrl(fileName);
                            scrapedData.imageUrl = publicUrl;
                            ogImage = publicUrl;
                        }
                    }
                } catch (imgError) {
                    console.error('[SIFT] Image Re-hosting Exception');
                }
            }
        }

        if (scrapedData && (scrapedData.error || scrapedData.scraper_error)) {
            // If it's a hard error, we might want to flag it or keep going with placeholders
        }

        // 2. Synthesize with OpenAI
        let title = "Untitled Page";
        let summary = "Summary unavailable.";
        let category = "Random";
        let tags: string[] = ["Saved"];

        const textToAnalyze = scrapedData?.caption || scrapedData?.description || scrapedData?.transcript || scrapedData?.title;
        const hasContent = scrapedData && textToAnalyze && textToAnalyze.length > 5;

        if (openai && hasContent) {
            console.log('[SIFT] OpenAI Key present. Generating summary...');
            try {
                const safeInput = JSON.stringify(scrapedData).substring(0, 20000);
                const completion = await openai.chat.completions.create({
                    model: "gpt-4o",
                    "messages": [
                        { "role": "system", "content": SYSTEM_PROMPT },
                        { "role": "user", "content": safeInput }
                    ],
                    "response_format": { "type": "json_object" }
                }, { timeout: 120000 });

                const rawAiResponse = completion.choices[0].message.content || "{}";
                const parsedData = JSON.parse(rawAiResponse);

                title = parsedData.title || title;
                summary = parsedData.summary || summary;
                category = parsedData.category || category;
                tags = parsedData.tags || [];
                debugInfoSnippet += `AI: Success. `;
            } catch (aiError: any) {
                console.error("💥 [AI FAILURE]", aiError.message);
                debugInfoSnippet += `AI Error: ${aiError.message.substring(0, 30)}. `;
            }
        } else {
            const hostname = new URL(url).hostname.replace('www.', '');
            const metaTitle = (scrapedData && scrapedData.title) ? scrapedData.title : null;
            title = metaTitle || `Saved from ${hostname}`;
            summary = "Content could not be scraped. Saved as bookmark.";
            category = "Random";
            tags = ["Bookmark"];
            debugInfoSnippet += `Mode: Bookmark Fallback. `;
        }

        // 3. Save to Supabase
        console.log('[SIFT] Saving to Supabase...');
        const { data, error } = await supabaseAdmin
            .from('pages')
            .insert({
                user_id: user_id || null,
                url,
                platform: platform || 'unknown',
                title,
                summary,
                content: summary,
                tags,
                metadata: {
                    source: 'sift-api',
                    scraped_at: new Date().toISOString(),
                    image_url: ogImage,
                    category,
                    debug_info: debugInfoSnippet
                }
            })
            .select()
            .single();

        if (error) {
            console.error('[SIFT] Supabase Insert Error:', error.message);
            fs.appendFileSync(path.join(process.cwd(), 'sift.log'), `[ERROR] Supabase Insert: ${error.message}\n`);
            throw new Error(`Database insert failed: ${error.message}`);
        }

        fs.appendFileSync(path.join(process.cwd(), 'sift.log'), `[SUCCESS] Saved ID: ${data.id}\n`);

        return NextResponse.json(
            { status: 'success', data: data, debug_info: debugInfoSnippet },
            { headers: corsHeaders }
        );

    } catch (error: any) {
        console.error('[SIFT] Internal Error:', error.message);
        fs.appendFileSync(path.join(process.cwd(), 'sift.log'), `[CRITICAL] ${error.message}\n`);
        return NextResponse.json(
            { status: 'error', message: error.message || 'Internal Server Error', debug_info: 'Critical Exception' },
            { status: 500, headers: corsHeaders }
        );
    }
}
