"use client"

import Link from "next/link"
import { Github, Twitter } from "lucide-react"

export default function Footer() {
    return (
        <footer className="border-t bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl py-8 px-6">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 bg-slate-200 dark:bg-slate-800 rounded flex items-center justify-center text-[10px] font-bold">PH</div>
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">© {new Date().getFullYear()} PasteHere.</span>
                </div>

                <div className="flex items-center gap-6">
                    <Link href="#" className="text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors">Privacy</Link>
                    <Link href="#" className="text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors">Terms</Link>
                    <Link href="#" className="text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors">Contact</Link>
                </div>

                <div className="flex items-center gap-4">
                    <Link href="https://github.com" target="_blank" className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                        <Github className="h-4 w-4" />
                    </Link>
                    <Link href="https://twitter.com" target="_blank" className="text-slate-400 hover:text-blue-400 transition-colors">
                        <Twitter className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </footer>
    )
}
