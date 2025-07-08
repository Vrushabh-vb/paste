"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Copy, Check, ArrowRight, Clock, Clipboard, FileText, Share2, Upload, FileIcon, Files, Settings, Download } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileUpload } from "@/components/file-upload"
import { EXPIRATION_OPTIONS, formatExpirationTime } from "@/lib/store"

interface FileData {
  name: string;
  type: string;
  base64: string;
  size: number;
}

const expirationLabels: Record<string, string> = {
  '5min': '5 minutes',
  '30min': '30 minutes',
  '1hour': '1 hour',
  '6hours': '6 hours',
  '12hours': '12 hours',
  '1day': '1 day',
  '3days': '3 days',
  '7days': '7 days',
  '30days': '30 days'
}

export default function HomePage() {
  const [content, setContent] = useState("")
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [generatedExpiresAt, setGeneratedExpiresAt] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [viewCode, setViewCode] = useState("")
  const [uploadType, setUploadType] = useState<"text" | "files">("text")
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<FileData[]>([])
  const [allowMultiple, setAllowMultiple] = useState(true)
  const [expirationOption, setExpirationOption] = useState<string>("30min")
  const [allowEditing, setAllowEditing] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate based on upload type
    if (uploadType === "text" && !content.trim()) return
    if (uploadType === "files" && selectedFiles.length === 0 && !selectedFile) return

    setIsLoading(true)
    try {
      let payload;
      
      if (uploadType === "text") {
        payload = { 
          content, 
          isFile: false,
          expirationOption,
          allowEditing: allowEditing && uploadType === "text" // Only allow editing for text
        };
      } else if (uploadType === "files") {
        // If only one file is selected
        if (selectedFiles.length === 0 && selectedFile) {
          payload = { 
            content: selectedFile.base64,
            fileName: selectedFile.name,
            fileType: selectedFile.type,
            isFile: true,
            expirationOption,
            allowEditing: false // Files can't be edited
          };
        } else {
          // For multiple files
          payload = {
            files: selectedFiles.map(file => ({
              content: file.base64,
              name: file.name,
              type: file.type
            })),
            isMultiFile: true,
            expirationOption,
            allowEditing: false // Files can't be edited
          };
        }
      }

      const response = await fetch("/api/paste", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const { code, expiresAt } = await response.json()
        setGeneratedCode(code)
        setGeneratedExpiresAt(expiresAt)
        setContent("")
        setSelectedFile(null)
        setSelectedFiles([])
        toast.success("Share link generated successfully!")
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to generate share link. Please try again.")
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.")
      console.error("Error creating paste:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewCode = (e: React.FormEvent) => {
    e.preventDefault()
    if (viewCode.trim() && /^\d{4}$/.test(viewCode)) {
      router.push(`/view/${viewCode.trim()}`)
    }
  }

  const copyToClipboard = async (text: string) => {
    if (!text) return
    
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success("Copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Copy failed:", err)
      
      // Fallback for older browsers
      try {
        const textArea = document.createElement("textarea")
        textArea.value = text
        document.body.appendChild(textArea)
        textArea.select()
        const successful = document.execCommand("copy")
        document.body.removeChild(textArea)
        
        if (successful) {
          setCopied(true)
          toast.success("Copied to clipboard!")
          setTimeout(() => setCopied(false), 2000)
        } else {
          toast.error("Failed to copy to clipboard")
        }
      } catch (fallbackErr) {
        console.error("Fallback copy failed:", fallbackErr)
        toast.error("Your browser doesn't support clipboard operations")
      }
    }
  }

  const copyCode = () => {
    if (generatedCode) copyToClipboard(generatedCode)
  }
  
  const copyViewUrl = () => {
    if (generatedCode) copyToClipboard(`${window.location.origin}/view/${generatedCode}`)
  }

  const handleFileSelect = (fileData: FileData) => {
    if (allowMultiple) {
      setSelectedFiles([fileData])
    } else {
      setSelectedFile(fileData)
    }
  }

  const handleFilesSelect = (filesData: FileData[]) => {
    setSelectedFiles(filesData)
    setSelectedFile(null)
  }

  const handleLargeFileUploaded = (code: string, expiresAt: number, fileName: string) => {
    // Large file was uploaded and processed - set the result directly
    setGeneratedCode(code)
    setGeneratedExpiresAt(expiresAt)
    setContent("")
    setSelectedFile(null)
    setSelectedFiles([])
    toast.success(`Large file "${fileName}" shared successfully!`)
  }

  const clearFile = () => {
    setSelectedFile(null)
  }
  
  const clearFiles = () => {
    setSelectedFiles([])
  }

  const getTimeRemaining = () => {
    if (!generatedExpiresAt) return ""
    const remaining = generatedExpiresAt - Date.now()
    return formatExpirationTime(remaining)
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center relative">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/20 to-cyan-400/20 rounded-full blur-3xl"></div>
        </div>

        <div className="w-full max-w-4xl px-4 py-8 relative z-10">
          <section className="mb-12 text-center">
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent leading-tight tracking-tight md:text-5xl lg:text-6xl mb-4">
                Share Instantly
              </h1>
              <p className="text-xl text-muted-foreground sm:text-2xl mb-8 max-w-2xl mx-auto">
                Fast, secure file sharing with no limits. Share text or files up to <strong>500MB</strong> with a simple 4-digit code. Large files are automatically optimized for upload.
              </p>
              
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                <Badge variant="secondary" className="px-4 py-2 text-sm">
                  <FileIcon className="w-4 h-4 mr-2" />
                  Lightning Fast
                </Badge>
                <Badge variant="secondary" className="px-4 py-2 text-sm">
                  <Clipboard className="w-4 h-4 mr-2" />
                  Secure & Private
                </Badge>
                <Badge variant="secondary" className="px-4 py-2 text-sm">
                  <FileIcon className="w-4 h-4 mr-2" />
                  500MB total
                </Badge>
                <Badge variant="secondary" className="px-4 py-2 text-sm">
                  <Clock className="w-4 h-4 mr-2" />
                  Custom Expiry
                </Badge>
              </div>
            </motion.div>
          </section>

          <section className="grid lg:grid-cols-2 gap-8">
            {/* Main Upload Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 w-full">
                <CardHeader className="space-y-1 pb-6 text-center">
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Create New Share
                  </CardTitle>
                  <CardDescription className="text-base">
                    Share text or files with advanced options
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!generatedCode ? (
                    <div className="space-y-6">
                      <Tabs 
                        defaultValue="text" 
                        className="w-full"
                        onValueChange={(value) => setUploadType(value as "text" | "files")}
                      >
                        <TabsList className="grid w-full grid-cols-2 mb-6 h-11">
                          <TabsTrigger value="text" className="flex items-center gap-2 text-sm">
                            <FileText className="h-4 w-4" />
                            Text Content
                          </TabsTrigger>
                          <TabsTrigger value="files" className="flex items-center gap-2 text-sm">
                            <Files className="h-4 w-4" />
                            File Upload
                          </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="text" className="mt-0 space-y-4">
                          <div className="space-y-3">
                            <Label htmlFor="content" className="text-sm font-medium">
                              Text Content
                            </Label>
                            <Textarea
                              id="content"
                              value={content}
                              onChange={(e) => setContent(e.target.value)}
                              placeholder="Paste or type your content here..."
                              className="min-h-[200px] resize-y border-2 focus:border-blue-500 transition-colors"
                              required
                            />
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="files" className="mt-0">
                          <FileUpload 
                            onFileSelect={handleFileSelect}
                            onFilesSelect={handleFilesSelect}
                            onClearFile={clearFile}
                            onClearFiles={clearFiles}
                            selectedFile={selectedFile}
                            selectedFiles={selectedFiles}
                            multiple={allowMultiple}
                            onLargeFileUploaded={handleLargeFileUploaded}
                            expirationOption={expirationOption}
                          />
                        </TabsContent>
                      </Tabs>
                      
                      {/* Settings Section */}
                      <Card className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            Share Settings
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="expiration" className="text-sm font-medium">
                              Expires after
                            </Label>
                            <Select value={expirationOption} onValueChange={setExpirationOption}>
                              <SelectTrigger id="expiration">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(expirationLabels).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {uploadType === "text" && (
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <Label htmlFor="editing" className="text-sm font-medium">
                                  Allow editing
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  Let viewers edit this content
                                </p>
                              </div>
                              <Switch
                                id="editing"
                                checked={allowEditing}
                                onCheckedChange={setAllowEditing}
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      
                      <form onSubmit={handleSubmit}>
                        <Button 
                          type="submit" 
                          disabled={
                            isLoading || 
                            (uploadType === "text" && !content.trim()) ||
                            (uploadType === "files" && selectedFiles.length === 0 && !selectedFile)
                          } 
                          className="w-full py-6 text-lg font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transform transition-all duration-200 hover:scale-[1.02] shadow-lg"
                          size="lg"
                        >
                          {isLoading ? (
                            <>
                              <span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                              Generating...
                            </>
                          ) : (
                            <>
                              <Share2 className="mr-3 h-5 w-5" />
                              Generate Share Link
                            </>
                          )}
                        </Button>
                      </form>
                    </div>
                  ) : (
                    <motion.div 
                      className="space-y-6 text-center"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4 }}
                    >
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 rounded-xl p-8 border border-green-200 dark:border-green-800">
                        <h2 className="text-xl font-semibold text-green-700 dark:text-green-400 mb-4 flex items-center justify-center gap-2">
                          <Check className="w-5 h-5" />
                          Share Link Generated!
                        </h2>
                        <div className="text-6xl font-mono font-bold mb-6 text-slate-800 dark:text-slate-200 tracking-wider">
                          {generatedCode}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
                          <Button onClick={copyCode} variant="outline" size="lg" className="flex items-center gap-2 font-medium">
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            Copy Code
                          </Button>
                          <Button onClick={copyViewUrl} variant="outline" size="lg" className="flex items-center gap-2 font-medium">
                            <Share2 className="w-4 h-4" />
                            Copy Full Link
                          </Button>
                        </div>
                        <div className="flex items-center justify-center text-sm text-muted-foreground">
                          <Clock className="w-4 h-4 mr-2" />
                          <p>Expires in {getTimeRemaining()}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          setGeneratedCode(null)
                          setGeneratedExpiresAt(null)
                          setCopied(false)
                        }}
                        variant="outline"
                        className="w-full py-3"
                        size="lg"
                      >
                        Create Another Share
                      </Button>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* View Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 w-full">
                <CardHeader className="space-y-1 pb-6 text-center">
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Access Shared Content
                  </CardTitle>
                  <CardDescription className="text-base">
                    Enter a 4-digit code to view shared content
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleViewCode} className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="viewCode" className="text-sm font-medium">
                        Enter Share Code
                      </Label>
                      <Input
                        id="viewCode"
                        value={viewCode}
                        onChange={(e) => setViewCode(e.target.value)}
                        placeholder="0000"
                        pattern="\d{4}"
                        maxLength={4}
                        className="font-mono text-center text-2xl h-16 border-2 focus:border-purple-500 transition-colors tracking-widest"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={!viewCode.trim() || !/^\d{4}$/.test(viewCode)}
                      className="w-full py-6 text-lg font-medium bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transform transition-all duration-200 hover:scale-[1.02] shadow-lg"
                      size="lg"
                    >
                      <ArrowRight className="w-5 h-5 mr-3" />
                      Access Content
                    </Button>
                  </form>
                </CardContent>
                <CardFooter className="flex justify-center border-t pt-6 text-sm text-muted-foreground">
                  <p className="text-center">
                    Don't have a code? Create a new share on the left to get started.
                  </p>
                </CardFooter>
              </Card>
            </motion.div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
