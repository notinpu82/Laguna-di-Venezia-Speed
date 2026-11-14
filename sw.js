// Service worker dell'app Laguna di Venezia.
// Con la rete si prende sempre la versione più nuova; senza rete si usa la copia salvata.
// Cambiare VERSIONE se vuoi forzare la pulizia della copia salvata.
const VERSIONE = "laguna-v1";
const GUSCIO = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSIONE).then(function (cache) {
    return Promise.all(GUSCIO.map(function (u) { return cache.add(u).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (nomi) {
    return Promise.all(nomi.filter(function (n) { return n !== VERSIONE; }).map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  const req = e.request;
  if (req.method !== "GET") { return; }
  const url = new URL(req.url);

  // Librerie esterne (Leaflet): prima la copia salvata, poi la rete
  if (url.hostname === "unpkg.com") {
    e.respondWith(caches.match(req).then(function (trovata) {
      if (trovata) { return trovata; }
      return fetch(req).then(function (risp) {
        const copia = risp.clone();
        caches.open(VERSIONE).then(function (cache) { cache.put(req, copia); });
        return risp;
      });
    }));
    return;
  }

  // Tutto ciò che è del sito (app, marea, icone): prima la rete, poi la copia salvata se sei senza rete
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(req, { cache: "no-store" }).then(function (risp) {
      if (risp && risp.ok) {
        const copia = risp.clone();
        caches.open(VERSIONE).then(function (cache) { cache.put(req, copia); });
      }
      return risp;
    }).catch(function () {
      return caches.match(req).then(function (trovata) {
        return trovata || (req.mode === "navigate" ? caches.match("index.html") : Response.error());
      });
    }));
  }
  // Mappe, vento e meteo (altri siti) non passano di qui: le gestisce il browser.
});
