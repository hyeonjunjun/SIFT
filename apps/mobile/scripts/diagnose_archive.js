const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://twgfzcjqqhabnuqsyhvp.supabase.co';
const supabaseKey = 'sb_publishable_p6uwBDhBGf4bItVnUNv4ow_-D9ik8LI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    // 1. Create a dummy test page
    console.log("Creating dummy page...");
    const { data: newPage, error: createError } = await supabase
        .from('pages')
        .insert({
            title: 'Archive Test',
            url: 'http://test.com',
            summary: 'Testing archive',
            created_at: new Date().toISOString(),
            is_archived: false // Explicitly set false
        })
        .select()
        .single();

    if (createError) {
        console.error("Create Create Failed:", createError);
        return;
    }
    console.log("Created:", newPage);

    // 2. Read it back
    console.log("Reading back...");
    const { data: readBack } = await supabase.from('pages').select('*').eq('id', newPage.id).single();
    console.log("Read Back:", readBack);

    // 3. Update TAGS (Control Test)
    console.log("Updating Tags...");
    const { error: tagError } = await supabase
        .from('pages')
        .update({ tags: ['TestTag'] })
        .eq('id', newPage.id);

    if (tagError) console.error("Tag Update Failed:", tagError);
    else console.log("Tag Update Success (No error returned).");

    // 4. Update IS_ARCHIVED
    console.log("Updating Archive Status...");
    const { data: archData, error: archError } = await supabase
        .from('pages')
        .update({ is_archived: true })
        .eq('id', newPage.id)
        .select(); // Select to see if we get it back

    if (archError) console.error("Archive Update Failed:", archError);
    else console.log("Archive Update Result:", archData);

    // 5. Final Verify
    const { data: final } = await supabase.from('pages').select('*').eq('id', newPage.id).maybeSingle();
    console.log("Final State:", final);

    // Cleanup
    // await supabase.from('pages').delete().eq('id', newPage.id);
}

run();
