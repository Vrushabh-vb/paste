"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    PlusCircle,
    Search,
    History,
    Settings,
    Shield,
    Share2,
    HelpCircle,
    Code2
} from "lucide-react"

const menuItems = [
    { name: "New Paste", icon: PlusCircle, href: "/" },
    { name: "Browse", icon: Search, href: "/browse" },
    { name: "Recent", icon: History, href: "/recent" },
    { name: "Security", icon: Shield, href: "/security" },
]

const bottomItems = [
    { name: "Settings", icon: Settings, href: "/settings" },
    { name: "Support", icon: HelpCircle, href: "/support" },
]

export function Sidebar() {
    const pathname = usePathname()

    return (
        <aside className="hidden lg:flex w-64 flex-col fixed left-0 top-0 bottom-0 border-r bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-xl">
            <div className="p-6">
                <Link href="/" className="flex items-center space-x-3 mb-10 transition-transform hover:scale-[1.02]">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/20">
                        <Share2 className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-foreground">
                        Paste<span className="text-primary">Box</span>
                    </span>
                </Link>

                <nav className="space-y-1">
                    <p className="px-3 mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Main Menu
                    </p>
                    {menuItems.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group",
                                pathname === item.href
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground"
                            )}
                        >
                            <item.icon className={cn(
                                "h-4 w-4 transition-transform group-hover:scale-110",
                                pathname === item.href ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                            )} />
                            <span>{item.name}</span>
                        </Link>
                    ))}
                </nav>
            </div>

            <div className="mt-auto p-6 space-y-1">
                {bottomItems.map((item) => (
                    <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                            "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground",
                            pathname === item.href && "bg-slate-100 dark:bg-slate-800 text-foreground"
                        )}
                    >
                        <item.icon className="h-4 w-4 transition-transform group-hover:scale-110 group-hover:text-primary" />
                        <span>{item.name}</span>
                    </Link>
                ))}

                <div className="mt-6 pt-6 border-t border-border/50">
                    <div className="rounded-xl bg-primary/5 p-4 border border-primary/10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <Code2 className="h-4 w-4 text-primary" />
                            </div>
                            <p className="text-xs font-semibold text-primary uppercase">Pro Plan</p>
                        </div>
                        <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
                            Unlock unlimited sharing, custom domains, and team collaboration.
                        </p>
                        <button className="w-full py-2 text-[11px] font-bold bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity">
                            Upgrade Now
                        </button>
                    </div>
                </div>
            </div>
        </aside>
    )
}
