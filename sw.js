/* =========================
   PS OFFLINE CACHE
========================= */

const CACHE_NAME = "ps-media-v1";

self.addEventListener("install", event => {

  console.log("PS Service Worker installing");

  self.skipWaiting();

});


self.addEventListener("activate", event => {

  console.log("PS Service Worker activated");

  event.waitUntil(
    self.clients.claim()
  );

});


self.addEventListener("fetch", event => {

  const request = event.request;

  /*
     Only handle GET requests.
  */

  if(request.method !== "GET"){
    return;
  }

  /*
     For now, pass everything through.

     The actual media caching will be
     added in the next step.
  */

  event.respondWith(
    fetch(request)
  );

});