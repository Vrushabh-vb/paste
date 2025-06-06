"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Copy, Check, ArrowRight, Clock, Clipboard, FileText, Share2, Upload, FileIcon, Files } from "lucide-react"
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

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-screen-md px-4 py-8">
          <section className="mb-8">
            <div className="text-center">
              <motion.h1 
                className="text-3xl font-bold leading-tight tracking-tighter md:text-4xl lg:text-5xl"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                Share Instantly
              </motion.h1>
              <motion.p 
                className="mt-3 text-muted-foreground sm:text-lg"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Simple, secure, and fast. Share text or files with a 4-digit code.
              </motion.p>
            </div>
          </section>

          <section>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              <Card className="border shadow-sm w-full">
                <CardHeader className="space-y-1 pb-4">
                  <CardTitle className="text-xl font-bold text-center">Paste-Here Online</CardTitle>
                  <CardDescription className="text-center">
                    Share text or files with a simple 4-digit code
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!generatedCode ? (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-base font-medium flex items-center mb-3">
                          <FileText className="h-4 w-4 mr-2" />
                          Create New Paste
                        </h3>
                        
                        <Tabs 
                          defaultValue="text" 
                          className="w-full mb-4"
                          onValueChange={(value) => setUploadType(value as "text" | "files")}
                        >
                          <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="text" className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Text
                            </TabsTrigger>
                            <TabsTrigger value="files" className="flex items-center gap-2">
                              <Files className="h-4 w-4" />
                              Files
                            </TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="text" className="mt-0">
                            <div className="space-y-2">
                              <label htmlFor="content" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Enter your text content:
                              </label>
                              <Textarea
                                id="content"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Paste or type your content here..."
                                className="min-h-[200px] resize-y"
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
                            />
                          </TabsContent>
                        </Tabs>
                        
                        <form onSubmit={handleSubmit} className="mt-4">
                          <Button 
                            type="submit" 
                            disabled={
                              isLoading || 
                              (uploadType === "text" && !content.trim()) ||
                              (uploadType === "files" && selectedFiles.length === 0 && !selectedFile)
                            } 
                            className="w-full py-5 text-base font-medium"
                            size="lg"
                          >
                            {isLoading ? (
                              <>
                                <span className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                                Generating...
                              </>
                            ) : (
                              <>
                                <Share2 className="mr-2 h-5 w-5" />
                                Generate Code
                              </>
                            )}
                          </Button>
                        </form>
                      </div>
                      
                      <div className="relative flex items-center">
                        <div className="flex-grow border-t"></div>
                        <span className="mx-3 flex-shrink text-xs text-muted-foreground">OR</span>
                        <div className="flex-grow border-t"></div>
                      </div>
                      
                      <div>
                        <h3 className="text-base font-medium flex items-center mb-3">
                          <Clipboard className="h-4 w-4 mr-2" />
                          View Existing Paste
                        </h3>
                        <form onSubmit={handleViewCode} className="space-y-2">
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label htmlFor="viewCode" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2 block">
                                Enter 4-digit code:
                              </label>
                              <Input
                                id="viewCode"
                                value={viewCode}
                                onChange={(e) => setViewCode(e.target.value)}
                                placeholder="Enter 4-digit code"
                                pattern="\d{4}"
                                maxLength={4}
                                className="font-mono text-center text-lg"
                              />
                            </div>
                            <div className="flex items-end">
                              <Button 
                                type="submit" 
                                disabled={!viewCode.trim() || !/^\d{4}$/.test(viewCode)}
                                size="lg"
                                className="h-10"
                              >
                                <ArrowRight className="w-4 h-4 mr-2" />
                                View
                              </Button>
                            </div>
                          </div>
                        </form>
                      </div>
                    </div>
                  ) : (
                    <motion.div 
                      className="space-y-5"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4 }}
                    >
                      <div className="text-center">
                        <h2 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-3">Code Generated!</h2>
                        <div className="bg-muted rounded-lg p-6 mb-4">
                          <div className="text-5xl font-mono font-bold mb-5">{generatedCode}</div>
                          <div className="flex gap-3 justify-center">
                            <Button onClick={copyCode} variant="outline" size="sm" className="flex items-center gap-2">
                              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              Copy Code
                            </Button>
                            <Button onClick={copyViewUrl} variant="outline" size="sm" className="flex items-center gap-2">
                              <Share2 className="w-4 h-4" />
                              Copy Link
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-center text-sm text-muted-foreground">
                          <Clock className="w-4 h-4 mr-1" />
                          <p>Expires in 30 minutes</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          setGeneratedCode(null)
                          setCopied(false)
                        }}
                        variant="outline"
                        className="w-full"
                      >
                        Create Another Paste
                      </Button>
                    </motion.div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-center border-t pt-4 text-xs text-muted-foreground">
                  <p>All content is automatically deleted after 30 minutes</p>
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
