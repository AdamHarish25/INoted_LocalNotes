"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"

import { createClient } from "@/utils/supabase/server"

export async function login(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        redirect("/login?error=" + error.message)
    }

    revalidatePath("/", "layout")
    redirect("/")
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
        options: {
            data: {
                display_name: formData.get("username") as string,
            }
        }
    }

    const { error } = await supabase.auth.signUp(data)

    if (error) {
        redirect("/login?error=" + error.message)
    }

    revalidatePath("/", "layout")
    redirect("/auth/verify-email")
}

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || "1x0000000000000000000000000000000AA" // Test Secret Key

export async function continueAsGuest(token: string) {
    if (!token) {
        throw new Error("Captcha token is required")
    }

    const formData = new FormData()
    formData.append('secret', TURNSTILE_SECRET_KEY)
    formData.append('response', token)

    try {
        const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body: formData,
        })

        const outcome = await result.json()

        if (!outcome.success) {
            console.error("Turnstile verification failed. Outcome:", JSON.stringify(outcome))
            throw new Error(`Captcha validation failed: ${JSON.stringify(outcome['error-codes'])}`)
        }

        const supabase = await createClient()
        const { error } = await supabase.auth.signInAnonymously()

        if (error) {
            console.error("Supabase anonymous sign-in failed:", error)
            throw error
        }

    } catch (err) {
        console.error("Guest login error:", err)
        throw err
    }

    return { success: true }
}
