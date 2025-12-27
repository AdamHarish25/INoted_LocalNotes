import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) => {
                        const { domain, ...validOptions } = options
                        if (process.env.NODE_ENV === 'development') {
                            validOptions.secure = false;
                        }
                        supabaseResponse.cookies.set(name, value, validOptions)
                    })
                },
            },
        }
    )

    // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
    // creating a new response object with NextResponse.next() make sure to:
    // 1. Pass the request in it, like so:
    //    const myNewResponse = NextResponse.next({ request })
    // 2. Copy over the cookies, like so:
    //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
    // 3. Change the myNewResponse object to fit your needs, but avoid changing
    //    the cookies!
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Protect Dashboard: if requesting protected route and no user, redirect to login
    // Protect Dashboard: if requesting protected route and no user, redirect to login
    // Check for NextAuth/Auth.js session cookies as well
    const hasNextAuthSession = request.cookies.getAll().some(cookie =>
        cookie.name.includes('authjs.session-token') ||
        cookie.name.includes('next-auth.session-token')
    )

    if (
        !user &&
        !hasNextAuthSession &&
        !request.nextUrl.pathname.startsWith('/login') &&
        !request.nextUrl.pathname.startsWith('/auth') &&
        !request.nextUrl.pathname.startsWith('/api') && // Allow API routes (including auth)
        request.nextUrl.pathname !== '/'
    ) {
        // allow public assets if missed by matcher, but generally redirect to login
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search)

        const redirectResponse = NextResponse.redirect(url)

        // IMPORTANT: Copy cookies from supabaseResponse (which might have refreshed tokens) to the redirect response
        const allCookies = supabaseResponse.cookies.getAll()
        allCookies.forEach(cookie => {
            redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
        })

        return redirectResponse
    }

    // Redirect to Dashboard (or intended page) if already logged in and visiting login or landing page
    if (user && (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname === '/')) {
        const url = request.nextUrl.clone()
        const next = request.nextUrl.searchParams.get('next')
        if (next) {
            // Decode and set pathname. Note: simple handling assumes next is a pathname relative to site root
            // Security: In a real app validate 'next' doesn't lead to external domains (open redirect)
            // But Next.js URL constructor handling relative paths helps.
            const nextUrl = new URL(next, request.url)
            url.pathname = nextUrl.pathname
            url.search = nextUrl.search
        } else {
            url.pathname = '/dashboard'
        }

        const redirectResponse = NextResponse.redirect(url)

        // IMPORTANT: Copy cookies from supabaseResponse to persist any session updates
        const allCookies = supabaseResponse.cookies.getAll()
        allCookies.forEach(cookie => {
            redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
        })

        return redirectResponse
    }

    // Set Permissive CSP for Cloudflare/Supabase
    supabaseResponse.headers.set(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://*.supabase.co https://apis.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://challenges.cloudflare.com https://*.supabase.co https://*.supabase.in https://accounts.google.com wss://*.supabase.co wss://*.supabase.in https://inoted-collab-server-production.up.railway.app wss://inoted-collab-server-production.up.railway.app; frame-src 'self' https://challenges.cloudflare.com https://*.supabase.co https://accounts.google.com;"
    )

    return supabaseResponse
}
