import { NextResponse } from "next/server";

const cookieName = process.env.AUTH_COOKIE_NAME ?? "edisims_access";

export const POST = async () => {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieName, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
};
