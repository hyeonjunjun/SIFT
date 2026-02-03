const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllRecentSifts() {
    const { data: pages, error } = await supabase
        .from('pages')
        .select('created_at, url, title, metadata')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error fetching pages:', error);
        return;
    }

    console.log(`Checking latest 20 sifts across all users...`);
    pages.forEach((page, i) => {
        const status = page.metadata?.status || 'unknown';
        console.log(`${i + 1}. [${page.created_at}] [${status}] ${page.url.substring(0, 30)}... - ${page.title}`);
    });
}

checkAllRecentSifts();
