import { NextResponse, type NextRequest } from "next/server";

const apiBase = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:4000";
const cookieName = process.env.AUTH_COOKIE_NAME ?? "edisims_access";

export const POST = async (req: NextRequest) => {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json({ message: "Email and password required" }, { status: 400 });
  }
  const upstream = await fetch(`${apiBase}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: body.email, password: body.password }),
    cache: "no-store",
  });
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status });
  }
  const token = data.accessToken as string | undefined;
  if (!token) {
    return NextResponse.json({ message: "Invalid login response" }, { status: 502 });
  }
  const res = NextResponse.json({ user: data.user });
  res.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
};
