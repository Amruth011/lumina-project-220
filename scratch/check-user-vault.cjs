const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  try {
    console.log("Logging in as tester.lumina@gmail.com...");
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'tester.lumina@gmail.com',
      password: 'TestPassword123!'
    });
    
    if (signInError) throw signInError;
    const userId = signInData.user.id;
    console.log("Logged in! User ID:", userId);
    
    console.log("Querying master_vault items for user...");
    const { data: vaultData, error: vaultError } = await supabase
      .from('master_vault')
      .select('*');
      
    if (vaultError) throw vaultError;
    
    console.log(`Found ${vaultData.length} items in master_vault:`);
    vaultData.forEach((item, index) => {
      console.log(`[${index + 1}] Title: ${item.title}, Type: ${item.type}, UserID: ${item.user_id}`);
    });
    
  } catch (err) {
    console.error("Error:", err.message);
  }
})();
