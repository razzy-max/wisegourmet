const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;
const LARGE_FILE_THRESHOLD_BYTES = 500 * 1024;
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

  // A PNG can be several MB even at modest dimensions, since PNG is lossless and
  // compresses photographic detail poorly - that's a format problem, not a dimension
  // problem, so it must be checked independently of the size-in-pixels check below.
  const isLargeFile = file.size > LARGE_FILE_THRESHOLD_BYTES;

  try {
    const img = await loadImage(rawDataUrl);
    const isLargeDimensions = img.width > MAX_DIMENSION || img.height > MAX_DIMENSION;

    if (!isLargeDimensions && !isLargeFile) {
      return rawDataUrl;
    }

    const scale = isLargeDimensions ? MAX_DIMENSION / Math.max(img.width, img.height) : 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Re-encoding as JPEG is what actually shrinks a bloated PNG photo; menu/promo photos
    // are real-world images, not graphics that depend on transparency, so this is safe.
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
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
