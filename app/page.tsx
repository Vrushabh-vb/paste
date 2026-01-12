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
  Zap
} from "lucide-react"
import Footer from "@/components/footer"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileUpload } from "@/components/file-upload"
import Link from "next/link"
import { Moon, Sun } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card" // Keep Card imports as it's used for the main card

const expirationLabels: Record<string, string> = {
  '5min': '5 Minutes', '30min': '30 Minutes', '1hour': '1 Hour',
  '6hours': '6 Hours', '12hours': '12 Hours', '1day': '1 Day',
  '3days': '3 Days', '7days': '7 Days', '30days': '30 Days'
}

export default function HomePage() {
  const [content, setContent] = useState("")
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [generatedExpiresAt, setGeneratedExpiresAt] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [viewCode, setViewCode] = useState("") // Keep viewCode for the nav bar recall
  const [uploadType, setUploadType] = useState<"text" | "files">("text")
  const [selectedFile, setSelectedFile] = useState<any>(null)
  const [selectedFiles, setSelectedFiles] = useState<any[]>([])
  const [expirationOption, setExpirationOption] = useState<string>("30min")
  const [allowEditing, setAllowEditing] = useState(false)
  const router = useRouter()
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [autoPaste, setAutoPaste] = useState(true)

  useEffect(() => {
    // Check system/saved theme on mount
    const savedTheme = localStorage.getItem("theme")
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    const initialTheme = savedTheme as "light" | "dark" || systemTheme
    setTheme(initialTheme)
    document.documentElement.classList.toggle("dark", initialTheme === "dark")

    // Check auto-paste preference
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
      description: newVal ? "Paste will auto-generate code" : "Paste will only fill the text area"
    })
  }

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
    document.documentElement.classList.toggle("dark", newTheme === "dark")
  }

  const copyToClipboard = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
    } catch (err) {
      // Fallback method for when clipboard API is blocked
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success(successMessage);
      } catch (e) {
        toast.error("Failed to copy. Please copy manually: " + text);
      }
      document.body.removeChild(textArea);
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
      let payload;
      if (uploadType === "text") {
        payload = { content: textToSubmit, isFile: false, expirationOption, allowEditing }
      } else {
        if (selectedFiles.length === 0 && selectedFile) {
          payload = {
            content: selectedFile.base64,
            fileName: selectedFile.name,
            fileType: selectedFile.type,
            isFile: true,
            expirationOption
          }
        } else {
          payload = {
            files: selectedFiles.map(f => ({
              content: f.base64,
              name: f.name,
              type: f.type
            })),
            isMultiFile: true,
            expirationOption
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

        // Save to history
        try {
          const isCodeSnippet = uploadType === "text" && (
            textToSubmit.includes("{") ||
            textToSubmit.includes("}") ||
            textToSubmit.includes("function") ||
            textToSubmit.includes("const ") ||
            textToSubmit.includes("import ") ||
            textToSubmit.includes("<") ||
            textToSubmit.includes("=>")
          );

          const shareType = uploadType === "text" ? (isCodeSnippet ? "code" : "text") : (selectedFiles.length > 1 ? "multi" : "file")
          const historyItem = {
            code,
            type: shareType,
            createdAt: Date.now(),
            expiresAt
          }

          const existing = localStorage.getItem("shareHistory")
          const history = existing ? JSON.parse(existing) : []
          history.push(historyItem)
          localStorage.setItem("shareHistory", JSON.stringify(history))

          // Also save the full paste data to localStorage
          const pasteData: any = {
            createdAt: Date.now(),
            expiresAt,
            allowEditing,
            isCode: isCodeSnippet
          }

          if (uploadType === "text") {
            pasteData.content = textToSubmit
            pasteData.isFile = false
          } else if (selectedFiles.length > 1) {
            pasteData.files = selectedFiles.map(f => ({
              name: f.name,
              type: f.type,
              content: f.base64
            }))
            pasteData.isMultiFile = true
            pasteData.content = ""
          } else if (selectedFile) {
            pasteData.content = selectedFile.base64
            pasteData.fileName = selectedFile.name
            pasteData.fileType = selectedFile.type
            pasteData.isFile = true
          }

          localStorage.setItem(`paste_${code}`, JSON.stringify(pasteData))
        } catch (error) {
          console.error("Failed to save history:", error)
        }

        toast.success("Share created successfully!")
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Failed to create share", {
          description: errorData.details
        })
      }


    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text')
    if (pastedText && uploadType === "text") {
      setContent(pastedText)
      // Only submit if autoPaste is ON
      if (autoPaste) {
        handleSubmit(undefined, pastedText)
      }
    }
  }

  const handleRecall = (e: React.FormEvent) => {
    e.preventDefault()
    if (viewCode.match(/^\d{4}$/)) {
      router.push(`/view/${viewCode}`)
    } else {
      toast.error("Enter a valid 4-digit code")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-9 w-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
              <Zap className="h-5 w-5 fill-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">Paste<span className="text-blue-600">Here</span></span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/recent" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">Recent</Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="h-9 w-9 p-0"
            >
              {theme === "light" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-tight">Auto-Flow</span>
              <Switch checked={autoPaste} onCheckedChange={toggleAutoPaste} />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {!generatedCode ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="text-center space-y-3">
              <h1 className="text-5xl font-black tracking-tight">
                Share Instantly. <span className="text-blue-600">Secure by Design.</span>
              </h1>
              <p className="text-lg text-muted-foreground font-medium">
                Share text snippets, code, or files with a simple 4-digit code
              </p>
            </div>

            {/* Two Column Layout - Create Share & Recall Code */}
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Main Share Card */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border shadow-2xl overflow-hidden">
                <Tabs defaultValue="text" onValueChange={v => setUploadType(v as any)}>
                  {/* Tab Selector */}
                  <div className="p-6 pb-0">
                    <TabsList className="grid w-full grid-cols-2 h-12">
                      <TabsTrigger value="text" className="text-base font-semibold">
                        <Code className="h-4 w-4 mr-2" />
                        Text / Code
                      </TabsTrigger>
                      <TabsTrigger value="files" className="text-base font-semibold">
                        <Files className="h-4 w-4 mr-2" />
                        Files
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* Content Area */}
                  <div className="p-6 space-y-6">
                    <TabsContent value="text" className="mt-0">
                      <Textarea
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        onPaste={handlePaste}
                        placeholder="Paste your text, code snippet, or any content here..."
                        className="min-h-[320px] text-base font-mono resize-none"
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
                    <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Expiration Time</Label>
                        <Select value={expirationOption} onValueChange={setExpirationOption}>
                          <SelectTrigger className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(expirationLabels).map(([v, l]) => (
                              <SelectItem key={v} value={v}>{l}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {uploadType === "text" && (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Options</Label>
                          <div className="flex items-center justify-between h-11 px-4 rounded-lg border bg-slate-50 dark:bg-slate-900">
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
                      className="w-full h-14 text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      {isLoading ? (
                        "Creating Share..."
                      ) : (
                        <>
                          <Lock className="h-5 w-5 mr-2" />
                          Create Secure Share
                        </>
                      )}
                    </Button>
                  </div>
                </Tabs>
              </div>

              {/* Recall Code Card - Side by Side */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-3xl p-8 shadow-2xl flex flex-col justify-center relative overflow-hidden">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>

                <div className="relative z-10">
                  {/* Icon */}
                  <div className="flex justify-center mb-6">
                    <div className="h-20 w-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                      <Search className="h-10 w-10 text-white" />
                    </div>
                  </div>

                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-black text-white mb-3">Already Have a Code?</h2>
                    <p className="text-slate-300 text-lg">Enter your 4-digit code to access shared content</p>
                  </div>

                  <form onSubmit={handleRecall} className="space-y-4">
                    <Input
                      value={viewCode}
                      onChange={e => setViewCode(e.target.value)}
                      placeholder="Enter 4-digit code"
                      maxLength={4}
                      className="h-14 text-center text-2xl font-mono tracking-widest bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 flex-1"
                    />
                    <Button
                      type="submit"
                      size="lg"
                      className="h-14 px-8 bg-white text-slate-900 hover:bg-slate-100 font-bold"
                    >
                      <Search className="h-5 w-5 mr-2" />
                      Access Content
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </Button>
                  </form>

                  {/* Quick Stats */}
                  <div className="mt-8 pt-6 border-t border-slate-700/50">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-black text-white mb-1">256-bit</div>
                        <div className="text-xs text-slate-400 font-medium">Encryption</div>
                      </div>
                      <div>
                        <div className="text-2xl font-black text-white mb-1">Instant</div>
                        <div className="text-xs text-slate-400 font-medium">Access</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Features */}
            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                <span className="font-medium">End-to-End Encrypted</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Auto-Expiring</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-purple-600" />
                <span className="font-medium">No Permanent Storage</span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8 py-12"
          >
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 rounded-3xl p-12 text-center border-2 border-blue-200 dark:border-blue-900">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-green-100 dark:bg-green-900/30 mb-6">
                <Check className="h-8 w-8 text-green-600" />
              </div>

              <h2 className="text-3xl font-black mb-3">Share Created Successfully!</h2>
              <p className="text-muted-foreground mb-8 text-lg">Your secure code is ready to share</p>

              <div className="bg-white dark:bg-slate-900 w-fit mx-auto px-16 py-12 rounded-3xl shadow-2xl mb-8 cursor-pointer hover:scale-105 transition-transform" onClick={() => {
                if (generatedCode) {
                  copyToClipboard(generatedCode, "Code copied to clipboard!");
                }
              }}>
                <div className="text-7xl font-black text-blue-600 tracking-widest">{generatedCode}</div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    if (generatedCode) {
                      copyToClipboard(generatedCode, "Code copied!");
                    }
                  }}
                  className="h-12 px-6 font-semibold"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Code
                </Button>
                <Button
                  size="lg"
                  onClick={() => {
                    if (generatedCode) {
                      copyToClipboard(`${window.location.origin}/view/${generatedCode}`, "Link copied!");
                    }
                  }}
                  className="h-12 px-6 font-semibold bg-gradient-to-r from-blue-600 to-indigo-600"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
              </div>
            </div>

            <div className="text-center">
              <Button
                variant="ghost"
                size="lg"
                onClick={() => {
                  setGeneratedCode(null);
                  setGeneratedExpiresAt(null);
                }}
                className="font-semibold"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Another Share
              </Button>
            </div>
          </motion.div>
        )}
      </main>
      <Footer />
    </div>
  )
}
