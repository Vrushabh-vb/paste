"use client"

import { motion } from "framer-motion"
import { History, Clock, ChevronRight, FileText, Files, Trash2, Code } from "lucide-react"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import Footer from "@/components/footer"

interface ShareHistory {
    code: string
    type: "text" | "file" | "multi" | "code"
    createdAt: number
    expiresAt: number
}

export default function RecentPage() {
    const [history, setHistory] = useState<ShareHistory[]>([])
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        loadHistory()
    }, [])

    const loadHistory = () => {
        try {
            const stored = localStorage.getItem("shareHistory")
            if (stored) {
                const parsed = JSON.parse(stored) as ShareHistory[]
                // Sort by creation time, newest first
                const sorted = parsed.sort((a, b) => b.createdAt - a.createdAt)
                setHistory(sorted)
            }
        } catch (error) {
            console.error("Failed to load history:", error)
        }
    }

    const deleteShare = (code: string) => {
        try {
            const updated = history.filter(h => h.code !== code)
            localStorage.setItem("shareHistory", JSON.stringify(updated))
            setHistory(updated)

            // Also delete from main storage
            localStorage.removeItem(`paste_${code}`)
            toast.success("Share deleted from history")
        } catch (error) {
            toast.error("Failed to delete share")
        }
    }

    const getTimeAgo = (timestamp: number) => {
        const seconds = Math.floor((Date.now() - timestamp) / 1000)
        if (seconds < 60) return "Just now"
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
        return `${Math.floor(seconds / 86400)}d ago`
    }

    const getExpiryText = (expiresAt: number) => {
        const remaining = expiresAt - Date.now()
        if (remaining <= 0) return "Expired"

        const minutes = Math.floor(remaining / 60000)
        const hours = Math.floor(minutes / 60)
        const days = Math.floor(hours / 24)

        if (days > 0) return `Expires in ${days}d`
        if (hours > 0) return `Expires in ${hours}h`
        return `Expires in ${minutes}m`
    }

    const getTypeIcon = (type: string) => {
        if (type === "multi") return <Files className="h-6 w-6" />
        if (type === "file") return <FileText className="h-6 w-6" />
        if (type === "code") return <Code className="h-6 w-6" />
        return <History className="h-6 w-6" />
    }

    const getTypeLabel = (type: string) => {
        if (type === "multi") return "Multiple Files"
        if (type === "file") return "File Share"
        if (type === "code") return "Code Snippet"
        return "Text Share"
    }

    if (!mounted) {
        return null
    }

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            <nav className="sticky top-0 z-50 border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="font-bold text-sm">Dashboard</span>
                    </Link>
                    <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Recent Activity</h2>
                </div>
            </nav>

            <main className="flex-grow max-w-4xl mx-auto px-6 py-12 w-full">
                <header className="text-center space-y-4 mb-12">
                    <h1 className="text-5xl font-black tracking-tight">Your Share History</h1>
                    <p className="text-muted-foreground font-medium text-lg">
                        {history.length > 0
                            ? `${history.length} share${history.length === 1 ? '' : 's'} in your local history`
                            : "No shares in your history yet"}
                    </p>
                </header>

                {history.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-6">
                            <History className="h-10 w-10 text-slate-400" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">No Recent Activity</h3>
                        <p className="text-muted-foreground mb-6">Create your first share to see it here</p>
                        <Link href="/">
                            <Button size="lg" className="rounded-xl">
                                Create Share
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {history.map((item, i) => {
                            const isExpired = item.expiresAt <= Date.now()

                            return (
                                <motion.div
                                    key={item.code}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className={`group p-6 rounded-3xl border bg-white dark:bg-slate-900 flex items-center justify-between hover:border-primary/40 transition-all shadow-sm ${isExpired ? 'opacity-60' : ''}`}
                                >
                                    <Link href={`/view/${item.code}`} className="flex items-center gap-4 flex-1">
                                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                                            {getTypeIcon(item.type)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <p className="font-bold text-lg">#{item.code}</p>
                                                <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 font-semibold">
                                                    {getTypeLabel(item.type)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {getTimeAgo(item.createdAt)}
                                                </span>
                                                <span className={isExpired ? "text-red-500 font-bold" : ""}>
                                                    {getExpiryText(item.expiresAt)}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                deleteShare(item.code)
                                            }}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                        <ChevronRight className="h-5 w-5 text-slate-300 transition-transform group-hover:translate-x-1" />
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    )
}
