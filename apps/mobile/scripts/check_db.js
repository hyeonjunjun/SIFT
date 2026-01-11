const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://twgfzcjqqhabnuqsyhvp.supabase.co';
const supabaseKey = 'sb_publishable_p6uwBDhBGf4bItVnUNv4ow_-D9ik8LI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Checking Pages...");

    // 1. Check for ANY archived pages
    const { data: archived, error: archError } = await supabase
        .from('pages')
        .select('id, title, is_archived')
        .eq('is_archived', true);

    if (archError) console.error("Archive Check Error:", archError);
    else console.log(`Found ${archived.length} archived pages.`);

    if (archived && archived.length > 0) {
        console.log("Example Archived Page:", archived[0]);
    }

    // 2. Check for ANY non-archived pages
    const { data: active, error: activeError } = await supabase
        .from('pages')
        .select('id, title, is_archived')
        .eq('is_archived', false)
        .limit(3);

    if (activeError) console.error("Active Check Error:", activeError);
    else console.log(`Found ${active.length} active pages (sample).`);

    // 3. Check for NULL is_archived?
    const { data: nullArchived, error: nullError } = await supabase
        .from('pages')
        .select('id, title, is_archived')
        .is('is_archived', null);

    if (nullError) console.error("Null Check Error:", nullError);
    else console.log(`Found ${nullArchived.length} pages with NULL is_archived.`);
}

run();
