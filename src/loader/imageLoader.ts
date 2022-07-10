import { Logger } from '../logger';

export class ImageDownloadingError extends Error {
  constructor(public readonly imageUrl: string) {
    super(`Image downloading error: ${imageUrl}`);
  }
}

export const getImageByUrl = async (url: string): Promise<Blob> => {
  Logger.httpRequest(url, 'GET');

  const response = await fetch(url, {
    cf: {
      cacheTtl: 60 * 60, // 1 hour
      cacheEverything: true,
    },
  });

  Logger.httpResponse(url, 'GET', response.status);

  if (response.status >= 300) {
    throw new ImageDownloadingError(url);
  }

  const contentType = response.headers.get('content-type');

  if (contentType !== null && !contentType.startsWith('image/')) {
    Logger.info('image_loader', `Downloaded file is not an image: ${url} (Content-Type: ${contentType})`);

    throw new ImageDownloadingError(url);
  }

  return await response.blob();
};
