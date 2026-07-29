const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;
const RESIZABLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });

const loadImage = (dataUrl) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });

async function shrinkImageIfNeeded(file, rawDataUrl) {
  if (!RESIZABLE_TYPES.has(file.type)) {
    return rawDataUrl;
  }

  try {
    const img = await loadImage(rawDataUrl);
    if (img.width <= MAX_DIMENSION && img.height <= MAX_DIMENSION) {
      return rawDataUrl;
    }

    const scale = MAX_DIMENSION / Math.max(img.width, img.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Keep PNG lossless (preserves transparency); compress everything else as JPEG.
    return file.type === 'image/png'
      ? canvas.toDataURL('image/png')
      : canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  } catch {
    return rawDataUrl;
  }
}

export function filesToAttachments(fileList = []) {
  const files = Array.from(fileList || []);

  return Promise.all(
    files.map(async (file) => {
      const rawDataUrl = await readAsDataUrl(file);
      const dataUrl = await shrinkImageIfNeeded(file, rawDataUrl);

      return {
        fileName: file.name,
        fileType: file.type,
        dataUrl,
      };
    })
  );
}
