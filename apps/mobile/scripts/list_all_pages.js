const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://twgfzcjqqhabnuqsyhvp.supabase.co';
const supabaseKey = 'sb_publishable_p6uwBDhBGf4bItVnUNv4ow_-D9ik8LI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: pages, error } = await supabase
        .from('pages')
        .select('id, title, url, tags')
        .eq('is_archived', false);

    if (error) {
        console.error("Error:", error);
        return;
    }

    fs.writeFileSync('pages.json', JSON.stringify(pages, null, 2));
    console.log("Wrote pages.json");
}

run();
