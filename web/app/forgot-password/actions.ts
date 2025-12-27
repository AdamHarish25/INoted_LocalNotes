"use server"

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { headers } from "next/headers"

export async function forgotPassword(formData: FormData) {
    const supabase = await createClient()
    const email = formData.get("email") as string
    const captchaToken = formData.get("captchaToken") as string

    const headersList = await headers()
    let origin: string | null = null;

    // 1. PRIORITY: Check explicit environment variables first
    // This ensures production emails always point to the public domain (e.g., inoted-daily.netlify.app)
    // instead of internal deployment URLs (e.g., 6950...netlify.app)
    if (process.env.NEXT_PUBLIC_SITE_URL) {
        origin = process.env.NEXT_PUBLIC_SITE_URL
    } else if (process.env.NEXTAUTH_URL) {
        origin = process.env.NEXTAUTH_URL
    }

    // Ensure origin has a protocol if pulled from env vars without one
    if (origin && !origin.startsWith('http')) {
        origin = `https://${origin}`
    }

    // 2. Fallback: Prefer the request Origin header (Browser usually sends this)
    if (!origin) {
        origin = headersList.get("origin")
    }

    // 3. Last Resort: Construct URL from Host header
    if (!origin) {
        const host = headersList.get("host")
        if (host) {
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
