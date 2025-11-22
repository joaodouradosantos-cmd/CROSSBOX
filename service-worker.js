const CACHE_NAME = "crossfit-cache-v7"; 
// Sempre que fizeres uma alteração MUITO grande, podes subir para v8, v9... (opcional)

const URLS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./imagens/crossmoita_logo.png"
];

// INSTALAÇÃO — pré-cache básico e entra logo em ação
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting(); // novo SW entra logo sem esperar
});

// ATIVAÇÃO — limpa caches antigos e assume controlo das páginas abertas
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim(); // passa a controlar imediatamente todas as abas / apps
});

// FETCH —
// 1) Para navegação (index / app): NETWORK-FIRST (vai primeiro à net)
// 2) Para restantes ficheiros: cache primeiro, depois rede
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Pedidos de navegação (quando abres a app, mudas de dia, etc.)
  if (req.mode === "navigate" || (req.destination === "document")) {
    event.respondWith(
      fetch(req)
        .then(response => {
          // Se vier da net, guarda no cache a versão nova
          const resClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, resClone));
          return response;
        })
        .catch(() => {
          // Sem net? Usa o que estiver no cache
          return caches.match(req).then(cached => {
            // Se não houver essa navegação em cache, tenta pelo menos o index
            return cached || caches.match("./index.html");
          });
        })
    );
    return;
  }

  // Outros pedidos (imagens, manifest, etc.) — cache-first simples
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) {
        // atualiza em fundo
        fetch(req).then(response => {
          caches.open(CACHE_NAME).then(cache => cache.put(req, response));
        }).catch(() => {});
        return cached;
      }

      // se não estiver em cache, vai à net e guarda
      return fetch(req)
        .then(response => {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, resClone));
          return response;
        })
        .catch(() => {
          // último recurso: nada
          return new Response("Offline e sem cache disponível.", {
            status: 503,
            statusText: "Offline"
          });
        });
    })
  );
});
