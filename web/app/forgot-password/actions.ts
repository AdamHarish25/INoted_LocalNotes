"use server"

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { headers } from "next/headers"

export async function forgotPassword(formData: FormData) {
    const supabase = await createClient()
    const email = formData.get("email") as string
    const captchaToken = formData.get("captchaToken") as string
    const origin = (await headers()).get("origin")

    if (!email) {
        return redirect("/forgot-password?error=Email is required")
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/update-password`,
        captchaToken
    })

    if (error) {
        return redirect("/forgot-password?error=" + error.message)
    }

    return redirect("/forgot-password?message=Check your email for the password reset link")
}
