import Toucan from 'toucan-js';
import { getLargestFaviconFromFromHtml } from './loader/faviconFromHtml';
import { getFaviconIcoByDomain } from './loader/faviconIco';

declare const APP_VERSION: string;
declare const ENVIRONMENT_NAME: string;
declare const SENTRY_DSN: string;

addEventListener('fetch', (event) => {
  const sentry = new Toucan({
    dsn: SENTRY_DSN,
    release: APP_VERSION,
    environment: ENVIRONMENT_NAME,
    context: event,
    allowedCookies: /(.*)/,
    allowedHeaders: /(.*)/,
    allowedSearchParams: /(.*)/,
    rewriteFrames: {
      root: '/',
    },
  });

  const request = event.request;

  const clientIp = request.headers.get('cf-connecting-ip');

  if (clientIp !== null) {
    sentry.setUser({
      ip_address: clientIp,
    });
  }

  event.respondWith(
    (async (): Promise<Response> => {
      const requestUrl = new URL(request.url);

      try {
        switch (requestUrl.pathname) {
          case '/':
            return healthAction(APP_VERSION);

          case '/favicon':
            return await faviconAction(request);

          default:
            return endpointNotFoundResponse();
        }
      } catch (error: unknown) {
        sentry.captureException(error);

        console.error(error);

        return internalServerErrorResponse();
      }
    })(),
  );
});

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
};
