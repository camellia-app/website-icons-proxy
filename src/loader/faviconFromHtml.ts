import { parse } from 'node-html-parser';
import { Logger } from '../logger';
import { getImageByUrl, ImageDownloadingError } from './imageLoader';

export const getLargestFaviconFromFromHtml = async (domain: string): Promise<Blob | undefined> => {
  const htmlUrl = `https://${domain}/`;

  Logger.startHttpRequest(htmlUrl, 'GET');

  const response = await fetch(htmlUrl, {
    cf: {
      cacheTtl: 60 * 60, // 1 hour
      cacheEverything: true,
    },
  });

  Logger.finishHttpRequest(htmlUrl, 'GET', response.status);

  if (response.status >= 300) {
    return undefined;
  }

  const favicons = (await extractIcons(response))
    .sort((faviconA, faviconB) => {
      const getComparableFaviconSize = (favicon: Favicon): number => {
        if (favicon.size !== undefined) {
          return Math.max(favicon.size.width, favicon.size.height);
        }

        if (favicon.mimeType === 'image/svg+xml') {
          return Infinity;
        }

        return 0;
      };

      const faviconSizeA = getComparableFaviconSize(faviconA);
      const faviconSizeB = getComparableFaviconSize(faviconB);

      return faviconSizeB - faviconSizeA;
    })
    .map((favicon) => favicon.url);

  for (const favicon of favicons) {
    try {
      return await getImageByUrl(favicon);
    } catch (error: unknown) {
      if (error instanceof ImageDownloadingError) {
        continue;
      }

      throw error;
    }
  }

  return undefined;
};

type Resolution = { height: number; width: number };
type Favicon = { mimeType: string | undefined; size: Resolution | undefined; url: string };

const extractIcons = async (response: Response): Promise<Array<Favicon>> => {
  const root = parse(await response.text());

  return root
    .querySelectorAll('head > link[rel~=icon]')
    .map((element): Favicon | undefined => {
      const href = element.getAttribute('href');
      const sizes = element.getAttribute('sizes');
      const type = element.getAttribute('type');

      if (href === undefined) {
        return undefined;
      }

      const absoluteHref = normalizeHref(response.url, href);

      Logger.info(
        'favicon_from_html',
        `Found icon with URL: ${absoluteHref} (type: ${type ?? '???'}, sizes: ${sizes ?? '???'})`,
      );

      return {
        url: absoluteHref,
        mimeType: type?.trim(),
        size: sizes !== undefined ? getResolutionFromSizesAttribute(sizes) : undefined,
      };
    })
    .filter((favicon): favicon is Favicon => favicon !== undefined);
};

/**
 * @see https://html.spec.whatwg.org/multipage/links.html#rel-icon
 */
const getResolutionFromSizesAttribute = (sizes: string): Resolution | undefined => {
  const resolutions = sizes
    .trim()
    .split(' ')
    .map((sizeString): Resolution | undefined => {
      if (sizeString === 'any') {
        return {
          width: Infinity,
          height: Infinity,
        };
      }

      // different cases may be used: e.g. 16x16 and 16X16
      const [widthString, heightString] = sizeString.split(/x/i, 2);

      if (widthString === undefined || heightString === undefined) {
        return undefined;
      }

      // leading zeroes are not allowed according to the spec
      if (widthString.startsWith('0') || heightString.startsWith('0')) {
        return undefined;
      }

      const width = parseInt(widthString, 10);
      const height = parseInt(heightString, 10);

      if (isNaN(width) || isNaN(height)) {
        return undefined;
      }

      return {
        width: width,
        height: height,
      };
    })
    .filter((resolution): resolution is Resolution => resolution !== undefined)
    .sort(
      (resolutionA, resolutionB) =>
        Math.max(resolutionB.width, resolutionB.height) - Math.max(resolutionA.width, resolutionA.height),
    );

  return resolutions[0];
};

const normalizeHref = (originUrl: string, href: string): string => {
  let absoluteHref = href.trim();

  // fix link if it starts with relative protocol (://)
  if (absoluteHref.startsWith('://')) {
    absoluteHref = 'https' + absoluteHref;
  }

  // fix link if its relative
  if (!absoluteHref.startsWith('http://') && !absoluteHref.startsWith('https://')) {
    const currentUrl = new URL(originUrl);
    currentUrl.pathname = absoluteHref;

    absoluteHref = currentUrl.toString();
  }

  return absoluteHref;
};
