"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Copy, Check, ArrowRight, Clock, Clipboard, FileText, Share2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { toast } from "sonner"
import { motion } from "framer-motion"

export default function HomePage() {
  const [content, setContent] = useState("")
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [viewCode, setViewCode] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/paste", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      })

      if (response.ok) {
        const { code } = await response.json()
        setGeneratedCode(code)
        setContent("")
        toast.success("Code generated successfully!")
      } else {
        toast.error("Failed to generate code. Please try again.")
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.")
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
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success("Copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setCopied(true)
      toast.success("Copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const copyCode = () => copyToClipboard(generatedCode!)
  const copyViewUrl = () => copyToClipboard(`${window.location.origin}/view/${generatedCode}`)

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
                Share Text Snippets Instantly
              </motion.h1>
              <motion.p 
                className="mt-3 text-muted-foreground sm:text-lg"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Simple, secure, and fast. Share code, notes, or any text with a 4-digit code.
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
                  <CardTitle className="text-xl font-bold text-center">Copy-Paste Online</CardTitle>
                  <CardDescription className="text-center">
                    Share text content with a simple 4-digit code
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
                        <form onSubmit={handleSubmit} className="space-y-4">
                          <div className="space-y-2">
                            <label htmlFor="content" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                              Enter your text content:
                            </label>
                            <Textarea
                              id="content"
                              value={content}
                              onChange={(e) => setContent(e.target.value)}
                              placeholder="Paste or type your content here..."
                              className="min-h-[300px] resize-y"
                              required
                            />
                          </div>
                          <Button 
                            type="submit" 
                            disabled={isLoading || !content.trim()} 
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
                  <p>All pastes are automatically deleted after 30 minutes</p>
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
