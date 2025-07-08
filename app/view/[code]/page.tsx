"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Copy, Check, ArrowLeft, Clock, Download, FileIcon, Files } from "lucide-react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

interface FileData {
  name: string;
  type: string;
  content: string;
}

interface PasteData {
  content: string
  createdAt: string
  fileName?: string
  fileType?: string
  isFile?: boolean
  files?: FileData[]
  isMultiFile?: boolean
}

export default function ViewPastePage({ params }: { params: { code: string } | Promise<{ code: string }> }) {
  const [code, setCode] = useState<string>("");
  
  const [pasteData, setPasteData] = useState<PasteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

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
        <div className="flex flex-col items-center py-4 space-y-4">
          <div className="bg-muted rounded-full p-4">
            <Files className="h-10 w-10 text-primary" />
          </div>
          
          <div className="text-center mb-2">
            <h3 className="text-lg font-medium">Multiple Files</h3>
            <div className="flex items-center justify-center gap-2 mt-1">
              <Badge variant="outline">{pasteData.files.length} files</Badge>
            </div>
          </div>
          
          <Button 
            onClick={downloadAllFiles} 
            className="flex items-center gap-2 mb-2"
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
          
          <div className="w-full border rounded-lg">
            <div className="p-3 border-b">
              <h4 className="font-medium text-sm">File List</h4>
            </div>
            <ScrollArea className="h-[250px]">
              <div className="p-2 space-y-2">
                {pasteData.files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                    <div className="flex items-center gap-3">
                      <FileIcon className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.content)}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => downloadSingleFile(file)}
                      size="sm"
                      variant="outline"
                      className="h-8"
                      disabled={isDownloading}
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />
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
        <div className="flex flex-col items-center justify-center py-6 space-y-4">
          <div className="bg-muted rounded-full p-6">
            <FileIcon className="h-12 w-12 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-medium">{pasteData.fileName}</h3>
            <p className="text-sm text-muted-foreground">{pasteData.fileType} • {formatFileSize(pasteData.content)}</p>
          </div>
          <Button 
            onClick={downloadFile} 
            className="flex items-center gap-2"
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

    return (
      <div>
        <Textarea 
          value={pasteData.content} 
          readOnly 
          className="min-h-[250px] resize-y bg-muted/50 font-mono text-sm"
        />
      </div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-screen-md px-4 py-8">
          <div className="mb-4">
            <Link href="/">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
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
            <Card className="border shadow-sm w-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center">
                    Code: <span className="font-mono ml-1">{code}</span>
                  </span>
                  {pasteData && !pasteData.isFile && !pasteData.isMultiFile && (
                    <Button onClick={copyToClipboard} variant="outline" size="sm" className="flex items-center gap-2 h-8">
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                    <p className="mt-4 text-muted-foreground">Loading content...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <p className="text-destructive text-lg">{error}</p>
                    <p className="text-muted-foreground mt-2">The content may have expired or the code is invalid.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {renderContent()}
                  </div>
                )}
              </CardContent>
              {pasteData && !loading && !error && (
                <CardFooter className="border-t pt-3 flex justify-between items-center text-xs text-muted-foreground">
                  <div className="flex items-center">
                    <Clock className="mr-1.5 h-3.5 w-3.5" />
                    Created: {new Date(pasteData.createdAt).toLocaleString()}
                  </div>
                  <div>Expires after 30 minutes</div>
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
