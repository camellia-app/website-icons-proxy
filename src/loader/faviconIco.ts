import { getImageByUrl, ImageDownloadingError } from './imageLoader';

export const getFaviconIcoByDomain = async (domain: string): Promise<Blob | undefined> => {
  console.info(`Downloading favicon ICO by well-known URL for domain: ${domain}`);

  const faviconUrl = `https://${domain}/favicon.ico`;

  try {
    return getImageByUrl(faviconUrl);
  } catch (error: unknown) {
    if (error instanceof ImageDownloadingError) {
      return undefined;
    }

    throw error;
  }
};
