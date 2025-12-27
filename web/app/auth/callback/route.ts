import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const { searchParams } = requestUrl;
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/dashboard";
    const origin = requestUrl.origin;

    // --- CANONICAL URL ENFORCEMENT ---
    // Ensure we are on the correct domain before exchanging code.
    // This fixes issues where email links point to internal Netlify URLs (e.g. 6950...netlify.app)
    // causing cookies to be set on the wrong domain.
    let canonicalOrigin = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL;

    // Normalize canonical origin (remove trailing slash)
    if (canonicalOrigin && canonicalOrigin.endsWith('/')) {
        canonicalOrigin = canonicalOrigin.slice(0, -1);
    }

    // Determine protocol for comparison (ignore http/https mismatch on localhost usually, but important for prod)
    if (canonicalOrigin) {
        // Ensure protocol presence
        if (!canonicalOrigin.startsWith('http')) {
            canonicalOrigin = `https://${canonicalOrigin}`;
        }

        // If current origin is different from canonical (and not localhost interacting), redirect!
        // We skip this check if "localhost" to avoid development friction, unless explicitly desired.
        const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');

        if (!isLocalhost && origin !== canonicalOrigin) {
            console.log(`Redirecting from ${origin} to ${canonicalOrigin}`);
            const redirectUrl = new URL(request.url);
            redirectUrl.protocol = new URL(canonicalOrigin).protocol;
            redirectUrl.host = new URL(canonicalOrigin).host;
            redirectUrl.port = new URL(canonicalOrigin).port;
            return NextResponse.redirect(redirectUrl);
        }
    }
    // --------------------------------

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            // Using requestUrl.origin here is safe because we've already enforced canonical above (or we are on localhost/canonical already)
            // But to be extra safe, use canonicalOrigin if available
            const cleanOrigin = canonicalOrigin || origin;
            return NextResponse.redirect(`${cleanOrigin}${next}`);
        }
        console.error("Auth Callback Error:", error);
        const cleanOrigin = canonicalOrigin || origin;
        return NextResponse.redirect(`${cleanOrigin}/login?error=${encodeURIComponent(error.message)}`);
    }

    const cleanOrigin = canonicalOrigin || origin;
    return NextResponse.redirect(`${cleanOrigin}/login?error=Could not authenticate user`);
}
