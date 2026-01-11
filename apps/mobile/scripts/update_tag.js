const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://twgfzcjqqhabnuqsyhvp.supabase.co';
// Note: This is an anon key, so it respects RLS. If RLS blocks updates, this might fail.
// But the app uses this key for everything, so it should be fine if policies allow.
const supabaseKey = 'sb_publishable_p6uwBDhBGf4bItVnUNv4ow_-D9ik8LI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Looking for Shawarma...");
    const { data: pages, error } = await supabase
        .from('pages')
        .select('*')
        .ilike('title', '%shawarma%');

    if (error) {
        console.error("Search Error:", error);
        return;
    }

    if (!pages || pages.length === 0) {
        console.log("No shawarma page found.");
        return;
    }

    const page = pages[0];
    console.log(`Found: ${page.title} (${page.id})`);

    const { error: updateError } = await supabase
        .from('pages')
        .update({ tags: ['Cooking'] })
        .eq('id', page.id);

    if (updateError) {
        console.error("Update Error:", updateError);
    } else {
        console.log("Success! Updated tags to ['Cooking'].");
    }
}

run();
