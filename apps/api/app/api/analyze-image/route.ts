
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60;

const geminiKey = process.env.GEMINI_API_KEY || process.env.gemini;
const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;

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
        const { imageUrl } = await request.json();

        if (!imageUrl) {
            return NextResponse.json({ error: 'Image URL is required' }, { status: 400, headers: corsHeaders });
        }

        if (!genAI) {
            return NextResponse.json({ error: 'Gemini client not configured' }, { status: 500, headers: corsHeaders });
        }

        console.log(`[AnalyzeImage] Processing: ${imageUrl}`);

        // Fetch image and convert to base64 for Gemini
        const imgResp = await fetch(imageUrl);
        if (!imgResp.ok) {
            return NextResponse.json({ error: 'Failed to fetch image' }, { status: 400, headers: corsHeaders });
        }
        const buffer = Buffer.from(await imgResp.arrayBuffer());
        const base64 = buffer.toString('base64');

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash-preview-05-20',
            generationConfig: {
                responseMimeType: 'application/json',
            },
            systemInstruction: `You are an expert curator. Analyze the provided image and return a JSON object with these fields:
- "title": Catchy, accurate title (max 80 chars)
- "category": Best-fit from: Cooking, Tech, Design, Health, Fashion, News, or Random.
- "tags": 2-3 tags ONLY from: ["Cooking", "Baking", "Tech", "Health", "Lifestyle", "Professional", "Finance", "Design", "Travel", "Entertainment", "Science", "Shopping", "Fitness", "Beauty", "Education", "News", "DIY", "Parenting", "Music", "Photography", "Gaming", "Productivity", "Fashion", "Food"]. Use "Lifestyle" if no others fit.
- "summary": Markdown summary. Start with a 1-sentence synopsis, use ## headers. Be concise and cozy.
- "reading_time_minutes": Integer estimate (min 1).

Return ONLY the JSON object.`,
        });

        const result = await model.generateContent([
            { text: "Analyze this image and return the structured JSON." },
            { inlineData: { mimeType: 'image/jpeg', data: base64 } },
        ]);

        const responseText = result.response.text();
        const data = JSON.parse(responseText);

        console.log(`[AnalyzeImage] Success: ${data.title}`);

        return NextResponse.json({ status: 'success', data }, { headers: corsHeaders });

    } catch (error: any) {
        console.error('[AnalyzeImage] Error:', error.message);
        return NextResponse.json({ status: 'error', message: error.message }, { status: 500, headers: corsHeaders });
    }
}
