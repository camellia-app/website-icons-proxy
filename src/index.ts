import { handleRequest } from './handler'

addEventListener('fetch', (event) => {
  event.respondWith(handleCacheableRequest(event))
})

const handleCacheableRequest = async (event: FetchEvent) => {
  const requestUrl = new URL(event.request.url);

  // Construct the cache key from the cache URL
  const cacheKey = new Request(requestUrl.toString(), event.request)
  const cache = caches.default

  // Check whether the value is already available in the cache
  // if not, you will need to fetch it from origin, and store it in the cache
  // for future access
  let cachedResponse = await cache.match(cacheKey)

  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await handleRequest(event.request);

  response.headers.append("Cache-Control", "public, max-age=86400")

  event.waitUntil(cache.put(cacheKey, response.clone()));

  return response;
}
