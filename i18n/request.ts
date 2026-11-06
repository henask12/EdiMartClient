import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

const SUPPORTED = new Set(["en", "am"]);

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get("NEXT_LOCALE")?.value ?? "en";
  const locale = SUPPORTED.has(raw) ? raw : "en";

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
