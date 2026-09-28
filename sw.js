/* =========================
   PS OFFLINE CACHE
========================= */

const CACHE_NAME = "ps-media-v2";


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

    caches.keys()

      .then(cacheNames => {

        return Promise.all(

          cacheNames

            .filter(name =>
              name.startsWith("ps-media-") &&
              name !== CACHE_NAME
            )

            .map(name =>
              caches.delete(name)
            )

        );

      })

      .then(() => {

        return self.clients.claim();

      })

  );

});


/* =========================
   RANGE RESPONSE
========================= */

async function createRangeResponse(
  response,
  rangeHeader
){

  const buffer =
    await response.arrayBuffer();


  const total =
    buffer.byteLength;


  /*
     Read a standard single
     byte range:

     bytes=0-999
     bytes=1000-
     bytes=-500
  */

  const match =
    rangeHeader.match(
      /bytes=(\d*)-(\d*)/
    );


  if(!match){

    return response;

  }


  let start =
    match[1]
      ? parseInt(match[1], 10)
      : 0;


  let end =
    match[2]
      ? parseInt(match[2], 10)
      : total - 1;


  /*
     Suffix range:

     bytes=-500

     means the final 500 bytes.
  */

  if(!match[1]){

    const suffixLength =
      parseInt(match[2], 10);

    start =
      Math.max(
        total - suffixLength,
        0
      );

  }


  /*
     Clamp the end of the range.
  */

  end =
    Math.min(
      end,
      total - 1
    );


  /*
     Invalid range.
  */

  if(
    start < 0 ||
    start >= total ||
    start > end
  ){

    return new Response(
      null,
      {
        status: 416,

        headers: {
          "Content-Range":
            `bytes */${total}`
        }

      }
    );

  }


  /*
     Extract the requested
     section of the video.
  */

  const chunk =
    buffer.slice(
      start,
      end + 1
    );


  /*
     Build the response expected
     by the video element.
  */

  const headers =
    new Headers();


  const contentType =
    response.headers.get(
      "Content-Type"
    );


  if(contentType){

    headers.set(
      "Content-Type",
      contentType
    );

  }


  headers.set(
    "Content-Length",
    String(chunk.byteLength)
  );


  headers.set(
    "Content-Range",
    `bytes ${start}-${end}/${total}`
  );


  headers.set(
    "Accept-Ranges",
    "bytes"
  );


  return new Response(
    chunk,
    {
      status: 206,

      statusText:
        "Partial Content",

      headers

    }
  );

}


/* =========================
   FETCH
========================= */

self.addEventListener(
  "fetch",
  event => {

    const request =
      event.request;


    /*
       Only handle GET requests.
    */

    if(
      request.method !== "GET"
    ){

      return;

    }


    const url =
      new URL(
        request.url
      );


    /*
       Only handle media from
       the PS GitHub promos folder.
    */

    const isPSMedia =
      url.href.startsWith(
        "https://totalmixcreative.github.io/graphics/promos/"
      );


    if(!isPSMedia){

      return;

    }


    /*
       Only handle image/video files.
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
       Is this a video?
    */

    const isVideo =
      pathname.endsWith(".mp4") ||
      pathname.endsWith(".webm");


    /*
       Is Chrome asking for a
       specific byte range?
    */

    const rangeHeader =
      request.headers.get(
        "Range"
      );


    event.respondWith(

      caches.open(
        CACHE_NAME
      )

      .then(async cache => {

        /*
           =================================
           VIDEO
           =================================
        */

        if(isVideo){

          /*
             Always use a normal,
             non-range request as the
             cache key.
          */

          const fullRequest =
            new Request(
              request.url,
              {
                method: "GET"
              }
            );


          /*
             Look for the complete
             video in the cache.
          */

          const cached =
            await cache.match(
              fullRequest
            );


          if(cached){

            console.log(
              "PS VIDEO CACHE HIT:",
              url.pathname
            );


            /*
               Chrome asked for a range,
               so return that section
               from the cached video.
            */

            if(rangeHeader){

              return createRangeResponse(
                cached,
                rangeHeader
              );

            }


            return cached;

          }


          /*
             Video isn't cached yet.

             Fetch the COMPLETE video,
             deliberately without the
             browser's Range header.
          */

          console.log(
            "PS VIDEO CACHE MISS:",
            url.pathname
          );


          try{

            const response =
              await fetch(
                fullRequest
              );


            if(response.ok){

              /*
                 Store the complete
                 200 response.
              */

              await cache.put(
                fullRequest,
                response.clone()
              );


              console.log(
                "PS VIDEO CACHED:",
                url.pathname
              );


              /*
                 Chrome originally asked
                 for a range, so give it
                 the correct 206 response.
              */

              if(rangeHeader){

                return createRangeResponse(
                  response,
                  rangeHeader
                );

              }

            }


            return response;

          }catch(error){

            console.log(
              "PS OFFLINE - video not cached:",
              url.pathname
            );


            throw error;

          }

        }


        /*
           =================================
           IMAGES
           =================================
        */

        const cached =
          await cache.match(
            request
          );


        if(cached){

          console.log(
            "PS CACHE HIT:",
            url.pathname
          );


          return cached;

        }


        /*
           Image isn't cached yet.
        */

        console.log(
          "PS CACHE MISS:",
          url.pathname
        );


        try{

          const response =
            await fetch(
              request
            );


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

  }
);