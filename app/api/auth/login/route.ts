import { NextResponse, type NextRequest } from "next/server";
import { isProductionDeploy, upstreamFetch } from "@/lib/server-api";

const cookieName = process.env.AUTH_COOKIE_NAME ?? "edisims_access";

export const POST = async (req: NextRequest) => {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.email || !body?.password) {
      return NextResponse.json({ message: "Email and password required" }, { status: 400 });
    }

    const upstream = await upstreamFetch("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: body.email, password: body.password }),
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
      secure: isProductionDeploy(),
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    const isConfig = message.includes("API_INTERNAL_URL");
    return NextResponse.json({ message }, { status: isConfig ? 503 : 502 });
  }
};
