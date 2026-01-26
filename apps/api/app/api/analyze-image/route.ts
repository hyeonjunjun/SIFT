
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const maxDuration = 60; // Allow enough time for vision analysis

const openai = (process.env.OPENAI_API_KEY || process.env.open_ai)
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY || process.env.open_ai })
    : null;

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

        if (!openai) {
            return NextResponse.json({ error: 'OpenAI client not configured' }, { status: 500, headers: corsHeaders });
        }

        console.log(`[AnalyzeImage] Processing: ${imageUrl}`);

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are an expert curator. Analyze the provided image and return a JSON object with a title, category, tags, and summary.
                    
                    **CATEGORIES:** Cooking, Tech, Design, Health, Fashion, News, or Random.
                    **TAGGING RULES:** Select 2-3 tags ONLY from: ["Cooking", "Baking", "Tech", "Health", "Lifestyle", "Professional"]. Use "Lifestyle" if no others fit.
                    
                    **MARKDOWN SUMMARY:** 
                    - Start with a 1-sentence synopsis.
                    - Use ## headers.
                    - Be concise and cozy.
                    
                    Return ONLY a JSON object.`
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Analyze this image and return the structured JSON." },
                        {
                            type: "image_url",
                            image_url: {
                                "url": imageUrl,
                            },
                        },
                    ],
                },
            ],
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(response.choices[0].message.content || "{}");
        console.log(`[AnalyzeImage] Success: ${result.title}`);

        return NextResponse.json({ status: 'success', data: result }, { headers: corsHeaders });

    } catch (error: any) {
        console.error('[AnalyzeImage] Error:', error.message);
        return NextResponse.json({ status: 'error', message: error.message }, { status: 500, headers: corsHeaders });
    }
}
