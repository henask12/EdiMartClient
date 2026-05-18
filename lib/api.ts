export const productImageSrc = (imageUrl: string | null | undefined) => {
  if (!imageUrl) {
    return null;
  }
  if (imageUrl.startsWith("http")) {
    return imageUrl;
  }
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000";
  return `${base.replace(/\/$/, "")}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;
};
