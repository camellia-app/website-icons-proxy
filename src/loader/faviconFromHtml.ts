import { parse } from 'node-html-parser';
import { getImageByUrl, ImageDownloadingError } from './imageLoader';

export const getLargestFaviconFromFromHtml = async (domain: string): Promise<Blob | undefined> => {
  const htmlUrl = `https://${domain}/`;

  console.info(`Downloading HTML document to find links to favicons: ${htmlUrl}`);

  const response = await fetch(htmlUrl, {
    cf: {
      cacheTtl: 60 * 60, // 1 hour
      cacheEverything: true,
    },
  });

  if (response.status >= 300) {
    console.info(`Could not load HTML document: ${htmlUrl} (status code: ${response.status})`);

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

type Favicon = { mimeType: string | undefined; size: { height: number; width: number } | undefined; url: string };

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

      let resolution = undefined;

      if (sizes !== undefined) {
        const [widthString, heightString] = sizes.trim().split('x');

        const width = widthString === undefined ? NaN : parseInt(widthString, 10);
        const height = heightString === undefined ? NaN : parseInt(heightString, 10);

        if (!isNaN(width) && !isNaN(height)) {
          resolution = {
            width: width,
            height: height,
          };
        }
      }

      let absoluteHref = href.trim();

      // fix link if it starts with relative protocol (://)
      if (absoluteHref.startsWith('://')) {
        absoluteHref = 'https' + absoluteHref;
      }

      // fix link if its relative
      if (!absoluteHref.startsWith('http://') && !absoluteHref.startsWith('https://')) {
        const currentUrl = new URL(response.url);
        currentUrl.pathname = absoluteHref;

        absoluteHref = currentUrl.toString();
      }

      console.info(`Found icon with URL: ${absoluteHref} (type: ${type ?? '???'}, size: ${sizes ?? '???'})`);

      return {
        url: absoluteHref,
        mimeType: type?.trim(),
        size: resolution,
      };
    })
    .filter((favicon): favicon is Favicon => favicon !== undefined);
};
