const DEFAULT_API = "http://127.0.0.1:4000";

export const getApiBase = () => {
  const raw =
    process.env.API_INTERNAL_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    process.env.PUBLIC_API_URL?.trim() ||
    DEFAULT_API;
  return raw.replace(/\/$/, "");
};

export const isProductionDeploy = () =>
  Boolean(process.env.VERCEL) || process.env.NODE_ENV === "production";

export const assertApiConfigured = (): string | null => {
  const base = getApiBase();
  if (
    isProductionDeploy() &&
    (base === DEFAULT_API || base.includes("127.0.0.1") || base.includes("localhost"))
  ) {
    return "API_INTERNAL_URL is not set on Vercel. Set it to https://edimartapi-1.onrender.com and redeploy.";
  }
  return null;
};

export const upstreamFetch = async (path: string, init?: RequestInit) => {
  const configError = assertApiConfigured();
  if (configError) {
    throw new Error(configError);
  }
  const url = `${getApiBase()}${path.startsWith("/") ? path : `/${path}`}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        "API request timed out. If the API is on Render free tier, wait for it to wake up and try again.",
      );
    }
    throw new Error(
      `Cannot reach API at ${getApiBase()}. Check API_INTERNAL_URL on Vercel and that the Render service is running.`,
    );
  } finally {
    clearTimeout(timeout);
  }
};
