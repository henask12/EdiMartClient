import { NextResponse, type NextRequest } from "next/server";

const cookieName = process.env.AUTH_COOKIE_NAME ?? "edisims_access";

/** Paths the service worker / PWA must reach without a login redirect. */
const isPublicPath = (pathname: string) =>
  pathname === "/login" ||
  pathname === "/offline" ||
  pathname === "/sw.js" ||
  pathname === "/manifest.webmanifest" ||
  pathname.startsWith("/workbox") ||
  pathname.startsWith("/api/auth/login") ||
  pathname.startsWith("/_next") ||
  pathname.startsWith("/favicon") ||
  pathname === "/logo.png" ||
  pathname === "/logo-light.png";

export const middleware = (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  // Never force-login on proxy/API or SW assets — offline shell depends on this.
  if (
    pathname.startsWith("/api/proxy") ||
    pathname.startsWith("/api/auth/logout") ||
    pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    const token = request.cookies.get(cookieName)?.value;
    if (pathname === "/login" && token) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(cookieName)?.value;
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
};

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
