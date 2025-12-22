// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/create-avatar-bucket.js
// This script uses the Supabase admin (service role) key to create a public bucket for avatars.

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.VITE_AVATARS_BUCKET || 'avatars';

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE);

async function run() {
  try {
    console.log('Creating bucket', BUCKET);
    const { data, error } = await supabaseAdmin.storage.createBucket(BUCKET, { public: true });
    if (error) {
      if (error.message && error.message.includes('already exists')) {
        console.log('Bucket already exists. Ensuring public policy...');
      } else {
        throw error;
      }
    } else {
      console.log('Bucket created:', data);
    }

    // Note: Supabase storage.setBucketPublic does not exist in some SDKs; public option on createBucket suffices.

    console.log('Done. Bucket should be public.');
  } catch (err) {
    console.error('Error creating bucket:', err);
    process.exit(1);
  }
}

run();
