import Toucan from 'toucan-js';
import { getLargestFaviconFromFromHtml } from './loader/faviconFromHtml';
import { getFaviconIcoByDomain } from './loader/faviconIco';

export type Env = {
  APP_VERSION: string;
  ENVIRONMENT_NAME: string;
  SENTRY_DSN: string;
};

export default {
  async fetch(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
    const sentry = new Toucan({
      dsn: env.SENTRY_DSN,
      release: env.APP_VERSION,
      environment: env.ENVIRONMENT_NAME,
      context,
      request,
      allowedCookies: /(.*)/,
      allowedHeaders: /(.*)/,
      allowedSearchParams: /(.*)/,
    });

    const clientIp = request.headers.get('cf-connecting-ip');

    if (clientIp !== null) {
      sentry.setUser({
        ip_address: clientIp,
      });
    }

    const requestUrl = new URL(request.url);

    try {
      switch (requestUrl.pathname) {
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
