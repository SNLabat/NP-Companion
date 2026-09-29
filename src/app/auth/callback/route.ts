import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

/** OAuth (PKCE) callback: exchange the code for a session cookie, then go back. */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/social";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/social";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!code || !url || !key) return NextResponse.redirect(`${origin}${next}`);

  const cookieStore = await cookies();
  const sb = createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
    },
  });

  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) console.error("[auth] exchange failed", error.message);
  return NextResponse.redirect(`${origin}${next}${error ? "?auth=failed" : ""}`);
}
