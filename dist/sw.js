// Simple Service Worker to silence any network requests containing "placeholder"
// by returning a tiny transparent PNG with long cache headers.

const TRANSPARENT_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';

function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Intercept anything that looks like a placeholder asset
  if (/placeholder/i.test(url.pathname)) {
    const body = base64ToUint8Array(TRANSPARENT_PNG_BASE64);
    const headers = new Headers({
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable'
    });
    event.respondWith(new Response(body, { status: 200, headers }));
  }
});
