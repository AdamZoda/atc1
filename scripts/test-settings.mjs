import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jurvkrrhvohlsbbyokln.supabase.co';
const supabaseKey = 'sb_publishable_1KYACvK2CA47P2YWlz19dg_leWo6t-0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSettings() {
    const { data, error } = await supabase.from('settings').select('*').limit(10);
    console.log(JSON.stringify(data, null, 2));
    if (error) console.error(error);
}
checkSettings();
