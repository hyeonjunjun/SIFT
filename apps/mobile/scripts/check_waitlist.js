const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://twgfzcjqqhabnuqsyhvp.supabase.co';
const supabaseKey = 'sb_publishable_p6uwBDhBGf4bItVnUNv4ow_-D9ik8LI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWaitlist() {
    const { data, error } = await supabase
        .from('waitlist')
        .select('*');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Waitlist entries:', data);
    }
}

checkWaitlist();
