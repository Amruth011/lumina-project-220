const env = require('fs').readFileSync('.env', 'utf8');
const keyMatch = env.match(/GROQ_API_KEY\s*=\s*"([^"]+)"/);
const apiKey = keyMatch ? keyMatch[1] : null;

if (!apiKey) {
  console.error("GROQ_API_KEY not found in .env");
  process.exit(1);
}

fetch('https://api.groq.com/openai/v1/models', {
  headers: {
    'Authorization': `Bearer ${apiKey}`
  }
})
.then(res => res.json())
.then(data => {
  console.log("Groq Models:");
  if (data.data) {
    data.data.forEach(m => console.log(`- ${m.id} (owned by ${m.owned_by})`));
  } else {
    console.log(data);
  }
})
.catch(err => {
  console.error(err);
});
