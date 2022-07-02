export class ImageDownloadingError extends Error {
  constructor(public readonly imageUrl: string) {
    super(`Image downloading error: ${imageUrl}`);
  }
}

export const getImageByUrl = async (url: string): Promise<Blob> => {
  console.info(`Loading image by URL: ${url}`);

  const response = await fetch(url, {
    cf: {
      cacheTtl: 60 * 60, // 1 hour
      cacheEverything: true,
    },
  });

  if (response.status >= 300) {
    console.info(`Could not load image by URL: ${url} (${response.status} ${response.statusText})`);

    throw new ImageDownloadingError(url);
  }

  return response.blob();
};
