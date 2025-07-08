"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Copy, Check, ArrowRight, Clock, Clipboard, FileText, Share2, Upload, FileIcon, Files, Sparkles, Shield, Zap, CheckCircle2, ExternalLink } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileUpload } from "@/components/file-upload"

interface FileData {
  name: string;
  type: string;
  base64: string;
  size: number;
}

export default function HomePage() {
  const [content, setContent] = useState("")
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [viewCode, setViewCode] = useState("")
  const [uploadType, setUploadType] = useState<"text" | "files">("text")
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<FileData[]>([])
  const [allowMultiple, setAllowMultiple] = useState(true)
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
        payload = { content, isFile: false };
      } else if (uploadType === "files") {
        // If only one file is selected
        if (selectedFiles.length === 0 && selectedFile) {
          payload = { 
            content: selectedFile.base64,
            fileName: selectedFile.name,
            fileType: selectedFile.type,
            isFile: true
          };
        } else {
          // For multiple files
          payload = {
            files: selectedFiles.map(file => ({
              content: file.base64,
              name: file.name,
              type: file.type
            })),
            isMultiFile: true
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
        const { code } = await response.json()
        setGeneratedCode(code)
        setContent("")
        setSelectedFile(null)
        setSelectedFiles([])
        toast.success("Code generated successfully!")
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to generate code. Please try again.")
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

  const clearFile = () => {
    setSelectedFile(null)
  }
  
  const clearFiles = () => {
    setSelectedFiles([])
  }

  const features = [
    {
      icon: Shield,
      title: "Secure Sharing",
      description: "End-to-end encrypted with automatic deletion"
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Generate and share codes in milliseconds"
    },
    {
      icon: Clock,
      title: "Auto-Expiry",
      description: "All content automatically deleted after 30 minutes"
    }
  ]

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background to-muted/30">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 lg:py-12">
        <div className="w-full max-w-4xl">
          {/* Hero Section */}
          <section className="text-center mb-12 lg:mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                <span>Simple • Secure • Fast</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                Share <span className="gradient-text">Instantly</span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                The fastest way to share text and files with anyone, anywhere. 
                <br className="hidden sm:block" />
                Simple 4-digit codes, military-grade security.
              </p>
              
              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-3xl mx-auto">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                    className="text-center"
                  >
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-blue-600/10 mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </section>

          {/* Main Content */}
          <section className="max-w-2xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="border-0 shadow-2xl shadow-primary/5 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl card-hover">
                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-2xl font-bold gradient-text">Start Sharing</CardTitle>
                  <CardDescription className="text-base">
                    Choose your content type and get a shareable code instantly
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-8">
                  {!generatedCode ? (
                    <div className="space-y-8">
                      {/* Upload Type Tabs */}
                      <Tabs 
                        defaultValue="text" 
                        className="w-full"
                        onValueChange={(value) => setUploadType(value as "text" | "files")}
                      >
                        <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-muted/50">
                          <TabsTrigger value="text" className="flex items-center gap-2 font-medium">
                            <FileText className="h-4 w-4" />
                            Text Content
                          </TabsTrigger>
                          <TabsTrigger value="files" className="flex items-center gap-2 font-medium">
                            <Files className="h-4 w-4" />
                            File Upload
                          </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="text" className="mt-6">
                          <div className="space-y-4">
                            <label htmlFor="content" className="block text-sm font-semibold text-foreground">
                              Your Content
                            </label>
                            <Textarea
                              id="content"
                              value={content}
                              onChange={(e) => setContent(e.target.value)}
                              placeholder="Paste your text, code, or any content here..."
                              className="min-h-[160px] resize-none border-muted-foreground/20 focus:border-primary transition-colors text-base"
                              required
                            />
                            <div className="text-xs text-muted-foreground text-right">
                              {content.length} characters
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="files" className="mt-6">
                          <FileUpload 
                            onFileSelect={handleFileSelect}
                            onFilesSelect={handleFilesSelect}
                            onClearFile={clearFile}
                            onClearFiles={clearFiles}
                            selectedFile={selectedFile}
                            selectedFiles={selectedFiles}
                            multiple={allowMultiple}
                          />
                        </TabsContent>
                      </Tabs>
                      
                      {/* Generate Button */}
                      <form onSubmit={handleSubmit}>
                        <Button 
                          type="submit" 
                          disabled={
                            isLoading || 
                            (uploadType === "text" && !content.trim()) ||
                            (uploadType === "files" && selectedFiles.length === 0 && !selectedFile)
                          } 
                          className="w-full h-14 text-base font-semibold bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg shadow-primary/25 button-shine"
                          size="lg"
                        >
                          {isLoading ? (
                            <>
                              <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                              Generating Code...
                            </>
                          ) : (
                            <>
                              <Share2 className="mr-3 h-5 w-5" />
                              Generate Share Code
                            </>
                          )}
                        </Button>
                      </form>
                      
                      {/* Divider */}
                      <div className="relative flex items-center py-4">
                        <div className="flex-grow border-t border-muted-foreground/20"></div>
                        <span className="mx-4 text-sm text-muted-foreground font-medium bg-background px-3 py-1 rounded-full">
                          OR
                        </span>
                        <div className="flex-grow border-t border-muted-foreground/20"></div>
                      </div>
                      
                      {/* View Existing */}
                      <div className="space-y-4">
                        <div className="text-center">
                          <h3 className="text-lg font-semibold flex items-center justify-center gap-2 mb-2">
                            <Clipboard className="h-5 w-5 text-primary" />
                            View Existing Content
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Have a 4-digit code? Enter it below to access the content
                          </p>
                        </div>
                        
                        <form onSubmit={handleViewCode} className="space-y-4">
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <Input
                                id="viewCode"
                                value={viewCode}
                                onChange={(e) => setViewCode(e.target.value)}
                                placeholder="Enter 4-digit code"
                                pattern="\d{4}"
                                maxLength={4}
                                className="h-12 font-mono text-center text-xl tracking-widest border-muted-foreground/20 focus:border-primary"
                              />
                            </div>
                            <Button 
                              type="submit" 
                              disabled={!viewCode.trim() || !/^\d{4}$/.test(viewCode)}
                              size="lg"
                              className="h-12 px-6 bg-secondary hover:bg-secondary/80"
                              variant="secondary"
                            >
                              <ArrowRight className="w-5 h-5 mr-2" />
                              View
                            </Button>
                          </div>
                        </form>
                      </div>
                    </div>
                  ) : (
                    /* Success State */
                    <motion.div 
                      className="space-y-8 text-center"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <div className="space-y-4">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500/10 to-emerald-500/10 mb-4">
                          <CheckCircle2 className="h-8 w-8 text-green-600" />
                        </div>
                        
                        <h2 className="text-2xl font-bold text-green-600 dark:text-green-400">
                          Success! Your Code is Ready
                        </h2>
                        
                        <div className="bg-gradient-to-r from-muted/50 to-muted/30 rounded-2xl p-8 border border-muted-foreground/10">
                          <div className="text-6xl md:text-7xl font-bold font-mono mb-6 tracking-wider gradient-text">
                            {generatedCode}
                          </div>
                          
                          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                            <Button 
                              onClick={copyCode} 
                              variant="outline" 
                              className="flex items-center gap-2 h-11 font-medium border-primary/20 hover:bg-primary/5"
                            >
                              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              Copy Code
                            </Button>
                            <Button 
                              onClick={copyViewUrl} 
                              variant="outline" 
                              className="flex items-center gap-2 h-11 font-medium border-primary/20 hover:bg-primary/5"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Copy Link
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-full px-4 py-2 max-w-fit mx-auto">
                          <Clock className="w-4 h-4 text-orange-500" />
                          <span>Expires in 30 minutes</span>
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => {
                          setGeneratedCode(null)
                          setCopied(false)
                        }}
                        variant="outline"
                        className="w-full h-12 font-medium"
                      >
                        Create Another Share
                      </Button>
                    </motion.div>
                  )}
                </CardContent>
                
                <CardFooter className="text-center border-t border-muted-foreground/10 pt-6">
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground w-full">
                    <Shield className="h-3.5 w-3.5 text-green-600" />
                    <span>All content is encrypted and automatically deleted after 30 minutes</span>
                  </div>
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
