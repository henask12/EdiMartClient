import { NextResponse, type NextRequest } from "next/server";
import { csrfOriginAllowed } from "@/lib/csrf";
import { isProductionDeploy, upstreamFetch } from "@/lib/server-api";

const cookieName = process.env.AUTH_COOKIE_NAME ?? "edisims_access";
const FALLBACK_TTL_SECONDS = 8 * 3600;

/** The API decides how long a login lasts (SESSION_TTL_HOURS) and tells us, so cookie and token agree. */
const cookieLifetime = (expiresInSeconds: unknown) =>
  typeof expiresInSeconds === "number" && Number.isFinite(expiresInSeconds) && expiresInSeconds > 0
    ? Math.floor(expiresInSeconds)
    : FALLBACK_TTL_SECONDS;

export const POST = async (req: NextRequest) => {
  if (!csrfOriginAllowed(req)) {
    return NextResponse.json(
      { message: "Forbidden origin", code: "CSRF_ORIGIN_MISMATCH" },
      { status: 403 },
    );
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body?.email || !body?.password) {
      return NextResponse.json({ message: "Email and password required" }, { status: 400 });
    }

    const payload: Record<string, string> = {
      email: body.email,
      password: body.password,
    };
    if (typeof body.totpCode === "string" && body.totpCode.trim()) {
      payload.totpCode = body.totpCode.trim();
    }

    const upstream = await upstreamFetch("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await upstream.json().catch(() => ({}));

    // Phase 9: API may require a TOTP code before issuing a token.
    if (
      data?.code === "TOTP_REQUIRED" ||
      (upstream.status === 401 && data?.code === "TOTP_REQUIRED")
    ) {
      return NextResponse.json(
        { ...data, code: "TOTP_REQUIRED", message: data.message ?? "Authenticator code required" },
        { status: upstream.ok ? 200 : upstream.status },
      );
    }

    if (!upstream.ok) {
      const message =
        upstream.status === 429
          ? "Too many sign-in attempts. Please wait a few minutes and try again."
          : data.message;
      return NextResponse.json({ ...data, message }, { status: upstream.status });
    }

    const token = data.accessToken as string | undefined;
    if (!token) {
      // Degrade: TOTP challenge without accessToken
      if (data?.code === "TOTP_REQUIRED") {
        return NextResponse.json(
          { ...data, code: "TOTP_REQUIRED" },
          { status: 200 },
        );
      }
      return NextResponse.json({ message: "Invalid login response" }, { status: 502 });
    }

    const res = NextResponse.json({ user: data.user });
    res.cookies.set(cookieName, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProductionDeploy(),
      path: "/",
      maxAge: cookieLifetime(data.expiresInSeconds),
    });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    const isConfig = message.includes("API_INTERNAL_URL");
    return NextResponse.json({ message }, { status: isConfig ? 503 : 502 });
  }
};
