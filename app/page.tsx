import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const cookieName = process.env.AUTH_COOKIE_NAME ?? "edisims_access";

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;
  if (token) {
    redirect("/dashboard");
  }
  redirect("/login");
}
