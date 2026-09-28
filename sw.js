/* =========================
   PS OFFLINE CACHE
========================= */

const CACHE_NAME = "ps-media-v1";


/* =========================
   INSTALL
========================= */

self.addEventListener("install", event => {

  console.log("PS Service Worker installing");

  self.skipWaiting();

});


/* =========================
   ACTIVATE
========================= */

self.addEventListener("activate", event => {

  console.log("PS Service Worker activated");

  event.waitUntil(
    self.clients.claim()
  );

});


/* =========================
   FETCH
========================= */

self.addEventListener("fetch", event => {

  const request = event.request;

  /* Only handle GET requests */

  if(request.method !== "GET"){
    return;
  }


  const url = new URL(request.url);


  /*
     Only cache media from the PS
     GitHub promos folder.
  */

  const isPSMedia =
    url.href.startsWith(
      "https://totalmixcreative.github.io/graphics/promos/"
    );


  if(!isPSMedia){
    return;
  }


  /*
     Only cache image/video files.
  */

  const pathname =
    url.pathname.toLowerCase();

  const isMedia =
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".webp") ||
    pathname.endsWith(".gif") ||
    pathname.endsWith(".mp4") ||
    pathname.endsWith(".webm");


  if(!isMedia){
    return;
  }


  /*
     CACHE FIRST
  */

  event.respondWith(

    caches.open(CACHE_NAME)

      .then(async cache => {

        const cached =
          await cache.match(request);

        /*
           Already cached:
           use the local copy.
        */

        if(cached){

          console.log(
            "PS CACHE HIT:",
            url.pathname
          );

          return cached;

        }


        /*
           Not cached:
           download from GitHub.
        */

        console.log(
          "PS CACHE MISS:",
          url.pathname
        );


        try{

          const response =
            await fetch(request);


          /*
             Only cache successful
             responses.
          */

          if(response.ok){

            await cache.put(
              request,
              response.clone()
            );

            console.log(
              "PS CACHED:",
              url.pathname
            );

          }


          return response;

        }catch(error){

          console.log(
            "PS OFFLINE - media not cached:",
            url.pathname
          );

          throw error;

        }

      })

  );

});