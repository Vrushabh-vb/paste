"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    PlusCircle,
    Search,
    History,
    Settings,
    Menu
} from "lucide-react"

const navItems = [
    { name: "New", icon: PlusCircle, href: "/" },
    { name: "Browse", icon: Search, href: "/browse" },
    { name: "Recent", icon: History, href: "/recent" },
    { name: "More", icon: Menu, href: "/settings" },
]

export function MobileNav() {
    const pathname = usePathname()

    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-4 h-16 flex items-center justify-around shadow-2xl">
            {navItems.map((item) => (
                <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                        "flex flex-col items-center justify-center space-y-1 transition-all duration-200",
                        pathname === item.href
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <div className={cn(
                        "p-1.5 rounded-xl transition-all",
                        pathname === item.href && "bg-primary/10"
                    )}>
                        <item.icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider">{item.name}</span>
                </Link>
            ))}
        </div>
    )
}
