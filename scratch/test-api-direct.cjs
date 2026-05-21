const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Parse .env
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_EMAIL = 'tester.lumina@gmail.com';
const TEST_PASSWORD = 'TestPassword123!';
const LIVE_URL = 'https://lumina-jd-scanner.vercel.app';

const MOCK_JD = {
  title: "Senior Full Stack Engineer",
  skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "TailwindCSS"],
  description: "We are looking for a Senior Full Stack Engineer with 5+ years experience."
};

(async () => {
  // 1. Login and get session token
  console.log("Logging in to get JWT...");
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });
  if (signInError) { console.error("Login failed:", signInError.message); process.exit(1); }
  const token = signInData.session.access_token;
  console.log("JWT obtained. User:", signInData.user.id);

  // 2. Fetch vault data
  const { data: vaultItems } = await supabase.from('master_vault').select('*').eq('user_id', signInData.user.id);
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', signInData.user.id).single();
  
  const vault_data = { profile, items: vaultItems || [] };
  console.log("Vault items count:", vault_data.items.length);

  // 3. Call the API
  console.log("\nCalling /api/generate-roadmap on production...");
  const body = JSON.stringify({
    jd_data: MOCK_JD,
    vault_data,
    duration: "1 Year",
    jd_id: null
  });

  const fetch = (await import('node-fetch')).default;
  const response = await fetch(`${LIVE_URL}/api/generate-roadmap`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body
  });

  console.log("HTTP Status:", response.status);
  const rawText = await response.text();
  console.log("Raw Response (first 2000 chars):");
  console.log(rawText.slice(0, 2000));

  if (response.ok) {
    console.log("\n✅ API SUCCESS! Roadmap generated correctly.");
    try {
      const data = JSON.parse(rawText);
      console.log("Roadmap target_role:", data?.roadmap_data?.target_role);
      console.log("Timeline phases:", data?.roadmap_data?.timeline?.length);
    } catch(e) {}
  } else {
    console.log("\n❌ API FAILED with status", response.status);
  }
})();
