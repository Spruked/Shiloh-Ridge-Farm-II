const CACHE_NAME = "shiloh-snap-v1";
const CAPTURE_DB_NAME = "shiloh-mobile-capture";
const CAPTURE_DB_VERSION = 1;
const PENDING_STORE = "pending_uploads";
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = ["/", "/offline.html", "/manifest.json", "/logo192.png", "/logo512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key)),
    )),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return cache.match(OFFLINE_URL);
      }),
    );
    return;
  }

  if (new URL(request.url).origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request)),
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SYNC_PENDING_CAPTURES") {
    event.waitUntil(syncPendingCaptures());
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-pending-captures") {
    event.waitUntil(syncPendingCaptures());
  }
});

function openCaptureDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CAPTURE_DB_NAME, CAPTURE_DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PENDING_STORE)) {
        database.createObjectStore(PENDING_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getPendingCaptures() {
  const database = await openCaptureDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PENDING_STORE, "readonly");
    const store = transaction.objectStore(PENDING_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function deletePendingCapture(id) {
  const database = await openCaptureDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PENDING_STORE, "readwrite");
    transaction.objectStore(PENDING_STORE).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(",");
  const mime = parts[0].match(/data:(.*?);base64/)?.[1] || "image/jpeg";
  const binary = atob(parts[1]);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mime });
}

async function uploadPendingCapture(record) {
  if (!record?.backendUrl || !record?.authToken) {
    throw new Error("Capture is missing backend credentials");
  }

  const formData = new FormData();
  formData.append("image", dataUrlToBlob(record.imageDataUrl), `${record.id}.jpg`);

  if (record.gps?.lat != null) {
    formData.append("gps_lat", String(record.gps.lat));
  }

  if (record.gps?.lon != null) {
    formData.append("gps_lon", String(record.gps.lon));
  }

  if (record.voiceNote) {
    formData.append("voice_note", record.voiceNote);
  }

  const response = await fetch(`${record.backendUrl}/api/capture/process`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${record.authToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`);
  }

  return response.json();
}

async function notifyClients(uploadedCount, remaining) {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  clients.forEach((client) => {
    client.postMessage({
      type: "SYNC_COMPLETE",
      uploadedCount,
      remaining,
    });
  });
}

async function syncPendingCaptures() {
  const records = await getPendingCaptures();
  let uploadedCount = 0;

  for (const record of records) {
    try {
      await uploadPendingCapture(record);
      await deletePendingCapture(record.id);
      uploadedCount += 1;
    } catch (error) {
      // Leave failed captures queued for a later retry.
    }
  }

  const remaining = (await getPendingCaptures()).length;
  await notifyClients(uploadedCount, remaining);
}
