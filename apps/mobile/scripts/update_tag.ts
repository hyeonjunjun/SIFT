
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    // 1. Find the page
    const { data: pages } = await supabase
        .from('pages')
        .select('*')
        .ilike('title', '%shawarma%');

    if (!pages || pages.length === 0) {
        console.log("No shawarma page found.");
        return;
    }

    const page = pages[0];
    console.log(`Found page: ${page.title} (${page.id})`);

    // 2. Update tags
    const { error } = await supabase
        .from('pages')
        .update({ tags: ['Cooking'] })
        .eq('id', page.id);

    if (error) {
        console.error("Error updating:", error);
    } else {
        console.log("Success! Updated tags to ['Cooking'].");
    }
}

run();
