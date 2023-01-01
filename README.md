# Website Icons Proxy

This repository contains [Cloudflare Worker](https://workers.cloudflare.com) that proxies favicons from websites.

Cloudflare Workers are like serverless cloud functions, but they also can cache stuff in Cloudflare CDN to make things faster. If you are not familiar with Cloudflare Workers, visit [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/). Or you can just press the button instead:

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

1. It sends request to `https://{domain}/` to receive HTML of the index page. It may follow redirects if needed.
2. Then, it looks for `head > link[rel~=icon]` elements to find all favicon links.
3. It downloads all icons sequentially from largest to smallest until successful download. It prioritizes favicons by `sizes` and `type` attributes.
4. As fallback, if some previous step failed, request will be sent to `https://{domain}/favicon.ico`.

## Developing the worker

Clone the repository. Then, install dependencies:

```bash
npm ci
```

Start webpack:

```bash
webpack watch
```

Open another terminal and then run the worker in development mode:

```bash
wrangler dev
```
