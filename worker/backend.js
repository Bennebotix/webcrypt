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

async function testFetch(req) {
  const res = await fetch(req, { redirect: "follow" });

  console.log("Status:", res.status);
  console.log("Type:", res.type); // opaque / cors / basic
  console.log("Headers:", [...res.headers.entries()]);

  const buffer = await res.arrayBuffer();
  console.log("Byte length:", buffer.byteLength);

  const text = new TextDecoder().decode(buffer);
  console.log("Text version:", text);  // In case it's HTML or error message
}
  
  testFetch()

async function decrypt(req) {
  // await testFetch(req);
  const oldRes = await fetch(req, { redirect: "follow" });
  const enc = await oldRes.text();
  console.log(enc);
  const dec = await Webcrypt.decrypt(enc, self.key);

  return new Response(dec, {
    headers: req.headers,
    ok: req.ok,
    redirected: req.redirected,
    status: req.status,
    statusText: req.statusText,
    type: req.type,
    url: req.url
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
