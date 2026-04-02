"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Copy,
  Check,
  Search,
  FileText,
  Share2,
  Files,
  Lock,
  Shield,
  Plus,
  ArrowRight,
  Code,
  Zap,
  Sparkles,
  Timer,
  Globe,
} from "lucide-react"
import Footer from "@/components/footer"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileUpload } from "@/components/file-upload"
import Link from "next/link"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { DottedSurface } from "@/components/ui/dotted-surface"
import { upload } from "@vercel/blob/client"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"

const expirationLabels: Record<string, string> = {
  '5min': '5 Minutes', '30min': '30 Minutes', '1hour': '1 Hour',
  '6hours': '6 Hours', '12hours': '12 Hours', '1day': '1 Day',
  '3days': '3 Days', '7days': '7 Days', '30days': '30 Days',
}

const fadeInUp = {
  initial: { opacity: 0, y: 24, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -16, filter: "blur(4px)" },
}

export default function HomePage() {
  const [content, setContent] = useState("")
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [generatedExpiresAt, setGeneratedExpiresAt] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [viewCode, setViewCode] = useState("")
  const [uploadType, setUploadType] = useState<"text" | "files">("text")
  const [selectedFile, setSelectedFile] = useState<any>(null)
  const [selectedFiles, setSelectedFiles] = useState<any[]>([])
  const [expirationOption, setExpirationOption] = useState<string>("30min")
  const [allowEditing, setAllowEditing] = useState(false)
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [autoPaste, setAutoPaste] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedAutoPaste = localStorage.getItem("autoPaste")
    if (savedAutoPaste !== null) {
      setAutoPaste(savedAutoPaste === "true")
    }
  }, [])

  const toggleAutoPaste = () => {
    const newVal = !autoPaste
    setAutoPaste(newVal)
    localStorage.setItem("autoPaste", String(newVal))
    toast.message(`Auto-Flow ${newVal ? 'on' : 'off'}`, {
      description: newVal ? "Paste will auto-generate code" : "Paste will only fill the text area",
    })
  }

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  const copyToClipboard = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(successMessage)
    } catch (err) {
      const textArea = document.createElement("textarea")
      textArea.value = text
      textArea.style.position = "fixed"
      textArea.style.left = "-999999px"
      textArea.style.top = "-999999px"
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      try {
        document.execCommand("copy")
        toast.success(successMessage)
      } catch (e) {
        toast.error("Failed to copy. Please copy manually: " + text)
      }
      document.body.removeChild(textArea)
    }
  }

  const handleSubmit = async (e?: React.FormEvent, contentOverride?: string) => {
    if (e) e.preventDefault()
    const textToSubmit = contentOverride !== undefined ? contentOverride : content
    if (uploadType === "text" && !textToSubmit.trim()) {
      if (!contentOverride) toast.error("Please enter some content")
      return
    }
    if (uploadType === "files" && selectedFiles.length === 0 && !selectedFile) {
      toast.error("Please select a file")
      return
    }
    setIsLoading(true)
    try {
      let payload: any
      if (uploadType === "text") {
        payload = { content: textToSubmit, isFile: false, expirationOption, allowEditing }
      } else {
        if (selectedFiles.length === 0 && selectedFile) {
          const blob = await upload(`pastes/${Date.now()}_${selectedFile.name}`, selectedFile.file, {
            access: "public",
            handleUploadUrl: "/api/upload",
          })
          payload = {
            fileUrl: blob.url,
            fileSize: selectedFile.size,
            fileName: selectedFile.name,
            fileType: selectedFile.type,
            isFile: true,
            expirationOption,
          }
        } else {
          const filesMeta = []
          for (const f of selectedFiles) {
            const blob = await upload(`pastes/${Date.now()}_${f.name}`, f.file, {
              access: "public",
              handleUploadUrl: "/api/upload",
            })
            filesMeta.push({
              url: blob.url,
              size: f.size,
              name: f.name,
              type: f.type,
            })
          }
          payload = {
            files: filesMeta,
            isMultiFile: true,
            expirationOption,
          }
        }
      }

      const response = await fetch("/api/paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const { code, expiresAt } = await response.json()
        setGeneratedCode(code)
        setGeneratedExpiresAt(expiresAt)
        setContent("")
        setSelectedFile(null)
        setSelectedFiles([])

        try {
          const isCodeSnippet =
            uploadType === "text" &&
            (textToSubmit.includes("{") ||
              textToSubmit.includes("}") ||
              textToSubmit.includes("function") ||
              textToSubmit.includes("const ") ||
              textToSubmit.includes("import ") ||
              textToSubmit.includes("<") ||
              textToSubmit.includes("=>"))

          const shareType =
            uploadType === "text"
              ? isCodeSnippet ? "code" : "text"
              : selectedFiles.length > 1 ? "multi" : "file"

          const historyItem = {
            code,
            type: shareType,
            createdAt: Date.now(),
            expiresAt,
          }

          const existing = localStorage.getItem("shareHistory")
          const history = existing ? JSON.parse(existing) : []
          history.push(historyItem)
          localStorage.setItem("shareHistory", JSON.stringify(history))
        } catch (error) {
          console.error("Failed to save history:", error)
        }

        toast.success("Share created successfully!")
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Failed to create share", {
          description: errorData.details,
        })
      }
    } catch (error) {
      toast.error("An error occurred — please try again")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData("text")
    if (pastedText && uploadType === "text") {
      setContent(pastedText)
      if (autoPaste) {
        handleSubmit(undefined, pastedText)
      }
    }
  }

  const handleRecall = (e: React.FormEvent) => {
    e.preventDefault()
    if (viewCode.match(/^\d{4,5}$/)) {
      router.push(`/view/${viewCode}`)
    } else {
      toast.error("Enter a valid 4 or 5-digit code")
    }
  }

  return (
    <TooltipProvider>
      <div className="relative min-h-screen overflow-hidden">
        {/* Three.js Dotted Surface Background */}
        <DottedSurface className="opacity-40" />

        {/* Top Navigation */}
        <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-2xl backdrop-saturate-150">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative h-9 w-9 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/25 group-hover:shadow-blue-600/40 group-hover:scale-110 transition-all duration-300">
                <Zap className="h-5 w-5 fill-white" />
                <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="font-bold text-xl tracking-tight">
                Paste<span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">Here</span>
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/recent">
                <Button variant="ghost" size="sm" className="text-sm font-semibold text-muted-foreground hover:text-foreground gap-1.5">
                  <Timer className="h-4 w-4" />
                  <span className="hidden sm:inline">Recent</span>
                </Button>
              </Link>
              {mounted && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9 rounded-xl">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={theme}
                          initial={{ rotate: -90, opacity: 0 }}
                          animate={{ rotate: 0, opacity: 1 }}
                          exit={{ rotate: 90, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          {theme === "light" ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
                        </motion.div>
                      </AnimatePresence>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Toggle theme</TooltipContent>
                </Tooltip>
              )}
              <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />
              <div className="hidden sm:flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                  Auto-Flow
                </span>
                <Switch checked={autoPaste} onCheckedChange={toggleAutoPaste} className="scale-90" />
              </div>
            </div>
          </div>
        </nav>

        <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
          <AnimatePresence mode="wait">
            {!generatedCode ? (
              <motion.div
                key="create"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="space-y-10"
              >
                {/* Hero Header */}
                <motion.div
                  className="text-center space-y-4"
                  {...fadeInUp}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <Badge variant="secondary" className="px-4 py-1.5 text-xs font-semibold rounded-full border border-border/60 bg-background/80 backdrop-blur-sm">
                    <Sparkles className="h-3 w-3 mr-1.5 text-amber-500" />
                    Encrypted · Auto-Expiring · Zero Trace
                  </Badge>
                  <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-[1.1]">
                    Share Instantly.{" "}
                    <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-600 bg-clip-text text-transparent">
                      Built for Speed.
                    </span>
                  </h1>
                  <p className="text-lg text-muted-foreground font-medium max-w-xl mx-auto">
                    Share text snippets, code, or files with a simple code — auto-expiring and private
                  </p>
                </motion.div>

                {/* Two Column Layout */}
                <motion.div
                  className="grid lg:grid-cols-2 gap-8"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  {/* Main Share Card */}
                  <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl shadow-black/5 dark:shadow-black/20 overflow-hidden">
                    <Tabs defaultValue="text" onValueChange={v => setUploadType(v as any)}>
                      <CardHeader className="pb-4">
                        <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/60 p-1">
                          <TabsTrigger value="text" className="text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg gap-2">
                            <Code className="h-4 w-4" />
                            Text / Code
                          </TabsTrigger>
                          <TabsTrigger value="files" className="text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg gap-2">
                            <Files className="h-4 w-4" />
                            Files
                          </TabsTrigger>
                        </TabsList>
                      </CardHeader>

                      <CardContent className="space-y-6">
                        <TabsContent value="text" className="mt-0">
                          <Textarea
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            onPaste={handlePaste}
                            placeholder="Paste your text, code snippet, or any content here..."
                            className="min-h-[300px] text-[15px] font-mono resize-none border-border/40 bg-muted/30 focus:bg-background transition-colors rounded-xl"
                          />
                        </TabsContent>

                        <TabsContent value="files" className="mt-0">
                          <FileUpload
                            onFileSelect={setSelectedFile}
                            onFilesSelect={setSelectedFiles}
                            onClearFile={() => setSelectedFile(null)}
                            onClearFiles={() => setSelectedFiles([])}
                            selectedFile={selectedFile}
                            selectedFiles={selectedFiles}
                            multiple
                          />
                        </TabsContent>

                        {/* Options */}
                        <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-border/40">
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expiration</Label>
                            <Select value={expirationOption} onValueChange={setExpirationOption}>
                              <SelectTrigger className="h-11 rounded-xl border-border/40 bg-muted/30">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(expirationLabels).map(([v, l]) => (
                                  <SelectItem key={v} value={v}>
                                    {l}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {uploadType === "text" && (
                            <div className="space-y-2">
                              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Options</Label>
                              <div className="flex items-center justify-between h-11 px-4 rounded-xl border border-border/40 bg-muted/30">
                                <span className="text-sm font-medium">Allow Editing</span>
                                <Switch checked={allowEditing} onCheckedChange={setAllowEditing} />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Submit Button */}
                        <Button
                          onClick={handleSubmit}
                          disabled={isLoading}
                          size="lg"
                          className="w-full h-14 text-base font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all duration-300 rounded-xl"
                        >
                          {isLoading ? (
                            <span className="flex items-center gap-2">
                              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Creating Share...
                            </span>
                          ) : (
                            <>
                              <Share2 className="h-5 w-5 mr-2" />
                              Create Secure Share
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Tabs>
                  </Card>

                  {/* Recall Code Card */}
                  <div className="relative rounded-3xl overflow-hidden">
                    {/* Gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-800 dark:via-slate-900 dark:to-black" />
                    {/* Decorative blurs */}
                    <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/15 rounded-full blur-[80px]" />
                    <div className="absolute bottom-0 left-0 w-56 h-56 bg-violet-500/15 rounded-full blur-[80px]" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-indigo-500/10 rounded-full blur-[60px]" />

                    <div className="relative z-10 p-8 lg:p-10 flex flex-col justify-center h-full">
                      <div className="flex justify-center mb-8">
                        <div className="h-20 w-20 rounded-2xl bg-white/[0.08] backdrop-blur-sm border border-white/10 flex items-center justify-center group hover:bg-white/[0.12] transition-colors">
                          <Search className="h-10 w-10 text-white/80 group-hover:text-white transition-colors" />
                        </div>
                      </div>

                      <div className="text-center mb-8">
                        <h2 className="text-3xl font-black text-white mb-3">Already Have a Code?</h2>
                        <p className="text-slate-400 text-lg">Enter your code to access shared content</p>
                      </div>

                      <form onSubmit={handleRecall} className="space-y-4">
                        <Input
                          value={viewCode}
                          onChange={e => setViewCode(e.target.value)}
                          placeholder="Enter code"
                          maxLength={5}
                          className="h-14 text-center text-2xl font-mono tracking-[0.3em] bg-white/[0.06] border-white/10 text-white placeholder:text-slate-600 rounded-xl focus:bg-white/[0.1] focus:border-white/20 transition-all"
                        />
                        <Button
                          type="submit"
                          size="lg"
                          className="w-full h-14 px-8 bg-white text-slate-900 hover:bg-slate-100 font-bold rounded-xl shadow-xl shadow-black/20 transition-all duration-300"
                        >
                          <Search className="h-5 w-5 mr-2" />
                          Access Content
                          <ArrowRight className="h-5 w-5 ml-2" />
                        </Button>
                      </form>

                      {/* Quick Info */}
                      <div className="mt-8 pt-6 border-t border-white/[0.06]">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="group cursor-default">
                            <div className="text-xl font-black text-white mb-1 group-hover:text-blue-400 transition-colors">Auto</div>
                            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Expiring</div>
                          </div>
                          <div className="group cursor-default">
                            <div className="text-xl font-black text-white mb-1 group-hover:text-indigo-400 transition-colors">Instant</div>
                            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Access</div>
                          </div>
                          <div className="group cursor-default">
                            <div className="text-xl font-black text-white mb-1 group-hover:text-violet-400 transition-colors">Zero</div>
                            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Trace</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Feature Pills */}
                <motion.div
                  className="flex items-center justify-center gap-3 flex-wrap"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {[
                    { icon: Shield, label: "Private by Default", color: "text-emerald-500" },
                    { icon: Lock, label: "Auto-Expiring", color: "text-blue-500" },
                    { icon: Check, label: "No Permanent Storage", color: "text-violet-500" },
                    { icon: Globe, label: "Cross-Device", color: "text-amber-500" },
                  ].map(({ icon: Icon, label, color }) => (
                    <div
                      key={label}
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/60 border border-border/40 backdrop-blur-sm hover:bg-card/80 transition-colors cursor-default"
                    >
                      <Icon className={`h-3.5 w-3.5 ${color}`} />
                      <span className="text-sm font-medium text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="space-y-8 py-12"
              >
                <Card className="border-border/40 bg-card/80 backdrop-blur-xl overflow-hidden max-w-2xl mx-auto shadow-2xl">
                  <CardHeader className="text-center pb-4 pt-10">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                      className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 mx-auto mb-4"
                    >
                      <Check className="h-8 w-8 text-emerald-600" />
                    </motion.div>
                    <CardTitle className="text-3xl font-black">Share Created!</CardTitle>
                    <CardDescription className="text-lg">Your code is ready to share</CardDescription>
                  </CardHeader>

                  <CardContent className="text-center space-y-8 pb-10">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 150, damping: 15, delay: 0.3 }}
                      className="bg-gradient-to-br from-muted/50 to-muted/80 border border-border/40 w-fit mx-auto px-16 py-10 rounded-3xl cursor-pointer hover:scale-105 hover:shadow-xl transition-all duration-300 group"
                      onClick={() => {
                        if (generatedCode) copyToClipboard(generatedCode, "Code copied to clipboard!")
                      }}
                    >
                      <div className="text-7xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent tracking-widest">
                        {generatedCode}
                      </div>
                      <p className="text-xs text-muted-foreground mt-3 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to copy
                      </p>
                    </motion.div>

                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => {
                          if (generatedCode) copyToClipboard(generatedCode, "Code copied!")
                        }}
                        className="h-12 px-6 font-semibold rounded-xl"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Code
                      </Button>
                      <Button
                        size="lg"
                        onClick={() => {
                          if (generatedCode)
                            copyToClipboard(`${window.location.origin}/view/${generatedCode}`, "Link copied!")
                        }}
                        className="h-12 px-6 font-semibold bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 shadow-lg shadow-blue-600/20 rounded-xl"
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Copy Link
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="text-center">
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => {
                      setGeneratedCode(null)
                      setGeneratedExpiresAt(null)
                    }}
                    className="font-semibold"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Another Share
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
        <Footer />
      </div>
    </TooltipProvider>
  )
}
