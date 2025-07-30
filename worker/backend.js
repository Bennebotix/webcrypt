const cacheName = "offline-backend-cache";
const assets = ["index.html", "portal.html"];
importScripts('./webcrypt.js');

self.new = true;


self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

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

self.addEventListener('message', async (event) => {
  const data = event.data;

  if (data.pass) {
    self.pass = data.pass;
    self.key = Webcrypt.genKey(self.pass);
    
    self.new = false;
  } else {
    const clientList = await clients.matchAll({ type: "window" });

    for (const client of clientList) {
      client.postMessage({ new: self.new });
    }
  }
});

async function handle(req, cache) {
  const url = new URL(req.url);
  
  if (req.method == "GET" && url.origin == location.origin && url.pathname.split("/")[1] == "data" && !self.new) {
    console.log("decryptResponse: ", req.url);
    let res =  await decrypt(req);
    if (res) {
      await cache.put(event.request, res.clone());
    }
    return res;
  } else {
    console.log("fetchResponse: ", req.url);
    return await fetch(req);
  }
}

async function decrypt(req) {
  const oldRes = await fetch(req, { redirect: "follow" });
  const enc = await oldRes.text();
  console.log(self.pass, self.key);
  const dec = await Webcrypt.decrypt(enc, self.key);

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

// Fetching resources
self.addEventListener("fetch", (event) => {
  event.respondWith(
    (async () => {
      const cache = await caches.open(cacheName);

      try {
        // const cachedResponse = await cache.match(event.request);
        // if (cachedResponse) {
        //   console.log("cachedResponse: ", event.request.url);
        //   return cachedResponse;
        // }

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
