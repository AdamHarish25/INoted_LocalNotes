import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const { searchParams } = requestUrl;
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/dashboard";
    const origin = requestUrl.origin;

    // --- CLIENT-SIDE BOUNCE STRATEGY ---
    // If user lands on an internal deployment URL (e.g. 6950...netlify.app),
    // we MUST move them to the canonical domain (e.g. inoted-daily.netlify.app)
    // BEFORE exchanging the code, otherwise cookies are set on the wrong domain.
    // We use Client-Side redirect (HTML+JS) to avoid Server-Side Loop issues.

    let canonicalUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL;

    if (canonicalUrl) {
        // Normalized canonical handling
        if (!canonicalUrl.startsWith('http')) {
            canonicalUrl = `https://${canonicalUrl}`;
        }

        const requestHost = requestUrl.host;
        const canonicalHost = new URL(canonicalUrl).host;
        const isLocalhost = requestHost.includes('localhost') || requestHost.includes('127.0.0.1');

        // If we are on the wrong domain (and not in dev), Bounce!
        if (!isLocalhost && requestHost !== canonicalHost) {
            const targetUrl = `${canonicalUrl}/auth/callback${requestUrl.search}`;

            const html = `
             <!DOCTYPE html>
             <html>
               <head>
                 <meta charset="utf-8">
                 <title>Redirecting...</title>
                 <meta http-equiv="refresh" content="0;url=${targetUrl}">
               </head>
               <body style="background:#f9fafb; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif; color:#4b5563;">
                 <div style="text-align:center;">
                    <svg class="spinner" viewBox="0 0 50 50" style="width:50px; height:50px; margin-bottom:20px; animation: spin 1s linear infinite;">
                        <circle cx="25" cy="25" r="20" fill="none" stroke="#3b82f6" stroke-width="5"></circle>
                    </svg>
                    <p>Securing your session...</p>
                    <p style="font-size:0.8em; opacity:0.7;">Redirecting to ${canonicalHost}...</p>
                 </div>
                 <style>
                    @keyframes spin { 100% { transform: rotate(360deg); } }
                 </style>
                 <script>
                    window.location.href = "${targetUrl}";
                 </script>
               </body>
             </html>`;

            return new NextResponse(html, {
                headers: { 'Content-Type': 'text/html' }
            });
        }
    }
    // ------------------------------------

    // Use canonical URL for the final redirect destination if available
    // But do NOT redirect the current request (avoids infinite loops on hosting platforms with internal proxying)
    // This variable is now only used for the final redirect destination, not for the bounce check.
    let finalRedirectOrigin = canonicalUrl || origin; // Use the already normalized canonicalUrl if it exists

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            // Using requestUrl.origin here is safe because we've already enforced canonical above (or we are on localhost/canonical already)
            // But to be extra safe, use finalRedirectOrigin if available
            const cleanOrigin = finalRedirectOrigin || origin;
            return NextResponse.redirect(`${cleanOrigin}${next}`);
        }
        console.error("Auth Callback Error:", error);
        const cleanOrigin = finalRedirectOrigin || origin;
        return NextResponse.redirect(`${cleanOrigin}/login?error=${encodeURIComponent(error.message)}`);
    }

    const cleanOrigin = finalRedirectOrigin || origin;
    return NextResponse.redirect(`${cleanOrigin}/login?error=Could not authenticate user`);
}
