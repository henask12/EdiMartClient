/**
 * Turn an API product image URL into a browser-safe src.
 *
 * - Absolute CDN / S3 public URLs are left alone.
 * - API `/uploads/…` paths (relative or absolute) are rewritten to the
 *   same-origin `/api/media/…` proxy so images keep working after hosting
 *   when the web app and API live on different domains.
 * - Private proof paths are rejected (they must use signed URLs).
 */
export const productImageSrc = (
  imageUrl: string | null | undefined,
): string | null => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("/api/media/")) return imageUrl;

  const toMedia = (uploadPath: string): string | null => {
    const clean = uploadPath.startsWith("/") ? uploadPath : `/${uploadPath}`;
    if (
      clean.includes("..") ||
      clean.includes("/proofs/") ||
      clean.startsWith("/proofs/")
    ) {
      return null;
    }
    if (!clean.startsWith("/uploads/")) return null;
    return `/api/media${clean}`;
  };

  if (imageUrl.startsWith("/uploads/")) {
    return toMedia(imageUrl);
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    try {
      const u = new URL(imageUrl);
      if (u.pathname.startsWith("/uploads/")) {
        return toMedia(u.pathname);
      }
      // S3 / R2 / CDN public object URL
      return imageUrl;
    } catch {
      return imageUrl;
    }
  }

  return imageUrl;
};
