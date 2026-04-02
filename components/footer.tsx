"use client"

import Link from "next/link"
import { Github, Twitter, Heart } from "lucide-react"
import { Separator } from "@/components/ui/separator"

export default function Footer() {
    return (
        <footer className="relative z-10 border-t border-border/40 bg-background/60 backdrop-blur-xl py-8 px-6">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center text-[9px] font-black text-white">PH</div>
                    <span className="text-sm font-semibold text-muted-foreground">
                        © {new Date().getFullYear()} PasteHere
                    </span>
                    <span className="text-muted-foreground/40 text-xs">•</span>
                    <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
                        Made with <Heart className="h-3 w-3 text-red-400 fill-red-400" />
                    </span>
                </div>

                <div className="flex items-center gap-6">
                    <Link href="#" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
                    <Link href="#" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
                    <Link href="#" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
                </div>

                <div className="flex items-center gap-3">
                    <Link href="https://github.com" target="_blank" className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                        <Github className="h-4 w-4" />
                    </Link>
                    <Link href="https://twitter.com" target="_blank" className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all">
                        <Twitter className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </footer>
    )
}
