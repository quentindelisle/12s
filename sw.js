const CACHE_NAME = 'relais-12s-v13';
const ASSETS = [
  './', './index.html', './manifest.json', './sw.js', './icon-square.png', './icon-192.png', './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  // Pas de skipWaiting() automatique ici : on laisse le nouveau Service Worker "en attente"
  // tant que la page ne lui a pas dit explicitement de prendre la main (voir message SKIP_WAITING
  // ci-dessous). Ça permet à l'appli d'afficher un bandeau "nouvelle version disponible" au lieu
  // de changer de version sous les pieds de l'utilisateur en pleine séance.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Stratégie "réseau d'abord" pour la page et le manifeste : garantit que toute mise à jour de
// l'appli est bien récupérée dès qu'une connexion est disponible, avec repli sur le cache
// (fonctionnement hors-ligne, ex. gymnase sans wifi). Les images/icônes restent "cache d'abord"
// pour rester rapides et stables une fois installées.
const NETWORK_FIRST_PATHS = ['/index.html', '/manifest.json', '/'];

function isNetworkFirst(url) {
  return NETWORK_FIRST_PATHS.some((p) => url.pathname === p || url.pathname.endsWith(p));
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate' || isNetworkFirst(url)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
