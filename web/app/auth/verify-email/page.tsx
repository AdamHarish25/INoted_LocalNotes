import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mail } from "lucide-react"

export default function VerifyEmailPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="w-8 h-8 text-slate-800"
                        >
                            <path d="m2 7 10-5 10 5-10 5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                        </svg>
                        Inoted
                    </h1>
                </div>

                <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
                    <CardContent className="pt-10 pb-10 px-8 text-center">
                        <div className="flex justify-center mb-6">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                                <Mail className="w-8 h-8 text-blue-600" />
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold text-slate-800 mb-4">Check your email</h2>
                        <p className="text-slate-600 mb-8">
                            We've sent a confirmation link to your email address. <br />
                            Please click the link to verify your account.
                        </p>

                        <Link href="/login">
                            <Button className="w-full rounded-full h-11 bg-blue-500 hover:bg-blue-600 shadow-md shadow-blue-200">
                                Back to Login
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
