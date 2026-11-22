/**
 * Client-side image compressor.
 * Resizes the image so the longest side is at most 1600 px and re-encodes
 * as JPEG quality 0.8 using an HTML canvas.
 * This also strips EXIF GPS and metadata.
 */
export async function compressImage(file: File | Blob): Promise<Blob> {
  if (typeof window === 'undefined') {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const maxDimension = 1600;
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.8
        );
      } catch (canvasErr) {
        console.warn('Canvas image compression failed, using original:', canvasErr);
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // Fallback: if decoding fails (e.g. HEIC on unsupported browser), return original
      resolve(file);
    };

    img.src = objectUrl;
  });
}
