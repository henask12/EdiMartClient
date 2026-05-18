import { NextResponse, type NextRequest } from "next/server";

const cookieName = process.env.AUTH_COOKIE_NAME ?? "edisims_access";

const isPublicPath = (pathname: string) =>
  pathname === "/login" ||
  pathname.startsWith("/api/auth/login") ||
  pathname.startsWith("/_next") ||
  pathname.startsWith("/favicon");

export const middleware = (request: NextRequest) => {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/proxy") || pathname.startsWith("/api/auth/logout")) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }
  const token = request.cookies.get(cookieName)?.value;
  if (pathname === "/login" && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (!isPublicPath(pathname) && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
};

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
