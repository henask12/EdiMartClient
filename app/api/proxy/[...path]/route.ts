import { NextResponse, type NextRequest } from "next/server";

const apiBase = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:4000";
const cookieName = process.env.AUTH_COOKIE_NAME ?? "edisims_access";

const forward = async (
  req: NextRequest,
  params: Promise<{ path: string[] }>,
  method: string,
) => {
  const { path } = await params;
  const targetPath = `/${path.join("/")}`;
  const targetUrl = new URL(`${targetPath}${req.nextUrl.search}`, apiBase);
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
  const upstream = await fetch(targetUrl, {
    method,
    headers,
    body: body && body.byteLength > 0 ? body : undefined,
    cache: "no-store",
  });
  const text = await upstream.text();
  const res = new NextResponse(text, { status: upstream.status });
  const ct = upstream.headers.get("content-type");
  if (ct) {
    res.headers.set("content-type", ct);
  }
  return res;
};

export const GET = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) =>
  forward(req, ctx.params, "GET");

export const POST = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) =>
  forward(req, ctx.params, "POST");

export const PATCH = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) =>
  forward(req, ctx.params, "PATCH");

export const DELETE = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) =>
  forward(req, ctx.params, "DELETE");
