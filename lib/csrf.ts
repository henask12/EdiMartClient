import type { NextRequest } from "next/server";

const MUTATING = new Set(["POST", "PATCH", "PUT", "DELETE"]);

const hostFromUrl = (value: string | null): string | null => {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
};

const allowedHosts = (req: NextRequest): Set<string> => {
  const hosts = new Set<string>([req.nextUrl.host]);
  const extras = [
    process.env.WEB_ORIGIN,
    process.env.NEXT_PUBLIC_WEB_ORIGIN,
  ].filter(Boolean) as string[];
  for (const raw of extras) {
    for (const part of raw.split(",")) {
      const host = hostFromUrl(part.trim());
      if (host) hosts.add(host);
    }
  }
  return hosts;
};

/**
 * SameSite cookie + Origin/Referer host check for mutating proxy/login calls.
 * Missing Origin is allowed when Referer matches, or when both are absent
 * (same-site navigations / non-browser clients that cannot forge cookies cross-site).
 */
export const csrfOriginAllowed = (req: NextRequest): boolean => {
  if (!MUTATING.has(req.method.toUpperCase())) return true;

  const allowed = allowedHosts(req);
  const originHost = hostFromUrl(req.headers.get("origin"));
  if (originHost) return allowed.has(originHost);

  const refererHost = hostFromUrl(req.headers.get("referer"));
  if (refererHost) return allowed.has(refererHost);

  return true;
};
