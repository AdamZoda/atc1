import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey);

async function checkSettings() {
    const { data, error } = await supabase.from('settings').select('*').limit(10);
    console.log(JSON.stringify(data, null, 2));
    if (error) console.error(error);
}
checkSettings();
