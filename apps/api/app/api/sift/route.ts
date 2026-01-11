
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { ApifyClient } from 'apify-client';
import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/supabase';

// Initialize clients safely
const apifyClient = new ApifyClient({
    token: process.env.APIFY_API_TOKEN,
});

// Avoid crashing if key is missing
const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

const SYSTEM_PROMPT = `
# Core Rules
1. **No Preamble/Postscript:** Output *only* the requested data.
2. **Prioritize Captions:** Use text overlays/captions primarily.
3. **Tone:** Objective, concise, but natural.
4. **Formatting:** Use Markdown headers (#, ##) for main sections. Use **bolding** for emphasis.

# Content-Specific Protocols

## IF Content is a RECIPE:
Format as follows:
# [Recipe Name]
> *Brief 1-sentence description.*

## Ingredients
- [Quantity] [Unit] **[Ingredient]**
- [Quantity] [Unit] **[Ingredient]**

## Instructions
1. **[Action]**: [Details]
2. **[Action]**: [Details]

## IF Content is INFORMATIONAL/EDUCATIONAL:
Format as follows:
# [Main Topic/Title]
> [2-3 sentence summary/hook.]

## Key Points
* **[Concept]**: [Explanation]
    * **[Concept]**: [Explanation]

## IF Content is GENERAL/ENTERTAINMENT:
Format as follows:
# Summary
[A single paragraph summary. Use **bolding** to highlight key events or names.]

# FINAL REQUIREMENT
At the very bottom of your response, strictly output one line for categorization:
Tags: [Tag1, Tag2]
STRICTLY choose from ONLY these categories (max 2):
- Cooking
- Baking
- Tech
- Health
- Lifestyle
- Professional

If none fit perfectly, choose the closest one (e.g. 'Professional' for Finance/News, 'Lifestyle' for Entertainment).
`;

// Helper to extract meta tags
function extractMetaTags(html: string) {
    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    return {
        ogImage: ogImageMatch ? ogImageMatch[1] : null
    };
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { url, platform } = body;

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        console.log(`[SIFT] Processing URL: ${url} (${platform})`);

        // 1. Scrape Content & Metadata
        let scrapedData: any = {}; // Use any for Apify data
        let ogImage: string | null = null;

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
            console.log('[SIFT] Found OG Image:', ogImage);
        } catch (e) {
            console.log('[SIFT] Metadata fetch failed:', e);
        }

        if (process.env.APIFY_API_TOKEN) {
            console.log('[SIFT] Apify Token present. Starting scrape...');
            const input = {
                "postURLs": [url],
                "shouldDownloadVideos": false,
                "shouldDownloadCovers": false,
                "shouldDownloadSlideshowImages": false,
                "proxyConfiguration": { "useApifyProxy": true }
            };

            const run = await apifyClient.actor('clockworks/tiktok-scraper').call(input);
            const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
            scrapedData = items[0] || {};

            // Fallback for Title/Image from Scraper Data (Better for TikTok/Insta)
            if (!ogImage && scrapedData) {
                // TikTok specific structure usually has videoMeta.coverUrl or just coverUrl
                // NOTE: 'clockworks/tiktok-scraper' output varies. Common paths:
                const possibleImage = scrapedData.videoMeta?.coverUrl || scrapedData.imageUrl || scrapedData.thumbnailUrl;
                if (possibleImage) {
                    ogImage = possibleImage;
                    console.log('[SIFT] Using Scraper Image:', ogImage);
                }
            }
        } else {
            console.log('[SIFT] No Apify Token. Using mock data.');
            scrapedData = { caption: "Test Caption" };
        }

        // 2. Synthesize with OpenAI
        let content = "";
        let title = "Untitled Page";
        let summary = ""; // Empty default
        let tags: string[] = [];

        if (openai) {
            // ... (Existing OpenAI call logic)
            console.log('[SIFT] OpenAI Key present. Generating summary...');
            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: JSON.stringify(scrapedData) }
                ],
            });

            content = completion.choices[0].message.content || "";

            // Extract Title, Summary, Tags
            const titleMatch = content.match(/^#\s+(.+)$/m);
            if (titleMatch) title = titleMatch[1].trim();

            const summaryMatch = content.match(/>\s*(.+)/); // Simple blockquote match
            if (summaryMatch) summary = summaryMatch[1].trim();

            // Extract Tags: Tags: [Tag1, Tag2]
            const tagsLineMatch = content.match(/Tags:\s*\[(.*?)\]/);
            if (tagsLineMatch && tagsLineMatch[1]) {
                tags = tagsLineMatch[1].split(',').map(t => t.trim());
            }
        } else {
            // Mock
            content = "# Mock Page\n\n> This is a mock.";
            title = "Mock Page";
            summary = "This is a mock.";
            tags = ["Test", "Mock"];
        }

        // 3. Save to Supabase
        console.log('[SIFT] Saving to Supabase...');
        const { data, error } = await supabaseAdmin
            .from('pages')
            .insert({
                url,
                platform: platform || 'unknown',
                title,
                summary,
                content,
                tags,
                metadata: {
                    source: 'sift-api',
                    scraped_at: new Date().toISOString(),
                    image_url: ogImage // <--- Saved here
                }
            })
            .select()
            .single();

        if (error) {
            console.error('[SIFT] Supabase Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, page: data });

    } catch (error: unknown) {
        console.error('[SIFT] Internal Error:', error);
        // ... logging
        const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
