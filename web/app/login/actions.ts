"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { resolveMx } from "dns/promises"

import { createClient } from "@/utils/supabase/server"
import { signIn } from "@/auth"

async function isValidEmailDomain(email: string): Promise<boolean> {
    try {
        const domain = email.split('@')[1];
        if (!domain) return false;

        // This checks if the domain has valid MX records (meaning it can receive email)
        const mxRecords = await resolveMx(domain);
        return mxRecords && mxRecords.length > 0;
    } catch (error) {
        return false;
    }
}

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
    const email = formData.get("email") as string

    // Check if email domain actually exists and has mail servers
    const isValidDomain = await isValidEmailDomain(email);
    if (!isValidDomain) {
        redirect("/login?error=Email is not found in the Provider's (Google/Microsoft/etc.) database, try another email.")
    }

    const data = {
        email: email,
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
