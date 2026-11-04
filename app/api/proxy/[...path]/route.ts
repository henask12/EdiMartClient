import { NextResponse, type NextRequest } from "next/server";

const apiBase = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:4000";
const cookieName = process.env.AUTH_COOKIE_NAME ?? "edisims_access";

/** Request headers the API needs to see. Everything else is dropped. */
const FORWARDED_HEADERS = [
  "content-type",
  "idempotency-key",
  "x-approval-token",
  "x-register-id",
] as const;

const clearSessionCookie = (res: NextResponse) => {
  res.cookies.set(cookieName, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
};

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
  for (const name of FORWARDED_HEADERS) {
    const value = req.headers.get(name);
    if (value) {
      headers.set(name, value);
    }
  }
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }
  const hasBody = !["GET", "HEAD"].includes(method);
  const body = hasBody ? await req.arrayBuffer() : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method,
      headers,
      body: body && body.byteLength > 0 ? body : undefined,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { message: "Cannot reach the server. Check your connection and try again." },
      { status: 502 },
    );
  }

  const ct = upstream.headers.get("content-type") ?? "";
  const disposition = upstream.headers.get("content-disposition");
  const isAttachment =
    disposition?.includes("attachment") ||
    ct.includes("application/pdf") ||
    ct.includes("spreadsheet") ||
    ct.includes("text/csv");

  let res: NextResponse;
  if (isAttachment) {
    const buffer = await upstream.arrayBuffer();
    res = new NextResponse(buffer, { status: upstream.status });
    if (ct) res.headers.set("content-type", ct);
    if (disposition) res.headers.set("content-disposition", disposition);
  } else {
    const text = await upstream.text();
    res = new NextResponse(text, { status: upstream.status });
    if (ct) res.headers.set("content-type", ct);
  }

  // The API no longer accepts this login (expired, signed out elsewhere, user deactivated):
  // drop the cookie so the app sends the person to /login instead of failing every call.
  if (upstream.status === 401 && token) {
    clearSessionCookie(res);
  }
  return res;
};

export const GET = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) =>
  forward(req, ctx.params, "GET");

export const POST = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) =>
  forward(req, ctx.params, "POST");

export const PATCH = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) =>
  forward(req, ctx.params, "PATCH");

export const PUT = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) =>
  forward(req, ctx.params, "PUT");

export const DELETE = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) =>
  forward(req, ctx.params, "DELETE");
