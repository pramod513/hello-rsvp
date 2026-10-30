import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

/**
 * Finishes sign-in for magic links opened in the same browser (PKCE "code")
 * and for Google sign-in.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  const reason = searchParams.get("error") ? "oauth" : "link";
  return NextResponse.redirect(`${origin}/login?error=${reason}&next=${encodeURIComponent(next)}`);
}
