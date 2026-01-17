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

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    console.log("Testing insert into Supabase...");
    const { data, error } = await supabase
        .from('pages')
        .insert({
            url: 'https://example.com/test-sift',
            title: 'Test Sift ' + new Date().toISOString(),
            summary: 'This is a test summary from a script.',
            content: 'Test content',
            tags: ['Test'],
            metadata: { source: 'test-script' }
        })
        .select()
        .single();

    if (error) {
        console.error("❌ Insert Failed:", error.message);
    } else {
        console.log("✅ Insert Success! ID:", data.id);
    }
}

testInsert();
