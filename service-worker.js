const CACHE = 'salon-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
  // agrega iconos y assets estáticos
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e=>{
  const url=new URL(e.request.url);
  if(e.request.method!=='GET') return;
  e.respondWith(
    caches.match(e.request).then(r=> r || fetch(e.request).then(res=>{
      // cache-first para vistas internas
      if(url.origin===location.origin){ const clone=res.clone(); caches.open(CACHE).then(c=>c.put(e.request,clone)); }
      return res;
    }).catch(()=> caches.match('./index.html')))
  );
});
