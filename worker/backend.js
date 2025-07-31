const cacheName = "offline-backend-cache";
const assets = [];
importScripts('./webcrypt.js');

self.new = true;


self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("install", async (event) => {
  self.skipWaiting();
  cache
  
  try {
    self.pass = "";
    self.key = await Webcrypt.genRandKey();
    
    const cache = await caches.open(cacheName);
    await cache.addAll(assets);
  } catch (error) {
    console.error("Service Worker installation failed:", error);
  }
});

self.addEventListener('message', async (event) => {
  self.pass = event.data.pass;
  self.key = await Webcrypt.genKey(self.pass);
  
  self.new = false;
});

async function handle(req, cache) {
  const url = new URL(req.url);
  
  if (req.method == "GET" && url.origin == location.origin && !self.new) {
    console.log("decryptResponse: ", req.url);
    let res =  await decrypt(req);
    if (res) {
      await cache.put(req, res.clone());
    }
    return res;
  } else {
    console.log("fetchResponse: ", req.url);
    return await fetch(req);
  }
}

async function decrypt(req) {
  let newReq = req.clone();
  newReq.url = new URL(newReq.url);
  newReq.url.pathname = "/data" + newReq.url.pathname;
  newReq.url = newReq.url.href;
  const oldRes = await fetch(newReq, { redirect: "follow" });
  const enc = await oldRes.text();
  const dec = (new TextDecoder).decode(await Webcrypt.decrypt(enc, self.key));

  return new Response(dec, {
    headers: oldRes.headers,
    ok: oldRes.ok,
    redirected: oldRes.redirected,
    status: oldRes.status,
    statusText: oldRes.statusText,
    type: oldRes.type,
    url: oldRes.url
  });
}

self.addEventListener("fetch", (event) => {
  event.respondWith(
    (async () => {
      const cache = await caches.open(cacheName);

      try {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse && !self.new) {
          console.log("cachedResponse: ", event.request.url);
          return cachedResponse;
        }

        const fetchResponse = await handle(event.request, cache);
        if (fetchResponse) {
          return fetchResponse;
        }
      } catch (error) {
        console.log("Fetch failed: ", error);
      }
    })()
  );
});
