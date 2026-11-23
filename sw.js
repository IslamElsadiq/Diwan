const VERSION = 'diwan-v15-d34b91ac4459';
const CACHE = VERSION;
const ROOT = new URL('./', self.location).href;
const shell = ["./", "./index.html", "./assets/main-04239688.js", "./assets/main-94F2706F.css", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"];
const readyClients=new Set();
self.addEventListener('message',e=>{if(e.data?.type==='CONTROLLER_READY'&&e.source?.id)readyClients.add(e.source.id)});
self.addEventListener('install', e => {
 e.waitUntil(caches.open(CACHE).then(c => c.addAll(shell.map(p => new Request(new URL(p,ROOT),{cache:'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
 e.waitUntil((async()=>{
  const previous=(await caches.keys()).some(k=>k.startsWith('diwan-')&&k!==CACHE);
  await self.clients.claim();
  // Version 12 tabs have no controllerchange listener. Bring those legacy tabs
  // through the new network-first HTML once. New installs need no navigation.
  if(previous) {
   const oldClients=await self.clients.matchAll({type:'window'});
   for(const client of oldClients)client.postMessage({type:'VERSION_CHECK'});
   await new Promise(r=>setTimeout(r,750));
   for(const client of oldClients)if(client.url.startsWith(ROOT)&&!readyClients.has(client.id)) {
    const live=await self.clients.get(client.id);if(live)live.navigate(live.url).catch(()=>{});
   }
  }
 })());
});
self.addEventListener('fetch', e => {
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
 e.respondWith((async()=>{
  const cache=await caches.open(CACHE),url=new URL(e.request.url);
  const shellAsset=/\/assets\/main(?:-[A-Za-z0-9_-]+)?\.(?:js|css)$/.test(url.pathname);
  if(e.request.mode==='navigate'||shellAsset){
   try{
    const r=await fetch(new Request(e.request,{cache:'no-cache'}));
    if(r.ok){await cache.put(e.request.mode==='navigate'?new URL('./index.html',ROOT).href:e.request,r.clone());return r;}
    const saved=await cache.match(e.request.mode==='navigate'?new URL('./index.html',ROOT).href:e.request);return saved||r;
   }catch{
    return await cache.match(e.request.mode==='navigate'?new URL('./index.html',ROOT).href:e.request)||Response.error();
   }
  }
  const found=await cache.match(e.request);if(found)return found;
  const r=await fetch(e.request);if(r.ok)await cache.put(e.request,r.clone());return r;
 })());
});
self.addEventListener('message', e => {
 if(e.data?.type!=='CACHE_ALL')return;
 e.waitUntil((async()=>{
  const send=data=>e.source?.postMessage(data);
  try{
   const index=await fetch(new URL('./offline-assets.json',ROOT),{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error();return r.json()});
   const cache=await caches.open(CACHE);let done=0;
   for(const path of index.files){const url=new URL(path,ROOT).href;if(!(await cache.match(url))){const r=await fetch(url);if(!r.ok)throw Error();await cache.put(url,r)}done++;send({type:'OFFLINE_PROGRESS',done,total:index.files.length});}
   await cache.put(new URL('./offline-complete',ROOT),new Response('true'));send({type:'OFFLINE_DONE'});
  }catch{send({type:'OFFLINE_ERROR'})}
 })());
});
