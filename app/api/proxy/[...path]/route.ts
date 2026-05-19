import { NextResponse, type NextRequest } from "next/server";
import { upstreamFetch } from "@/lib/server-api";

const cookieName = process.env.AUTH_COOKIE_NAME ?? "edisims_access";

const forward = async (
  req: NextRequest,
  params: Promise<{ path: string[] }>,
  method: string,
) => {
  const { path } = await params;
  const targetPath = `/${path.join("/")}${req.nextUrl.search}`;
  const token = req.cookies.get(cookieName)?.value;
  const headers = new Headers();
  const contentType = req.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }
  const hasBody = !["GET", "HEAD"].includes(method);
  const body = hasBody ? await req.arrayBuffer() : undefined;

  try {
    const upstream = await upstreamFetch(targetPath, {
      method,
      headers,
      body: body && body.byteLength > 0 ? body : undefined,
    });

    const ct = upstream.headers.get("content-type") ?? "";
    const disposition = upstream.headers.get("content-disposition");
    const isAttachment =
      disposition?.includes("attachment") ||
      ct.includes("application/pdf") ||
      ct.includes("spreadsheet") ||
      ct.includes("text/csv");

    if (isAttachment) {
      const buffer = await upstream.arrayBuffer();
      const res = new NextResponse(buffer, { status: upstream.status });
      if (ct) res.headers.set("content-type", ct);
      if (disposition) res.headers.set("content-disposition", disposition);
      return res;
    }

    const text = await upstream.text();
    const res = new NextResponse(text, { status: upstream.status });
    if (ct) res.headers.set("content-type", ct);
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "API request failed";
    return NextResponse.json(
      { message },
      { status: 502 },
    );
  }
};

export const GET = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) =>
  forward(req, ctx.params, "GET");

export const POST = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) =>
  forward(req, ctx.params, "POST");

export const PATCH = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) =>
  forward(req, ctx.params, "PATCH");

export const DELETE = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) =>
  forward(req, ctx.params, "DELETE");
