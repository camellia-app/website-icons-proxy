import { Toucan } from 'toucan-js';

import { getLargestFaviconFromFromHtml } from './loader/faviconFromHtml';
import { getFaviconIcoByDomain } from './loader/faviconIco';
import { Logger } from './logger';

export type Env = {
  APP_VERSION: string;
  ENVIRONMENT_NAME: string;
  SENTRY_DSN: string;
};

export default {
  async fetch(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
    const sentry = new Toucan({
      context,
      dsn: env.SENTRY_DSN,
      environment: env.ENVIRONMENT_NAME,
      release: env.APP_VERSION,
      request,
      requestDataOptions: {
        allowedCookies: true,
        allowedHeaders: true,
        allowedIps: true,
        allowedSearchParams: true,
      },
    });

    sentry.startSession();

    Logger.setSentryClient(sentry);

    const cache = caches.default;

    const requestUrl = new URL(request.url);

    try {
      switch (requestUrl.pathname) {
        case '/':
          return healthAction(env.APP_VERSION);

        case '/favicon': {
          const cacheUrl = new URL(request.url);
          const cacheKey = new Request(cacheUrl.toString(), request);

          let response = await cache.match(cacheKey);

          if (response === undefined) {
            response = await faviconAction(request);

            context.waitUntil(cache.put(cacheKey, response.clone()));
          }

          return response;
        }

        default:
          return endpointNotFoundResponse();
      }
    } catch (error: unknown) {
      sentry.captureException(error);

      return internalServerErrorResponse();
    } finally {
      sentry.captureSession(true);
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
      detail: description,
      status: status,
      type: type,
      ...additionalProperties,
    }),
    {
      headers: {
        'content-type': 'application/problem+json; charset=UTF-8',
      },
      status: status,
    },
  );
};

const healthAction = (appVersion: string): Response => {
  return new Response(
    JSON.stringify({
      releaseId: appVersion,
      status: 'pass',
    }),
    {
      headers: {
        'Content-Type': 'application/health+json; charset=UTF-8',
      },
    },
  );
};

const faviconAction = async (request: Request): Promise<Response> => {
  const requestUrl = new URL(request.url);

  const domain = requestUrl.searchParams.get('domain');

  if (domain === null) {
    return missingRequiredParameterResponse('domain');
  }

  return await processFaviconLoading(domain);
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
  let favicon = await getLargestFaviconFromFromHtml(domain);

  if (favicon === undefined) {
    Logger.info(
      'worker',
      'Could not get any valid favicon from HTML response, falling back to well-known URL where ICO image may be stored.',
    );

    favicon = await getFaviconIcoByDomain(domain);
  }

  if (favicon === undefined) {
    return websiteIconLoadingErrorResponse();
  }

  const browserCacheTtl = 60 * 60 * 12; // 12h
  const cdnCacheTtl = 60 * 60 * 12; // 12h

  return new Response(favicon, {
    headers: {
      'Cache-Control': `public, max-age=${browserCacheTtl}, s-maxage=${cdnCacheTtl}`,
    },
  });
};
