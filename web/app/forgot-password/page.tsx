import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export default async function ForgotPasswordPage(props: {
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const searchParams = await props.searchParams;
    const errorMessage = searchParams?.error;
    const successMessage = searchParams?.message;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:16px_16px]">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-8">
                    {/* Using the same logo placeholder as login page */}
                    <Link href="/login">
                        <img src="/logo.png" alt="Logo" className="h-6 cursor-pointer" />
                    </Link>
                </div>

                <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm dark:bg-black dark:border dark:border-zinc-800">
                    <CardHeader className="text-center">
                        <CardTitle className="text-xl">Reset Password</CardTitle>
                        <CardDescription>
                            Enter your email address and we'll send you a link to reset your password.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-8 pb-10">
                        <ForgotPasswordForm />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
