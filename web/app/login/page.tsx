import Link from "next/link"
import { Button } from "@/components/ui/button"
import { login, signup } from "./actions"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

export default function LoginPage() {
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
                    <CardContent className="pt-10 pb-10 px-8">
                        <div className="text-center mb-8">
                            <h2 className="text-xl font-medium tracking-wide text-slate-700">LOGIN</h2>
                        </div>

                        <form className="space-y-6">
                            <div className="space-y-6">
                                <div className="space-y-2 relative">
                                    <Input
                                        id="username"
                                        name="username"
                                        type="text"
                                        placeholder="(Required for Sign Up)"
                                        className="peer rounded-full border-slate-200 focus:border-blue-500 focus-visible:ring-blue-500 h-11 placeholder:text-transparent focus:placeholder:text-slate-300 focus:placeholder:text-[10px] transition-colors"
                                    />
                                    <Label
                                        htmlFor="username"
                                        className="absolute left-4 top-3.5 text-slate-400 text-xs transition-all bg-white px-1 
                                        peer-focus:-top-2 peer-focus:left-3 peer-focus:text-blue-500 peer-focus:text-[10px]
                                        peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-[10px]
                                        peer-[:not(:placeholder-shown)]:text-slate-400
                                        peer-focus:peer-[:not(:placeholder-shown)]:text-blue-500
                                        pointer-events-none"
                                    >
                                        Username
                                    </Label>
                                </div>

                                <div className="space-y-2 relative">
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="Email"
                                        required
                                        className="peer rounded-full border-slate-200 focus:border-blue-500 focus-visible:ring-blue-500 h-11 placeholder:text-transparent transition-colors"
                                    />
                                    <Label
                                        htmlFor="email"
                                        className="absolute left-4 top-3.5 text-slate-400 text-xs transition-all bg-white px-1 
                                        peer-focus:-top-2 peer-focus:left-3 peer-focus:text-blue-500 peer-focus:text-[10px]
                                        peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-[10px]
                                        peer-[:not(:placeholder-shown)]:text-slate-400
                                        peer-focus:peer-[:not(:placeholder-shown)]:text-blue-500
                                        pointer-events-none"
                                    >
                                        Email
                                    </Label>
                                </div>

                                <div className="space-y-2 relative">
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        placeholder="Password"
                                        className="peer rounded-full border-slate-200 focus:border-blue-500 focus-visible:ring-blue-500 h-11 placeholder:text-transparent transition-colors"
                                    />
                                    <Label
                                        htmlFor="password"
                                        className="absolute left-4 top-3.5 text-slate-400 text-xs transition-all bg-white px-1 
                                        peer-focus:-top-2 peer-focus:left-3 peer-focus:text-blue-500 peer-focus:text-[10px]
                                        peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-[10px]
                                        peer-[:not(:placeholder-shown)]:text-slate-400
                                        peer-focus:peer-[:not(:placeholder-shown)]:text-blue-500
                                        pointer-events-none"
                                    >
                                        Password
                                    </Label>
                                    <div className="flex justify-end mt-1">
                                        <Link href="#" className="text-[10px] text-slate-300 hover:text-blue-500 underline">
                                            Forgot Password?
                                        </Link>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button formAction={login} className="flex-1 rounded-full h-11 bg-blue-500 hover:bg-blue-600 shadow-md shadow-blue-200">
                                        Login
                                    </Button>
                                    <Button formAction={signup} variant="outline" className="flex-1 rounded-full h-11 border-blue-200 text-blue-500 hover:bg-blue-50">
                                        Sign Up
                                    </Button>
                                </div>
                            </div>
                        </form>

                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center">
                                <Separator />
                            </div>
                            <div className="relative flex justify-center text-[10px] uppercase">
                                <span className="bg-white px-2 text-slate-300">Or</span>
                            </div>
                        </div>

                        <div className="flex justify-center gap-6">
                            <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-slate-100 shadow-sm">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" className="w-5 h-5" alt="Microsoft" />
                            </Button>
                            <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-slate-100 shadow-sm">
                                <img src="https://authjs.dev/img/providers/apple.svg" className="w-5 h-5" alt="Apple" />
                            </Button>
                            <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-slate-100 shadow-sm">
                                <img src="https://authjs.dev/img/providers/google.svg" className="w-5 h-5" alt="Google" />
                            </Button>
                        </div>

                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
