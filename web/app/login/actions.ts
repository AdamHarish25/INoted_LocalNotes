"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"

import { createClient } from "@/utils/supabase/server"
import { signIn } from "@/auth"

export async function login(formData: FormData) {
    const supabase = await createClient()

    const captchaToken = formData.get("captchaToken") as string

    const data = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
        options: {
            captchaToken
        }
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        redirect("/login?error=" + error.message)
    }

    const next = formData.get("next") as string
    revalidatePath("/", "layout")
    redirect(next && next.startsWith("/") ? next : "/dashboard")
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const captchaToken = formData.get("captchaToken") as string

    const data = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
        options: {
            captchaToken,
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




export async function loginWithGoogle() {
    await signIn("google", { redirectTo: "/dashboard" })
}
