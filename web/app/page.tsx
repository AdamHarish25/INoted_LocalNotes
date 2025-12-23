
"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowRight, Check, Github, Twitter, Menu, X, Play, Code, Cloud, Share2, GitBranch, RefreshCw, PenTool } from "lucide-react"
import { useState } from "react"
import { ModeToggle } from "@/components/mode-toggle"

export default function LandingPage() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    // FAQ Data
    const faqs = [
        {
            question: "Can I use Inoted for team collaboration?",
            answer: "Absolutely! Inoted is built for developers to share ideas. You can invite team members to your workspace or share public links to your notes and whiteboards."
        },
        {
            question: "Is there a limit on file uploads?",
            answer: "The Free plan includes 100MB of storage. Pro users get 10GB of storage for high-res images and attachments."
        },
        {
            question: "How does the Git sync work?",
            answer: "We offer seamless integration with GitHub. You can push your notes directly to a private repository as Markdown files."
        },
        {
            question: "Do you offer student discounts?",
            answer: "Yes! Students with a valid .edu email address can get the Pro plan for free for 1 year."
        }
    ]

    return (
        <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900 dark:selection:bg-blue-900 dark:selection:text-blue-100">

            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16 relative">
                        {/* Logo */}
                        <div className="flex items-center gap-2">
                            <Image src={"/logo.png"} alt="logo" className="h-6 w-auto" />
                        </div>

                        {/* Desktop Links */}
                        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-8">
                            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 transition-colors">Features</a>
                            <a href="#demo" className="text-sm font-medium text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 transition-colors">Demo</a>
                            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 transition-colors">Pricing</a>
                            <a href="#faq" className="text-sm font-medium text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 transition-colors">FAQ</a>
                        </div>

                        {/* CTA */}
                        <div className="hidden md:flex items-center gap-4">
                            <ModeToggle />
                            <Link href="/login">
                                <Button variant="ghost" className="text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400">Login</Button>
                            </Link>
                            <Link href="/login">
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6">
                                    Get Started
                                </Button>
                            </Link>
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="md:hidden flex items-center gap-4">
                            <ModeToggle />
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 p-2"
                            >
                                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-4 space-y-4 shadow-lg absolute w-full top-16 left-0">
                        <a href="#features" className="block text-sm font-medium text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400" onClick={() => setMobileMenuOpen(false)}>Features</a>
                        <a href="#demo" className="block text-sm font-medium text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400" onClick={() => setMobileMenuOpen(false)}>Demo</a>
                        <a href="#pricing" className="block text-sm font-medium text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
                        <Link href="/login" className="block w-full" onClick={() => setMobileMenuOpen(false)}>
                            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4">
                                Get Started
                            </Button>
                        </Link>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-20 left-10 w-20 h-20 bg-blue-100 rounded-full blur-3xl opacity-50 animate-pulse delay-700"></div>
                <div className="absolute top-40 right-10 w-32 h-32 bg-indigo-100 rounded-full blur-3xl opacity-50 animate-pulse"></div>

                <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6">
                    All-in-One Notes for <br className="hidden sm:block" />
                    <span className="text-blue-600 dark:text-blue-500">Developers</span>
                </h1>
                <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                    Tech blogs, coding ideas, and developer plans — all securely in one place.
                    Built for speed, focused on code.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                    <Link href="/login">
                        <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 h-12 text-base shadow-lg shadow-blue-200">
                            Get Started Free
                        </Button>
                    </Link>
                    <a href="#demo">
                        <Button variant="outline" size="lg" className="rounded-full px-8 h-12 text-base border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                            <Play className="w-4 h-4 mr-2" />
                            View Demo
                        </Button>
                    </a>
                </div>

                {/* Hero Image / Screenshot */}
                <div className="relative mx-auto max-w-5xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 overflow-hidden transform hover:scale-[1.01] transition-transform duration-500">
                    {/* Placeholder for the app screenshot - creating a mock UI with divs */}
                    <div className="w-full aspect-[16/9] bg-white dark:bg-slate-950 flex flex-col">
                        <div className="h-8 border-b border-slate-100 dark:border-slate-800 flex items-center px-4 gap-2 bg-slate-50 dark:bg-slate-900">
                            <div className="w-3 h-3 rounded-full bg-red-400"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                            <div className="w-3 h-3 rounded-full bg-green-400"></div>
                            <div className="ml-4 w-64 h-4 bg-slate-200 dark:bg-slate-800 rounded-full opacity-50"></div>
                        </div>
                        <div className="flex-1 flex overflow-hidden">
                            <div className="w-64 border-r border-slate-100 dark:border-slate-800 p-4 hidden md:block bg-white dark:bg-slate-950">
                                <div className="w-full h-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-4"></div>
                                <div className="space-y-2">
                                    <div className="w-full h-4 bg-slate-50 dark:bg-slate-900 rounded"></div>
                                    <div className="w-3/4 h-4 bg-slate-50 dark:bg-slate-900 rounded"></div>
                                    <div className="w-5/6 h-4 bg-slate-50 dark:bg-slate-900 rounded"></div>
                                </div>
                            </div>
                            <div className="flex-1 p-8 bg-slate-50/50 dark:bg-slate-900/50">
                                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400 mx-auto">
                                    <Play className="w-8 h-8 fill-current" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-lg font-medium text-slate-400 dark:text-slate-500">App Dashboard Preview</h3>
                                    <p className="text-sm text-slate-300 dark:text-slate-600">Interact with notes and whiteboards seamlessly</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="text-blue-600 dark:text-blue-400 font-semibold tracking-wider uppercase text-sm">Features</span>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mt-2">Everything You Need in One Tool</h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Feature 1 */}
                        <div className="bg-white dark:bg-slate-950 rounded-2xl p-8 border border-slate-100 dark:border-slate-800 hover:shadow-xl transition-shadow duration-300">
                            <div className="h-48 bg-blue-50 dark:bg-blue-900/10 rounded-xl mb-6 flex items-center justify-center border border-blue-100 dark:border-blue-900/20 overflow-hidden relative group">
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] opacity-10"></div>
                                {/* Mock Whiteboard Drawing */}
                                <svg viewBox="0 0 200 100" className="w-full h-full p-4 pointer-events-none">
                                    <path d="M 20 50 Q 50 10 90 50 T 160 50" stroke="#3b82f6" strokeWidth="3" fill="none" className="path-animate" />
                                    <text x="50%" y="80%" dominantBaseline="middle" textAnchor="middle" className="text-xs fill-slate-400 font-mono">Real-time Collaboration</text>
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                <PenTool className="w-5 h-5 text-blue-500" />
                                Real-Time Whiteboard
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                                Sketch architecture diagrams, flowcharts, or just doodle your ideas. Collaborate with your team in real-time with infinite canvas support.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-white dark:bg-slate-950 rounded-2xl p-8 border border-slate-100 dark:border-slate-800 hover:shadow-xl transition-shadow duration-300">
                            <div className="h-48 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl mb-6 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/20 overflow-hidden relative">
                                <div className="flex gap-8 items-center">
                                    <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-lg shadow-sm flex items-center justify-center">
                                        <Code className="w-8 h-8 text-slate-700 dark:text-slate-200" />
                                    </div>
                                    <RefreshCw className="w-6 h-6 text-indigo-300 animate-spin-slow" />
                                    <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-lg shadow-sm flex items-center justify-center">
                                        <Cloud className="w-8 h-8 text-indigo-500" />
                                    </div>
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                <GitBranch className="w-5 h-5 text-indigo-500" />
                                Git & Cloud Sync
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                                Never lose a snippet again. Auto-sync your notes to the cloud and backup code snippets directly to your private GitHub repositories.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Demo Section */}
            <section id="demo" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
                <span className="text-blue-600 dark:text-blue-400 font-semibold tracking-wider uppercase text-sm">Demo</span>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mt-2 mb-12">See It in Action</h2>

                <div className="relative mx-auto max-w-4xl aspect-video bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex items-center justify-center group cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/50 to-purple-900/50 opacity-60"></div>
                    {/* Fake Video UI */}
                    <div className="z-10 bg-white/10 backdrop-blur-sm p-4 rounded-full border border-white/20 group-hover:scale-110 transition-transform duration-300">
                        <Play className="w-12 h-12 text-white fill-white pl-1" />
                    </div>
                    <p className="absolute bottom-8 text-slate-300 text-sm font-medium">Watch 2-minute walkthrough</p>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-20 bg-slate-50 dark:bg-slate-900/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="text-blue-600 dark:text-blue-400 font-semibold tracking-wider uppercase text-sm">Pricing</span>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mt-2">Simple Pricing for Developers</h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {/* Free Plan */}
                        <div className="bg-white dark:bg-slate-950 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm relative">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Free</h3>
                            <div className="mt-4 flex items-baseline gap-1">
                                <span className="text-4xl font-bold text-slate-900 dark:text-white">$0</span>
                                <span className="text-slate-500 dark:text-slate-400">/mo</span>
                            </div>
                            <p className="mt-4 text-slate-500 dark:text-slate-400 text-sm">Perfect for hobbyists and learning.</p>

                            <Link href="/login">
                                <Button variant="outline" className="w-full mt-8 rounded-full h-12 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-900/20">
                                    Get Started
                                </Button>
                            </Link>

                            <ul className="mt-8 space-y-4 text-sm text-slate-600 dark:text-slate-300">
                                <li className="flex gap-3">
                                    <Check className="w-5 h-5 text-blue-500 shrink-0" />
                                    10 Notes & Snippets
                                </li>
                                <li className="flex gap-3">
                                    <Check className="w-5 h-5 text-blue-500 shrink-0" />
                                    1 Whiteboard Project
                                </li>
                                <li className="flex gap-3">
                                    <Check className="w-5 h-5 text-blue-500 shrink-0" />
                                    Community Support
                                </li>
                            </ul>
                        </div>

                        {/* Pro Plan */}
                        <div className="bg-white dark:bg-slate-950 rounded-3xl p-8 border-2 border-blue-500 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">POPULAR</div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Pro Developer</h3>
                            <div className="mt-4 flex items-baseline gap-1">
                                <span className="text-4xl font-bold text-slate-900 dark:text-white">$9</span>
                                <span className="text-slate-500 dark:text-slate-400">/mo</span>
                            </div>
                            <p className="mt-4 text-slate-500 dark:text-slate-400 text-sm">For serious coding and storage.</p>

                            <Link href="/login">
                                <Button className="w-full mt-8 rounded-full h-12 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200/50 dark:shadow-none">
                                    Start Free Trial
                                </Button>
                            </Link>
                            <p className="text-center text-xs text-slate-400 mt-2">No credit card required</p>

                            <ul className="mt-8 space-y-4 text-sm text-slate-600 dark:text-slate-300">
                                <li className="flex gap-3">
                                    <Check className="w-5 h-5 text-blue-500 shrink-0" />
                                    Unlimited Notes
                                </li>
                                <li className="flex gap-3">
                                    <Check className="w-5 h-5 text-blue-500 shrink-0" />
                                    Unlimited Whiteboards
                                </li>
                                <li className="flex gap-3">
                                    <Check className="w-5 h-5 text-blue-500 shrink-0" />
                                    GitHub Sync & API Access
                                </li>
                                <li className="flex gap-3">
                                    <Check className="w-5 h-5 text-blue-500 shrink-0" />
                                    Priority Support
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
                <div className="text-center mb-12">
                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-semibold tracking-wide">FAQ</span>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white mt-6">Frequently Asked Questions</h2>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <details key={index} className="group border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 open:ring-1 open:ring-blue-100 dark:open:ring-blue-900 transition-all duration-200">
                            <summary className="flex items-center justify-between p-6 cursor-pointer list-none font-medium text-slate-900 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                {faq.question}
                                <span className="transform group-open:rotate-180 transition-transform duration-200">
                                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </span>
                            </summary>
                            <div className="px-6 pb-6 text-slate-500 dark:text-slate-400 leading-relaxed text-sm">
                                {faq.answer}
                            </div>
                        </details>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 pt-20 pb-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-10 mb-16">
                        <div className="text-center md:text-left">
                            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Ready to Simplify <br /> Your Workflow?</h2>
                            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm">
                                Join thousands of developers who are organizing their coding life with Inoted.
                            </p>
                            <div className="flex gap-4 justify-center md:justify-start">
                                <Link href="/login">
                                    <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 h-12">
                                        Get Started
                                    </Button>
                                </Link>
                                <Button variant="ghost" className="text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400">
                                    Contact Sales
                                </Button>
                            </div>
                        </div>
                        {/* Footer Decorative Icon/Graphic could go here */}
                        <div className="hidden md:block opacity-20 transform rotate-12">
                            <Code className="w-40 h-40 text-blue-600" />
                        </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Image src={"/logo.png"} alt="logo" className="h-6 w-auto" />
                        </div>

                        <div className="flex gap-6">
                            <a href="#" className="text-slate-400 hover:text-blue-600 transition-colors"><Twitter className="w-5 h-5" /></a>
                            <a href="#" className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><Github className="w-5 h-5" /></a>
                            <a href="#" className="text-slate-400 hover:text-blue-600 transition-colors"><Share2 className="w-5 h-5" /></a>
                        </div>

                        <p className="text-xs text-slate-400">
                            © {new Date().getFullYear()} Inoted Inc. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    )
};
