const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function readEnv(filePath) {
  const env = {};
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const raw of lines) {
    if (!raw || raw.trim().startsWith('#')) continue;
    const idx = raw.indexOf('=');
    if (idx < 0) continue;
    const key = raw.slice(0, idx).trim();
    let value = raw.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

async function main() {
  const targetEmail = process.argv[2] || 'barmannabanshu@gmail.com';
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local not found in project root');
  }

  const env = readEnv(envPath);
  const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const usersResp = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersResp.error) throw usersResp.error;

  const user = (usersResp.data.users || []).find((u) => typeof u.email === 'string' && u.email.toLowerCase() === targetEmail.toLowerCase());
  if (!user) {
    throw new Error(`User ${targetEmail} not found in auth users`);
  }

  const profileResp = await supabase
    .from('user_profiles')
    .upsert(
      {
        user_id: user.id,
        subscription_status: 'active',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select('user_id, subscription_status')
    .single();

  if (profileResp.error) throw profileResp.error;

  console.log(`Pro unlocked for ${targetEmail}`);
  console.log(JSON.stringify(profileResp.data));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
