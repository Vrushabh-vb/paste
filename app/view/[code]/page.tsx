"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Copy, Check, ArrowLeft, Clock } from "lucide-react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { toast } from "sonner"
import { motion } from "framer-motion"

interface PasteData {
  content: string
  createdAt: string
}

export default function ViewPastePage({ params }: { params: { code: string } | Promise<{ code: string }> }) {
  const [code, setCode] = useState<string>("");
  
  const [pasteData, setPasteData] = useState<PasteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Resolve params when component mounts
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await Promise.resolve(params);
      setCode(resolvedParams.code);
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
          setError("Paste not found or expired")
        } else {
          setError("Failed to load paste")
        }
      } catch (err) {
        setError("An error occurred while loading the paste")
      } finally {
        setLoading(false)
      }
    }

    fetchPaste()
  }, [code])

  const copyToClipboard = async () => {
    if (!pasteData) return

    try {
      await navigator.clipboard.writeText(pasteData.content)
      setCopied(true)
      toast.success("Copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = pasteData.content
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setCopied(true)
      toast.success("Copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    }
  }

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
                  {pasteData && (
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
                    <p className="mt-4 text-muted-foreground">Loading paste...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <p className="text-destructive text-lg">{error}</p>
                    <p className="text-muted-foreground mt-2">The paste may have expired or the code is invalid.</p>
                  </div>
                ) : pasteData ? (
                  <div className="space-y-3">
                    <div>
                      <Textarea 
                        value={pasteData.content} 
                        readOnly 
                        className="min-h-[250px] resize-y bg-muted/50 font-mono text-sm"
                      />
                    </div>
                  </div>
                ) : null}
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
