/* Patrimon — Service Worker
   App shell em cache (offline) + bibliotecas CDN cacheadas após 1º uso. */
'use strict';
const VERSAO = 'patrimon-v5';        // ↑ mude ao publicar nova versão
const CACHE_APP = VERSAO + '-app';
const CACHE_CDN = VERSAO + '-cdn';
const SHELL = ['./patrimon.html','./config.js','./manifest.webmanifest','./logo.png',
  './icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png','./favicon.ico','./favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_APP).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => !k.startsWith(VERSAO)).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // Firestore/Auth: sempre rede (o SDK tem cache offline próprio)
  if (url.hostname.endsWith('googleapis.com')) return;

  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request, { ignoreSearch: true }).then(hit => {
        const rede = fetch(e.request).then(resp => {
          if (resp && resp.ok) caches.open(CACHE_APP).then(c => c.put(e.request, resp.clone()));
          return resp;
        }).catch(() => hit);
        return hit || rede;
      })
    );
    return;
  }
  const cdns = ['cdnjs.cloudflare.com','cdn.jsdelivr.net','tessdata.projectnaptha.com','www.gstatic.com'];
  if (cdns.includes(url.hostname)) {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(resp => {
        if (resp && (resp.ok || resp.type === 'opaque')) caches.open(CACHE_CDN).then(c => c.put(e.request, resp.clone()));
        return resp;
      }))
    );
  }
});
