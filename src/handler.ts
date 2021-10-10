export async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (!url.searchParams.has('domain')) {
    return new Response(JSON.stringify({
      type: 'validation_error',
      detail: 'Missing required parameter: "domain".'
    }), {
      status: 400,
    });
  }

  const domain = url.searchParams.get('domain');

  let faviconBaseUrl: URL;

  try {
    faviconBaseUrl = new URL(`https://${domain}`);
  } catch (_) {
    return new Response(JSON.stringify({
      type: 'validation_error',
      detail: 'Parameter "domain" contains invalid domain name.'
    }), {
      status: 400,
    });
  }

  let response: Response;

  try {
    response = await fetch(`${faviconBaseUrl.toString()}/favicon.ico`);
  } catch (_) {
    return new Response(JSON.stringify({
      type: 'favicon_fetching_error',
      detail: 'Could not to fetch a favicon for unknown network-related reason.'
    }), {
      status: 502,
    });
  }

  return new Response(await response.blob())
}
