const cacheName = "offline-backend-cache";
const assets = ["index.html"];
importScripts('../webcrypt.js');

self.new = true;


self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await clients.claim();

      await tellClients();
    })()
  );
});

async function tellClients() {
  const clientList = await clients.matchAll({ type: "window" });

  for (const client of clientList) {
    client.postMessage({ new: self.new });
  }

  self.new = false;
}

self.addEventListener("install", async (event) => {
  self.skipWaiting();
  
  try {
    self.pass = "";
    self.key = Webcrypt.genRandKey();
    
    const cache = await caches.open(cacheName);
    await cache.addAll(assets);
  } catch (error) {
    console.error("Service Worker installation failed:", error);
  }
});

self.addEventListener('message', event => {
  let data = event.data;
  
  if (data.pass) {
    self.pass = data.pass;
    self.key = Webcrypt.genKey(self.pass);
  } else {
    event.waitUntil(tellClients());
  }
});

async function handle(req, cache) {
  if (req.method == "GET" && req.mode == "same-origin" && pass !== "") {
    let res =  await decrypt(req);
    if (res) {
      await cache.put(event.request, fetchResponse.clone());
    }
    return res;
  } else {
    return await fetch(req);
  }
}

async function decrypt(req) {
  const oldRes = await fetch(req);
  const buffer = await oldRes.arrayBuffer();
  const enc = new Uint8Array(buffer);
  const dec = await Webcrypt.decrypt(enc, self.key);
  
  // Optional: Convert decrypted bytes to string if it's UTF-8 encoded text
  const decoder = new TextDecoder();
  const text = decoder.decode(decrypted);
}

// Fetching resources
self.addEventListener("fetch", (event) => {
  event.respondWith(
    (async () => {
      const cache = await caches.open(cacheName);

      try {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          console.log("cachedResponse: ", event.request.url);
          return cachedResponse;
        }

        const fetchResponse = await handle(event.request, cache);
        if (fetchResponse) {
          console.log("fetchResponse: ", event.request.url);
          return fetchResponse;
        }
      } catch (error) {
        console.log("Fetch failed: ", error);
        const cachedResponse = await cache.match("index.html");
        return cachedResponse;
      }
    })()
  );
});
