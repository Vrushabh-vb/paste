"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Copy, Check, ArrowLeft, Clock, Download, FileIcon, Files, Edit3, Save, X, Eye, AlertCircle } from "lucide-react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface FileData {
  name: string;
  type: string;
  content: string;
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
}

export default function ViewPastePage({ params }: { params: { code: string } | Promise<{ code: string }> }) {
  const [code, setCode] = useState<string>("");
  const [pasteData, setPasteData] = useState<PasteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Resolve params when component mounts
  useEffect(() => {
    const resolveParams = async () => {
      try {
        const resolvedParams = await Promise.resolve(params);
        setCode(resolvedParams.code);
      } catch (err) {
        console.error("Error resolving params:", err);
        setError("Invalid URL parameters");
        setLoading(false);
      }
    };
    
    resolveParams();
  }, [params]);

  // Only fetch paste when code is available
  useEffect(() => {
    if (!code) return;
    
    const fetchPaste = async () => {
      try {
        const response = await fetch(`/api/paste/${code}`)

        if (response.ok) {
          const data = await response.json()
          setPasteData(data)
          setEditContent(data.content || "")
        } else if (response.status === 404) {
          setError("Content not found or expired")
        } else {
          setError("Failed to load content")
        }
      } catch (err) {
        console.error("Error fetching paste:", err);
        setError("An error occurred while loading the content")
      } finally {
        setLoading(false)
      }
    }

    fetchPaste()
  }, [code])

  const copyToClipboard = async () => {
    if (!pasteData || pasteData.isFile || pasteData.isMultiFile || !pasteData.content) return

    try {
      await navigator.clipboard.writeText(pasteData.content)
      setCopied(true)
      toast.success("Copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Copy failed:", err);
      
      // Fallback for older browsers
      try {
        const textArea = document.createElement("textarea")
        textArea.value = pasteData.content
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
        console.error("Fallback copy failed:", fallbackErr);
        toast.error("Your browser doesn't support clipboard operations")
      }
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
    setEditContent(pasteData?.content || "")
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditContent(pasteData?.content || "")
  }

  const handleSaveEdit = async () => {
    if (!editContent.trim() || !code) {
      toast.error("Content cannot be empty")
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch("/api/paste", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          content: editContent
        }),
      })

      if (response.ok) {
        setPasteData(prev => prev ? { ...prev, content: editContent } : null)
        setIsEditing(false)
        toast.success("Content updated successfully!")
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to update content")
      }
    } catch (error) {
      console.error("Error updating content:", error)
      toast.error("An error occurred while updating content")
    } finally {
      setIsSaving(false)
    }
  }

  const downloadFile = () => {
    if (!pasteData || !pasteData.isFile || !pasteData.fileName || !pasteData.content) return;

    setIsDownloading(true);
    try {
      // Create a link element
      const link = document.createElement('a');
      link.href = pasteData.content;
      link.download = pasteData.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Download started!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download file");
    } finally {
      setIsDownloading(false);
    }
  };
  
  const downloadSingleFile = (file: FileData) => {
    if (!file || !file.name || !file.content) return;
    
    try {
      // Create a link element
      const link = document.createElement('a');
      link.href = file.content;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Downloading ${file.name}`);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download file");
    }
  };
  
  const downloadAllFiles = () => {
    if (!pasteData?.files || pasteData.files.length === 0) return;
    
    setIsDownloading(true);
    try {
      // Download each file with a slight delay to prevent browser issues
      pasteData.files.forEach((file, index) => {
        if (!file.name || !file.content) return;
        
        setTimeout(() => {
          try {
            const link = document.createElement('a');
            link.href = file.content;
            link.download = file.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } catch (err) {
            console.error(`Error downloading file ${file.name}:`, err);
          }
        }, index * 500); // 500ms delay between downloads
      });
      
      toast.success("Downloading all files");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download files");
    } finally {
      setTimeout(() => {
        setIsDownloading(false);
      }, pasteData.files.length * 500 + 500); // Wait for all downloads to complete
    }
  };

  const formatFileSize = (base64String: string): string => {
    // Estimate file size from base64 string (base64 is ~33% larger than the original file)
    if (!base64String) return "Unknown size";
    const base64Content = base64String.split(';base64,')[1] || "";
    const bytes = (base64Content.length * 3) / 4;
    
    if (bytes < 1024) return bytes.toFixed(0) + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const renderContent = () => {
    if (!pasteData) return null;

    if (pasteData.isMultiFile && pasteData.files && pasteData.files.length > 0) {
      return (
        <div className="flex flex-col items-center py-6 space-y-6">
          <div className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full p-6">
            <Files className="h-12 w-12 text-blue-600 dark:text-blue-400" />
          </div>
          
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">Multiple Files Shared</h3>
            <div className="flex items-center justify-center gap-3 mb-4">
              <Badge variant="outline" className="px-3 py-1">{pasteData.files.length} files</Badge>
              <Badge variant="outline" className="px-3 py-1">
                <Eye className="w-3 h-3 mr-1" />
                {pasteData.downloadCount} views
              </Badge>
            </div>
          </div>
          
          <Button 
            onClick={downloadAllFiles} 
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            size="lg"
            disabled={isDownloading}
          >
            {isDownloading ? (
              <>
                <span className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                Downloading...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Download All Files
              </>
            )}
          </Button>
          
          <div className="w-full border rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <div className="p-4 border-b">
              <h4 className="font-semibold text-base">File List</h4>
            </div>
            <ScrollArea className="h-[300px]">
              <div className="p-4 space-y-3">
                {pasteData.files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg bg-white dark:bg-slate-900/50 shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.content)}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => downloadSingleFile(file)}
                      size="sm"
                      variant="outline"
                      className="h-9 px-3"
                      disabled={isDownloading}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      );
    } else if (pasteData.isFile) {
      return (
        <div className="flex flex-col items-center justify-center py-8 space-y-6">
          <div className="bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-full p-8">
            <FileIcon className="h-16 w-16 text-green-600 dark:text-green-400" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold">{pasteData.fileName}</h3>
            <div className="flex items-center justify-center gap-3">
              <Badge variant="outline" className="px-3 py-1">{pasteData.fileType}</Badge>
              <Badge variant="outline" className="px-3 py-1">{formatFileSize(pasteData.content)}</Badge>
              <Badge variant="outline" className="px-3 py-1">
                <Eye className="w-3 h-3 mr-1" />
                {pasteData.downloadCount} views
              </Badge>
            </div>
          </div>
          <Button 
            onClick={downloadFile} 
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            size="lg"
            disabled={isDownloading}
          >
            {isDownloading ? (
              <>
                <span className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                Downloading...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Download File
              </>
            )}
          </Button>
        </div>
      );
    }

    if (isEditing) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Edit3 className="w-5 h-5" />
              Editing Content
            </h3>
            <div className="flex gap-2">
              <Button 
                onClick={handleCancelEdit} 
                variant="outline" 
                size="sm"
                disabled={isSaving}
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button 
                onClick={handleSaveEdit} 
                size="sm"
                disabled={isSaving || !editContent.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSaving ? (
                  <>
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
          <Textarea 
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[300px] resize-y font-mono text-sm border-2 focus:border-blue-500"
            placeholder="Enter your content here..."
          />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Text Content</h3>
          <div className="flex gap-2">
            <Badge variant="outline" className="px-3 py-1">
              <Eye className="w-3 h-3 mr-1" />
              {pasteData.downloadCount} views
            </Badge>
            {pasteData.allowEditing && (
              <Button 
                onClick={handleEdit} 
                variant="outline" 
                size="sm"
                className="flex items-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </Button>
            )}
          </div>
        </div>
        <Textarea 
          value={pasteData.content} 
          readOnly 
          className="min-h-[300px] resize-y bg-slate-50 dark:bg-slate-800/50 font-mono text-sm border-2"
        />
      </div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center relative">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/10 to-cyan-400/10 rounded-full blur-3xl"></div>
        </div>

        <div className="w-full max-w-4xl px-4 py-8 relative z-10">
          <div className="mb-6">
            <Link href="/">
              <Button variant="outline" size="lg" className="flex items-center gap-2 shadow-sm">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Button>
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm dark:bg-slate-900/90 w-full">
              <CardHeader className="pb-6">
                <CardTitle className="text-2xl flex items-center justify-between">
                  <span className="flex items-center gap-3">
                    <span className="text-muted-foreground">Share Code:</span>
                    <span className="font-mono bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent text-3xl">{code}</span>
                  </span>
                  {pasteData && !pasteData.isFile && !pasteData.isMultiFile && (
                    <Button onClick={copyToClipboard} variant="outline" size="lg" className="flex items-center gap-2">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? "Copied!" : "Copy Text"}
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                    <p className="mt-6 text-muted-foreground text-lg">Loading content...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-6 w-fit mx-auto mb-6">
                      <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
                    </div>
                    <Alert variant="destructive" className="max-w-md mx-auto">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-base">
                        {error}
                      </AlertDescription>
                    </Alert>
                    <p className="text-muted-foreground mt-4">The content may have expired or the code is invalid.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {renderContent()}
                  </div>
                )}
              </CardContent>
              {pasteData && !loading && !error && (
                <CardFooter className="border-t pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex items-center">
                      <Clock className="mr-2 h-4 w-4" />
                      Created: {new Date(pasteData.createdAt).toLocaleString()}
                    </div>
                    <div className="flex items-center">
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Expires in: {pasteData.timeRemaining}
                    </div>
                  </div>
                  {pasteData.allowEditing && !pasteData.isFile && !pasteData.isMultiFile && (
                    <Badge variant="secondary" className="px-3 py-1">
                      <Edit3 className="w-3 h-3 mr-1" />
                      Editable
                    </Badge>
                  )}
                </CardFooter>
              )}
            </Card>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
