
import { createClient } from '@supabase/supabase-js';

// Environment variables should be loaded or passed in. 
// For this script, we'll ask user to provide them or check a local env file.
// Ideally, use the same config as the app if accessible, but this is a standalone script.

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "YOUR_SUPABASE_URL";
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "YOUR_SUPABASE_KEY";

if (SUPABASE_URL === "YOUR_SUPABASE_URL") {
    console.error("Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkHealth() {
    console.log("🏥 Running Asset Anchor Health Check...");

    const { data, error } = await supabase
        .from('sifts') // Assuming table name is 'sifts' or 'pages'? App uses 'pages'.
        .select('id, title, image_url')
        .or('image_url.ilike.%fbcdn%,image_url.ilike.%instagram%');

    if (error) {
        // Retry with 'pages' if 'sifts' failed
        if (error.code === '42P01') { // Undefined table
            console.log("Table 'sifts' not found, trying 'pages'...");
            const { data: pagesData, error: pagesError } = await supabase
                .from('pages')
                .select('id, title, image_url') // metadata? App uses metadata for image_url
                .or('image_url.ilike.%fbcdn%,image_url.ilike.%instagram%');

            if (pagesError) {
                console.error("Error querying 'pages':", pagesError);
                return;
            }
            reportResults(pagesData);
            return;
        }
        console.error("Error querying Supabase:", error);
        return;
    }

    reportResults(data);
}

function reportResults(data: any[] | null) {
    if (data && data.length > 0) {
        console.log(`❌ FAILED: Found ${data.length} records with temporary URLs.`);
        data.forEach(row => {
            console.log(`   - ID: ${row.id}, Title: ${row.title?.substring(0, 20)}..., URL: ${row.image_url?.substring(0, 30)}...`);
        });
        console.log("ACTION REQUIRED: These images will expire. Run re-hosting logic.");
    } else {
        console.log("✅ SUCCESS: No temporary URLs found. Asset Anchor is holding.");
    }
}

checkHealth();
