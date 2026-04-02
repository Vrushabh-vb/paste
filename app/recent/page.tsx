"use client"

import { motion } from "framer-motion"
import { History, Clock, ChevronRight, FileText, Files, Trash2, Code, ChevronLeft, Zap } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import Footer from "@/components/footer"
import { DottedSurface } from "@/components/ui/dotted-surface"
import {
    Card,
    CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

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
        if (type === "multi") return <Files className="h-5 w-5" />
        if (type === "file") return <FileText className="h-5 w-5" />
        if (type === "code") return <Code className="h-5 w-5" />
        return <History className="h-5 w-5" />
    }

    const getTypeLabel = (type: string) => {
        if (type === "multi") return "Multiple Files"
        if (type === "file") return "File Share"
        if (type === "code") return "Code Snippet"
        return "Text Share"
    }

    const getTypeColor = (type: string) => {
        if (type === "multi") return "from-violet-500 to-purple-600"
        if (type === "file") return "from-amber-500 to-orange-600"
        if (type === "code") return "from-blue-500 to-indigo-600"
        return "from-emerald-500 to-teal-600"
    }

    if (!mounted) {
        return null
    }

    return (
        <TooltipProvider>
            <div className="relative min-h-screen flex flex-col overflow-hidden">
                {/* Three.js Background */}
                <DottedSurface className="opacity-30" />

                <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-2xl backdrop-saturate-150">
                    <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-2 group">
                            <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:-translate-x-0.5 transition-all" />
                            <div className="h-6 w-6 bg-gradient-to-br from-blue-600 to-violet-600 rounded-md flex items-center justify-center">
                                <Zap className="h-3.5 w-3.5 text-white fill-white" />
                            </div>
                            <span className="font-bold text-sm">Dashboard</span>
                        </Link>
                        <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-widest bg-muted/60 border-border/40">
                            Recent Activity
                        </Badge>
                    </div>
                </nav>

                <main className="relative z-10 flex-grow max-w-4xl mx-auto px-6 py-12 w-full">
                    <motion.header
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center space-y-4 mb-12"
                    >
                        <h1 className="text-5xl font-black tracking-tight">
                            Your Share{" "}
                            <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-600 bg-clip-text text-transparent">
                                History
                            </span>
                        </h1>
                        <p className="text-muted-foreground font-medium text-lg">
                            {history.length > 0
                                ? `${history.length} share${history.length === 1 ? '' : 's'} in your local history`
                                : "No shares in your history yet"}
                        </p>
                    </motion.header>

                    {history.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-20"
                        >
                            <Card className="border-border/40 bg-card/80 backdrop-blur-xl max-w-md mx-auto p-10">
                                <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-muted/60 mb-6 mx-auto">
                                    <History className="h-10 w-10 text-muted-foreground" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2">No Recent Activity</h3>
                                <p className="text-muted-foreground mb-6">Create your first share to see it here</p>
                                <Link href="/">
                                    <Button size="lg" className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 font-bold">
                                        Create Share
                                    </Button>
                                </Link>
                            </Card>
                        </motion.div>
                    ) : (
                        <div className="space-y-3">
                            {history.map((item, i) => {
                                const isExpired = item.expiresAt <= Date.now()

                                return (
                                    <motion.div
                                        key={item.code}
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.04, duration: 0.3 }}
                                    >
                                        <Card className={`group border-border/40 bg-card/80 backdrop-blur-xl hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 ${isExpired ? 'opacity-50' : ''}`}>
                                            <CardContent className="p-5 flex items-center justify-between">
                                                <Link href={`/view/${item.code}`} className="flex items-center gap-4 flex-1">
                                                    <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${getTypeColor(item.type)} flex items-center justify-center text-white group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
                                                        {getTypeIcon(item.type)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <p className="font-bold text-lg">#{item.code}</p>
                                                            <Badge variant="secondary" className="text-[10px] font-semibold border-border/40 bg-muted/60">
                                                                {getTypeLabel(item.type)}
                                                            </Badge>
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
                                                <div className="flex items-center gap-1">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={(e) => {
                                                                    e.preventDefault()
                                                                    deleteShare(item.code)
                                                                }}
                                                                className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="left">Delete from history</TooltipContent>
                                                    </Tooltip>
                                                    <ChevronRight className="h-5 w-5 text-muted-foreground/40 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                )
                            })}
                        </div>
                    )}
                </main>
                <Footer />
            </div>
        </TooltipProvider>
    )
}
