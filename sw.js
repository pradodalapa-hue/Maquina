
/* ==========================================================
    HELENA PDV - SW.JS (SERVICE WORKER & CACHE MASTER)
    Soberania Digital Industrial - JDP - v10.0
   ========================================================== */

const CACHE_NAME = 'helena-pdv-matrix-v10.0';

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './dbjs.js',
    './cerebro.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

// Canal de comunicação postMessage para sincronização do cérebro em tempo real
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SYNC_DATABASE') {
        const database = event.data.data;
        event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => {
                const response = new Response(JSON.stringify(database, null, 2), {
                    headers: { 'Content-Type': 'application/json' }
                });
                return cache.put('./cerebro.json', response);
            })
        );
    }
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (url.pathname.endsWith('/cerebro.json')) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                const fallbackData = {
                    "produtos": [
                        { "nome": "CARNE NA CHAPA", "quantidade": 100, "valor": 35.00, "vendas": 0 },
                        { "nome": "HAMBURGUER", "quantidade": 100, "valor": 25.00, "vendas": 0 }
                    ],
                    "transacoes": []
                };
                return new Response(JSON.stringify(fallbackData, null, 2), {
                    headers: { 'Content-Type': 'application/json' }
                });
            })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                }
                return networkResponse;
            }).catch(() => {
                return caches.match('./index.html');
            });
        })
    );
});
