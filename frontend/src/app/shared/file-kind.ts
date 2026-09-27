/** Image types every browser can display inline. */
const PREVIEWABLE_IMAGES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function isPreviewableImage(contentType: string): boolean {
  return PREVIEWABLE_IMAGES.includes(contentType);
}

/** Short label for a file that has no image preview, e.g. "PDF" or "HEIC". */
export function fileLabel(filename: string, contentType: string): string {
  if (contentType === 'application/pdf') return 'PDF';
  const extension = filename.split('.').pop();
  return extension && extension !== filename ? extension.toUpperCase() : 'FILE';
}
