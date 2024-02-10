import { Logger } from '../logger';

export class ImageDownloadingError extends Error {
  constructor(public readonly imageUrl: string, public readonly reason: string) {
    super(`Image downloading error: ${imageUrl} (reason: ${reason})`);
  }
}

export const getImageByUrl = async (url: string): Promise<Blob> => {
  Logger.httpRequest(url, 'GET');

  let response: Response;

  try {
    response = await fetch(url, {
      cf: {
        cacheEverything: true,
        cacheTtl: 60 * 60, // 1 hour
      },
    });
  } catch (error: unknown) {
    if (error instanceof TypeError) {
      Logger.httpNetworkError(url, 'GET', error);

      throw new ImageDownloadingError(url, `Network error: ${error.message}`);
    }

    throw error;
  }

  Logger.httpResponse(url, 'GET', response.status);

  if (response.status >= 300) {
    throw new ImageDownloadingError(url, `${response.status} is not valid response status code`);
  }

  const contentType = response.headers.get('content-type');

  if (contentType !== null && !contentType.startsWith('image/')) {
    Logger.info('image_loader', `Downloaded file is not an image: ${url} (Content-Type: ${contentType})`);

    throw new ImageDownloadingError(url, `${contentType} is not valid Content-Type value`);
  }

  return await response.blob();
};
