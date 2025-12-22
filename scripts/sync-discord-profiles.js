/*
Node script to sync Discord display names from auth users into the `profiles` table.
Requires SUPABASE_URL and SUPABASE_SERVICE_KEY as environment variables.
Run with: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/sync-discord-profiles.js
*/

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables before running.');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

async function listAllUsers() {
  const users = [];
  let page = 1;
  while (true) {
    // admin.listUsers is available in supabase-js v2 as auth.admin.listUsers
    const res = await (supabaseAdmin.auth.admin as any).listUsers({ perPage: 100, page });
    if (res.error) throw res.error;
    const batch = res.data?.users || res.data || [];
    users.push(...batch);
    // pagination handling
    if (!res.data || (res.data.page && res.data.page >= res.data.total_pages)) break;
    if (batch.length === 0) break;
    page++;
  }
  return users;
}

async function run() {
  try {
    console.log('Fetching users...');
    const users = await listAllUsers();
    console.log('Found', users.length, 'users');

    for (const u of users) {
      try {
        const identities = u.identities || u.raw_user_meta_data?.identities || u.user_metadata?.identities;
        let idata = null;
        if (Array.isArray(identities)) idata = identities.find((x) => x.provider === 'discord')?.identity_data;
        else if (identities && identities.identity_data) idata = identities.identity_data;

        let username = u.email || u.id;
        let avatar_url = null;
        if (idata) {
          username = idata.username ? `${idata.username}${idata.discriminator ? '#' + idata.discriminator : ''}` : username;
          if (idata.avatar) avatar_url = `https://cdn.discordapp.com/avatars/${idata.id}/${idata.avatar}.png`;
        }

        const upsert = await supabaseAdmin.from('profiles').upsert({ id: u.id, username, avatar_url });
        if (upsert.error) console.warn('Upsert error for', u.id, upsert.error.message);
        else console.log('Upserted', u.id, username);
      } catch (e) {
        console.error('User loop error', e);
      }
    }

    console.log('Done.');
  } catch (err) {
    console.error('Error running sync script:', err);
  }
}

run();
