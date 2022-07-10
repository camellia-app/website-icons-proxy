import { getImageByUrl, ImageDownloadingError } from './imageLoader';

export const getFaviconIcoByDomain = async (domain: string): Promise<Blob | undefined> => {
  const faviconUrl = `https://${domain}/favicon.ico`;

  try {
    return await getImageByUrl(faviconUrl);
  } catch (error: unknown) {
    if (error instanceof ImageDownloadingError) {
      return undefined;
    }

    throw error;
  }
};
