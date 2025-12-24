import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            // Helper to remove domain so cookies work on localhost and deploy previews
                            const { domain, ...validOptions } = options

                            // In development (localhost/IP), allow non-secure cookies.
                            // In production (Netlify HTTPS), the browser requires Secure cookies for SameSite policies.
                            if (process.env.NODE_ENV === 'development') {
                                validOptions.secure = false
                            }

                            cookieStore.set(name, value, validOptions)
                        })
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}

export async function createAdminClient() {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use Service Role Key for Admin Access
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    // Admin client usually doesn't need to set cookies, but we keep the structure
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            const { domain, ...validOptions } = options
                            if (process.env.NODE_ENV === 'development') {
                                validOptions.secure = false
                            }
                            cookieStore.set(name, value, validOptions)
                        })
                    } catch {
                    }
                },
            },
        }
    )
}
