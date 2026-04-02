"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Copy,
  Check,
  Download,
  FileIcon,
  Edit3,
  Save,
  X,
  Eye,
  AlertCircle,
  ChevronLeft,
  Clock,
  ShieldCheck,
  Code,
  ExternalLink,
  Zap,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import Footer from "@/components/footer"
import { DottedSurface } from "@/components/ui/dotted-surface"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"

interface FileData {
  name: string
  type: string
  url: string
  size: number
  content?: string
}

interface PasteData {
  content: string
  createdAt: string
  expiresAt: string
  timeRemaining: string
  fileName?: string
  fileType?: string
  isFile?: boolean
  files?: FileData[]
  isMultiFile?: boolean
  allowEditing?: boolean
  downloadCount?: number
  isCode?: boolean
}

export default function ViewPastePage({ params }: { params: { code: string } | Promise<{ code: string }> }) {
  const [code, setCode] = useState<string>("")
  const [pasteData, setPasteData] = useState<PasteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const resolveParams = async () => {
      try {
        const resolvedParams = await Promise.resolve(params)
        setCode(resolvedParams.code)
      } catch (err) {
        setError("Invalid parameters")
        setLoading(false)
      }
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    if (!code) return

    const fetchPaste = async () => {
      try {
        const response = await fetch(`/api/paste/${code}`)
        if (response.ok) {
          const data = await response.json()
          setPasteData(data)
          setEditContent(data.content || "")
        } else {
          const errData = await response.json().catch(() => ({}))
          setError(errData.error || "Content not found or expired")
        }
      } catch (err) {
        setError("Network error — please check your connection and try again")
      } finally {
        setLoading(false)
      }
    }
    fetchPaste()
  }, [code])

  const copyToClipboard = async (text?: string) => {
    const contentToCopy = text || pasteData?.content
    if (!contentToCopy) return
    try {
      await navigator.clipboard.writeText(contentToCopy)
      setCopied(true)
      toast.success("Copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      const textArea = document.createElement("textarea")
      textArea.value = contentToCopy
      textArea.style.position = "fixed"
      textArea.style.left = "-999999px"
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand("copy")
        setCopied(true)
        toast.success("Copied to clipboard")
        setTimeout(() => setCopied(false), 2000)
      } catch {
        toast.error("Copy failed — please select and copy manually")
      }
      document.body.removeChild(textArea)
    }
  }

  const handleSaveEdit = async () => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/paste", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, content: editContent }),
      })
      if (response.ok) {
        setPasteData(prev => prev ? { ...prev, content: editContent } : null)
        setIsEditing(false)
        toast.success("Updated successfully")
      } else {
        const err = await response.json()
        toast.error(err.error || "Failed to update")
      }
    } catch (err) {
      toast.error("Network error while saving")
    } finally {
      setIsSaving(false)
    }
  }

  const downloadFile = (url: string, fileName: string) => {
    const link = document.createElement("a")
    link.href = url
    link.download = fileName
    link.target = "_blank"
    link.rel = "noopener noreferrer"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return "Unknown"
    if (bytes < 1024) return bytes + " B"
    const units = ["KB", "MB", "GB"]
    let size = bytes / 1024
    let unitIndex = 0
    while (size > 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    return size.toFixed(1) + " " + units[unitIndex]
  }

  const renderContent = () => {
    if (!pasteData) return null

    // Multi-file view
    if (pasteData.isMultiFile && pasteData.files && pasteData.files.length > 0) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-widest">
              Shared Files ({pasteData.files.length})
            </h3>
            <Button
              onClick={() =>
                pasteData.files?.forEach((f, i) =>
                  setTimeout(() => downloadFile(f.url || f.content || "", f.name), i * 300)
                )
              }
              variant="outline"
              size="sm"
              className="h-9 rounded-xl font-bold text-xs"
            >
              <Download className="h-3.5 w-3.5 mr-2" />
              Download All
            </Button>
          </div>
          {pasteData.files.map((file, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="p-4 rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm flex items-center justify-between hover:border-primary/30 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                  <FileIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate max-w-[250px]">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {file.type || "Binary"} • {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => downloadFile(file.url || file.content || "", file.name)}
                    className="h-9 w-9 rounded-xl opacity-60 group-hover:opacity-100 transition-opacity"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download</TooltipContent>
              </Tooltip>
            </motion.div>
          ))}
        </div>
      )
    }

    // Single file view
    if (pasteData.isFile) {
      const fileUrl = pasteData.files?.[0]?.url || pasteData.content
      const fileSize = pasteData.files?.[0]?.size
      return (
        <div className="space-y-8">
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-12 rounded-3xl border-2 border-dashed border-primary/10 text-center">
            <div className="h-16 w-16 bg-card rounded-2xl shadow-xl border border-border/40 flex items-center justify-center mx-auto mb-6">
              <FileIcon className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-black mb-2">{pasteData.fileName}</h2>
            <p className="text-muted-foreground text-sm mb-2 uppercase tracking-widest font-bold">
              {pasteData.fileType}
            </p>
            {fileSize && (
              <p className="text-muted-foreground text-sm mb-8">{formatFileSize(fileSize)}</p>
            )}
            <Button
              onClick={() => downloadFile(fileUrl, pasteData.fileName!)}
              className="h-14 px-10 rounded-2xl font-black bg-gradient-to-r from-blue-600 to-violet-600 shadow-xl shadow-blue-600/20"
            >
              <Download className="h-5 w-5 mr-2" />
              Download File
            </Button>
          </div>
        </div>
      )
    }

    // Editing mode
    if (isEditing) {
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-muted/40 p-3 rounded-2xl border border-border/40">
            <span className="text-xs font-bold px-4 text-muted-foreground uppercase tracking-widest">
              Editing Snippet
            </span>
            <div className="flex gap-2">
              <Button
                onClick={() => setIsEditing(false)}
                variant="ghost"
                size="sm"
                className="rounded-xl font-bold"
              >
                <X className="h-3.5 w-3.5 mr-1.5" />
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                size="sm"
                className="rounded-xl font-bold bg-gradient-to-r from-blue-600 to-violet-600 px-6"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
          <Textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            className="min-h-[500px] p-8 rounded-2xl border-border/40 focus-visible:ring-0 text-[15px] font-mono leading-relaxed bg-muted/20"
          />
        </div>
      )
    }

    // Text content view
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center border-b border-border/40 pb-6">
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]" />
            <span className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">
              {pasteData.isCode ? "Code Snippet" : "Shared Content"}
            </span>
            {pasteData.isCode && <Code className="h-3.5 w-3.5 text-blue-500" />}
          </div>
          <div className="flex gap-2">
            {pasteData.allowEditing && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-xl font-bold border-border/40"
                  >
                    <Edit3 className="h-3.5 w-3.5 mr-2" />
                    Edit
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit this content</TooltipContent>
              </Tooltip>
            )}
            <Button
              onClick={() => copyToClipboard()}
              variant="outline"
              size="sm"
              className="h-9 rounded-xl font-bold border-border/40"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 mr-2 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 mr-2" />
              )}
              Copy Content
            </Button>
          </div>
        </div>
        <div className="relative group">
          <Textarea
            value={pasteData.content}
            readOnly
            className="min-h-[500px] p-0 border-none focus-visible:ring-0 text-lg font-medium leading-relaxed bg-transparent resize-none font-mono"
          />
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="relative min-h-screen flex flex-col overflow-hidden">
        {/* Three.js Background */}
        <DottedSurface className="opacity-30" />

        <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-2xl backdrop-saturate-150 h-14 flex items-center justify-center">
          <div className="w-full max-w-5xl px-6 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:-translate-x-0.5 transition-all" />
              <div className="h-6 w-6 bg-gradient-to-br from-blue-600 to-violet-600 rounded-md flex items-center justify-center">
                <Zap className="h-3.5 w-3.5 text-white fill-white" />
              </div>
              <span className="font-bold tracking-tight text-sm">Dashboard</span>
            </Link>
            <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-widest bg-primary/5 border-primary/10 text-primary">
              <ShieldCheck className="h-3 w-3 mr-1.5" /> Secure Recall
            </Badge>
          </div>
        </nav>

        <main className="relative z-10 flex-grow pt-16 pb-20 px-6">
          <div className="max-w-4xl mx-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-[50vh]">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full"
                />
                <p className="mt-4 text-sm text-muted-foreground font-medium">Fetching content...</p>
              </div>
            ) : error ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-20"
              >
                <Card className="border-border/40 bg-card/80 backdrop-blur-xl max-w-md mx-auto p-10">
                  <div className="h-16 w-16 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="h-8 w-8 text-red-500" />
                  </div>
                  <h2 className="text-2xl font-black mb-2">Access Void</h2>
                  <p className="text-muted-foreground font-medium mb-8">{error}</p>
                  <Link href="/">
                    <Button className="h-12 px-8 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-violet-600">
                      Go Home
                    </Button>
                  </Link>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="space-y-10"
              >
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <motion.h1
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-7xl font-black tracking-tighter mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text"
                    >
                      #{code}
                    </motion.h1>
                    <div className="flex gap-3 flex-wrap">
                      <Badge variant="secondary" className="px-3 py-1 font-semibold border-border/40">
                        Shared on {new Date(pasteData!.createdAt).toLocaleDateString()}
                      </Badge>
                      <Badge variant="secondary" className="px-3 py-1 font-semibold border-border/40">
                        <Eye className="h-3 w-3 mr-1.5" /> {pasteData!.downloadCount || 0} Views
                      </Badge>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 text-white p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden group shadow-xl shadow-black/10">
                    <div className="absolute right-0 top-0 h-full w-24 bg-blue-500/15 blur-[40px] transition-opacity opacity-50 group-hover:opacity-100" />
                    <div className="h-10 w-10 rounded-xl bg-white/[0.08] flex items-center justify-center text-blue-400">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Auto-Expiring</p>
                      <p className="text-sm font-bold capitalize">{pasteData!.timeRemaining}</p>
                    </div>
                  </div>
                </header>

                <Card className="border-border/40 bg-card/80 backdrop-blur-xl shadow-lg">
                  <CardContent className="p-8">
                    {renderContent()}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </TooltipProvider>
  )
}
