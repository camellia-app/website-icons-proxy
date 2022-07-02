/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/cloudflare-worker.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/cloudflare-worker.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import { getLargestFaviconFromFromHtml } from './loader/faviconFromHtml';
import { getFaviconIcoByDomain } from './loader/faviconIco';

export type Env = {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
};

export default {
  async fetch(request: Request): Promise<Response> {
    const requestUrl = new URL(request.url);

    switch (requestUrl.pathname) {
      case '/favicon': {
        const domain = requestUrl.searchParams.get('domain');

        if (domain === null) {
          return missingRequiredParameterResponse('domain');
        }

        return processFaviconLoading(domain);
      }

      default:
        return endpointNotFoundResponse();
    }
  },
};

const apiProblemResponse = (
  status: number,
  description: string,
  type: string,
  additionalProperties?: { [key: string]: unknown },
): Response => {
  return new Response(
    JSON.stringify({
      status: status,
      type: type,
      detail: description,
      ...additionalProperties,
    }),
    {
      status: status,
      headers: {
        'content-type': 'application/problem+json; charset=UTF-8',
      },
    },
  );
};

const missingRequiredParameterResponse = (parameterName: string): Response => {
  return apiProblemResponse(400, `Missing required query-parameter: ${parameterName}`, 'missing_required_parameter');
};

const websiteIconLoadingErrorResponse = (): Response => {
  return apiProblemResponse(404, `Could not load website icon for unknown reason.`, 'website_icon_loading_error');
};

const endpointNotFoundResponse = (): Response => {
  return apiProblemResponse(404, `The requested URL does not exist.`, 'endpoint_not_found');
};

const internalServerErrorResponse = (): Response => {
  return apiProblemResponse(500, `Something went wrong.`, 'internal_server_error');
};

const processFaviconLoading = async (domain: string): Promise<Response> => {
  try {
    let favicon = await getLargestFaviconFromFromHtml(domain);

    if (favicon === undefined) {
      favicon = await getFaviconIcoByDomain(domain);
    }

    if (favicon === undefined) {
      return websiteIconLoadingErrorResponse();
    }

    return new Response(favicon, {
      headers: {
        'Cache-Control': 'public, max-age=1209600', // 14 days
      },
    });
  } catch (error: unknown) {
    return internalServerErrorResponse();
  }
};
