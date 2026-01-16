// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { image_url } = await req.json()

    if (!image_url) {
      throw new Error('Image URL is required')
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
    if (!OPENAI_API_KEY) {
      throw new Error('Missing OPENAI_API_KEY')
    }

    // Call OpenAI with Vision
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert curator for a digital "sifting" app. 
            Analyze the image and generate 2-4 stylistic tags.
            Allowed tags (mix of functional and aesthetic):
            [Interior, Furniture, Tech, Fashion, Design, Typography, Art, Architecture, Nature, Minimal, Vintage, DIY]
            
            Return JSON only: { "tags": ["tag1", "tag2"] }`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Tag this image.' },
              { type: 'image_url', image_url: { url: image_url } }
            ]
          }
        ],
        response_format: { type: "json_object" }
      }),
    })

    const aiData = await response.json()
    const content = JSON.parse(aiData.choices[0].message.content)

    return new Response(
      JSON.stringify(content),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/ai-tagger' \
    --header 'Authorization: Bearer eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYxLTIxZDgtNGYyZS1iNzE5LWMyMjQwYTg0MGQ5MCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjIwODM4OTQ3NDB9.nMH9tY9a5lY9ufmDAZA3eFLWKLfBhfQ3NWbrXjwuAl2Wx5HmY4CESQ0cF1w2BTAZHpplgwQf4RrS0UiPLzJGug' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
