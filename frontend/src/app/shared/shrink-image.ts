const MAX_DIMENSION = 2400;
const MIN_SIZE_TO_SHRINK = 1_000_000;
const SHRINKABLE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Scales a large photo down to at most 2400px on its longest side and re-encodes it as JPEG.
 * That keeps an A4 page readable while turning a 5–10 MB phone photo into a few hundred KB.
 * Anything that cannot be shrunk (PDFs, small files, unsupported browsers) is returned unchanged.
 */
export async function shrinkImage(file: File): Promise<File> {
  if (!SHRINKABLE_TYPES.includes(file.type) || file.size < MIN_SIZE_TO_SHRINK) return file;
  try {
    const bitmap = await createImageBitmap(file); // applies the EXIF rotation of phone photos
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.fillStyle = '#fff'; // transparent screenshots would otherwise turn black
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85),
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]*$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
