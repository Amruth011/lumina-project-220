import fetch from 'node-fetch';

(async () => {
  const res = await fetch('https://lumina-jd-scanner-main.vercel.app/');
  const html = await res.text();
  
  const scripts = [...html.matchAll(/src="\/assets\/(.*?)"/g)].map(m => m[1]);
  console.log('Scripts linked in live index.html:');
  console.log(scripts);
})();
