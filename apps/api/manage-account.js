const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function manageAccount() {
    const userId = "96abac6c-000c-4b62-a87c-2d87c062a27c";
    console.log(`\n--- Managing Account for User ID: ${userId} ---`);

    // 1. Update Tier to Unlimited
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ tier: 'unlimited' })
        .eq('id', userId);

    if (updateError) {
        console.error('Error updating tier:', updateError);
    } else {
        console.log('Tier updated to: unlimited');
    }

    // 2. Find and Remove Duplicate Sifts
    console.log(`\n--- Scanning for duplicate sifts ---`);
    const { data: sifts, error: siftsError } = await supabase
        .from('pages')
        .select('id, url, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (siftsError) {
        console.error('Error fetching sifts:', siftsError);
        return;
    }

    const seenUrls = new Set();
    const duplicates = [];

    sifts.forEach(sift => {
        // Normalize URL (remove trailing slash)
        const normalizedUrl = sift.url.replace(/\/$/, "");
        if (seenUrls.has(normalizedUrl)) {
            duplicates.push(sift.id);
        } else {
            seenUrls.add(normalizedUrl);
        }
    });

    console.log(`Found ${duplicates.length} duplicate(s).`);

    if (duplicates.length > 0) {
        const { error: deleteError } = await supabase
            .from('pages')
            .delete()
            .in('id', duplicates);

        if (deleteError) {
            console.error('Error deleting duplicates:', deleteError);
        } else {
            console.log(`Successfully deleted ${duplicates.length} duplicate sifts.`);
        }
    }
}

manageAccount();
