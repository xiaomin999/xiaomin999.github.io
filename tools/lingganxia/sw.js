// 灵感匣 · Service Worker（离线缓存应用外壳）
const CACHE = "linggan-v5";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./config.js",
  "./vendor/supabase.js",
  "./icon.svg",
  "./manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // 只处理 GET；Supabase API 走网络，不缓存
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.includes("supabase.co")) return;

  // 导航请求：离线时回退到缓存的 index.html
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // 静态资源：缓存优先
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});
