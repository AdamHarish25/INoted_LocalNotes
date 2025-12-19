import { Suspense } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { login, signup } from "./actions"
import { LoginContentWrapper } from "@/components/auth/login-content"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"


export default async function LoginPage(props: {
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const searchParams = await props.searchParams;
    const errorMessage = searchParams?.error;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:16px_16px]">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-8">
                    {/* Logo stays as is or can be inverted if needed, usually logo handles itself */}
                    <img src="/logo.png" alt="Logo" className="h-6" />
                </div>

                {/* Login Card - Dark Mode Update */}
                <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm dark:bg-black dark:border dark:border-zinc-800">
                    <CardContent className="pt-10 pb-10 px-8">
                        <LoginContentWrapper />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
