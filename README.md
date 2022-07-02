# Website Icons Proxy

This repository contains [Cloudflare Worker](https://workers.cloudflare.com) that proxies favicons from websites. Cloudflare Workers are like serverless cloud functions, but they also can cache stuff in Cloudflare CDN to make things faster.

If you are not familiar with Cloudflare Workers, visit [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/). Or you can just press the button instead:

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/camellia-app/website-icons-proxy)

## Usage example

Currently, the worker exposes only one endpoint that returns favicon of requested domain:

```html
<img src="https://your-domain.workers.dev/favicon?domain=google.com" />
```

## Endpoints

### `/favicon`

Returns the largest favicon associated with passed domain.

What it does under the hood:

1. It sends request to `https://{domain}/` to receive HTML of the index page.
2. Then, it looks for `head > link[rel~=icon]` elements to find all favicon elements.
3. It downloads all icons sequentially from largest to smallest. When first valid icon found, it returned as response.
4. As fallback, if some previous step failed, request will be sent to `https://{domain}/favicon.ico`.
