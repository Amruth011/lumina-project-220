import fetch from 'node-fetch';

(async () => {
  const targetUrl = 'https://lumina-jd-scanner-main.vercel.app/assets/Dashboard-Cr1f0iYI.js';
  const res = await fetch(targetUrl);
  if (!res.ok) {
    console.log('Failed to fetch:', res.status, res.statusText);
    return;
  }
  const text = await res.text();
  const lines = text.split('\n');
  if (lines.length >= 242) {
    const line = lines[241];
    const index = 371;
    console.log('Context around col 371:');
    console.log(line.substring(Math.max(0, index - 100), index + 100));
  } else {
    console.log('File only has', lines.length, 'lines.');
  }
})();
