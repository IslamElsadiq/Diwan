const VERSION = 'diwan-v10-328873dd8980';
const CACHE = VERSION;
const ROOT = new URL('./', self.location).href;
const shell = ['./', './index.html', './assets/main.js', './assets/main.css', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(shell.map(p => new URL(p, ROOT).href))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if(e.request.mode === 'navigate') {
      try { const r = await fetch(e.request); if(r.ok) await cache.put(new URL('./index.html', ROOT).href, r.clone()); return r; }
      catch { return await cache.match(new URL('./index.html', ROOT).href) || Response.error(); }
    }
    const found = await cache.match(e.request); if(found) return found;
    const response = await fetch(e.request); if(response.ok) await cache.put(e.request, response.clone()); return response;
  })());
});
self.addEventListener('message', e => {
 if(e.data?.type !== 'CACHE_ALL') return;
 e.waitUntil((async () => {
  const send = data => e.source?.postMessage(data);
  try {
   const index = await fetch(new URL('./offline-assets.json', ROOT)).then(r => {if(!r.ok) throw Error();return r.json();});
   const cache = await caches.open(CACHE); let done = 0;
   for(const path of index.files) {
    const url = new URL(path, ROOT).href;
    if(!(await cache.match(url))) { const r = await fetch(url); if(!r.ok) throw Error(); await cache.put(url, r); }
    done++; send({type:'OFFLINE_PROGRESS',done,total:index.files.length});
   }
   await cache.put(new URL('./offline-complete',ROOT),new Response('true'));
   send({type:'OFFLINE_DONE'});
  } catch { send({type:'OFFLINE_ERROR'}); }
 })());
});
