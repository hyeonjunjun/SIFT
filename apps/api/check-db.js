const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentPages() {
    console.log("Checking recent pages in Supabase...");
    const { data, error } = await supabase
        .from('pages')
        .select('id, title, url, user_id, created_at, tags, summary')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error fetching pages:", error.message);
        return;
    }

    if (data.length === 0) {
        console.log("No pages found in the database.");
    } else {
        data.forEach(page => {
            console.log(`- [${page.created_at}] ID: ${page.id}`);
            console.log(`  Title: ${page.title}`);
            console.log(`  User: ${page.user_id}`);
            console.log(`  Tags: ${JSON.stringify(page.tags)}`);
            console.log(`  Summary: ${page.summary?.substring(0, 50)}...`);
            console.log('---');
        });
    }
}

checkRecentPages();
