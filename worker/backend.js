const cacheName = "offline-backend-cache";
const assets = [];
importScripts('./webcrypt.js');

self.new = true;


self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("install", async (event) => {
  self.skipWaiting();
  
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
  let url = new URL(req.url);
  url.pathname = "/data" + url.pathname;
  
  console.log("decryptResponse: ", url.href);
  
  const oldRes = await fetch(url.href, { redirect: "follow" });
  const contentType = oldRes.headers.get("Content-Type") || "";

  const enc = await oldRes.text();
  const decArrayBuffer = await Webcrypt.decrypt(enc, self.key);

  let body;
  if (contentType.startsWith("text/")) {
    body = new TextDecoder().decode(decArrayBuffer);
  } else {
    body = decArrayBuffer;
  }

  return new Response(body, {
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
        // const cachedResponse = await cache.match(event.request);
        // if (cachedResponse && !self.new) {
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
