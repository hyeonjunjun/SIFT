const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://twgfzcjqqhabnuqsyhvp.supabase.co';
const supabaseKey = 'sb_publishable_p6uwBDhBGf4bItVnUNv4ow_-D9ik8LI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    // 1. Get an active page
    const { data: pages } = await supabase
        .from('pages')
        .select('id, title')
        .eq('is_archived', false)
        .limit(1);

    if (!pages || pages.length === 0) {
        console.log("No active pages to test with.");
        return;
    }

    const page = pages[0];
    console.log(`Attempting to archive: ${page.title} (${page.id})`);

    // 2. Try to update
    const { data, error } = await supabase
        .from('pages')
        .update({ is_archived: true })
        .eq('id', page.id)
        .select();

    if (error) {
        console.error("Update FAILED:", error);
    } else {
        console.log("Update SUCCESS. Result:", data);

        // 3. Revert (optional, or leave it to verify in app)
        // Let's leave it so user can see if it appears in Archive now? 
        // Or better, revert it so we don't mess up their feed?
        // Let's leave it. If it works, it should show in Archive.
    }
}

run();
