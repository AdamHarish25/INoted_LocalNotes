"use server"

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { headers } from "next/headers"

export async function forgotPassword(formData: FormData) {
    const supabase = await createClient()
    const email = formData.get("email") as string
    const captchaToken = formData.get("captchaToken") as string

    const headersList = await headers()
    // 1. Prefer the request Origin header if present (browser automatically sends this on POST)
    let origin = headersList.get("origin")

    // 2. If no Origin, check for explicit site URLs in environment variables
    if (!origin) {
        if (process.env.NEXT_PUBLIC_SITE_URL) {
            origin = process.env.NEXT_PUBLIC_SITE_URL
        } else if (process.env.NEXTAUTH_URL) {
            origin = process.env.NEXTAUTH_URL
        }
    }

    // Ensure origin has a protocol if pulled from env vars without one
    if (origin && !origin.startsWith('http')) {
        origin = `https://${origin}`
    }

    // 3. Fallback: Construct URL from Host header (Dynamic, works for localhost, Vercel previews, etc.)
    if (!origin) {
        const host = headersList.get("host")
        if (host) {
            // Determine protocol: HTTP for localhost, HTTPS for everything else (Production)
            const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https'
            origin = `${protocol}://${host}`
        }
    }

    if (!email) {
        return redirect("/forgot-password?error=Email is required")
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/update-password`,
        captchaToken
    })

    if (error) {
        console.error("Forgot Password Error:", error)
        return redirect("/forgot-password?error=" + encodeURIComponent(error.message))
    }

    return redirect("/forgot-password?message=Check your email for the password reset link")
}
