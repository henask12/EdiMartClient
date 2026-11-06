import { NextResponse, type NextRequest } from "next/server";

/**
 * Same-origin proxy for public product images.
 * Browser → `/api/media/uploads/products/…` → API `/uploads/products/…`
 * so photos keep working when the web app and API are on different hosts,
 * and next/image does not need every API hostname allowlisted.
 */
const apiBase = () =>
  (process.env.API_INTERNAL_URL ?? "http://127.0.0.1:4000").replace(/\/$/, "");

const isAllowedUploadPath = (joined: string) => {
  if (!joined.startsWith("uploads/")) return false;
  if (joined.includes("..") || joined.includes("\\") || joined.includes("\0")) {
    return false;
  }
  // Payment proofs stay private (signed /files URLs only).
  if (joined.startsWith("uploads/proofs/") || joined.includes("/proofs/")) {
    return false;
  }
  return true;
};

export const GET = async (
  _req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) => {
  const { path } = await ctx.params;
  if (!path?.length) {
    return new NextResponse("Not found", { status: 404 });
  }

  const joined = path.map((p) => decodeURIComponent(p)).join("/");
  if (!isAllowedUploadPath(joined)) {
    return new NextResponse("Not found", { status: 404 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${apiBase()}/${joined}`, {
      // Product photos change rarely; cache at the edge/CDN when hosted.
      next: { revalidate: 86_400 },
    });
  } catch {
    return new NextResponse("Cannot reach image storage", { status: 502 });
  }

  if (!upstream.ok) {
    return new NextResponse(null, {
      status: upstream.status === 404 ? 404 : 502,
    });
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const body = await upstream.arrayBuffer();
  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
      "x-content-type-options": "nosniff",
    },
  });
};
