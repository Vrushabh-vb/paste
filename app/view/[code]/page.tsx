"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Copy, Check, ArrowLeft, FileText } from "lucide-react"
import { AnimatedCard } from "@/components/animated-card"

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
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <Link href="/">
            <motion.button
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              whileHover={{ x: -3 }}
              whileTap={{ scale: 0.98 }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </motion.button>
          </Link>
        </div>

        <AnimatedCard>
          {loading ? (
            <div className="p-8 flex flex-col items-center justify-center">
              <motion.div 
                className="w-10 h-10 border-3 border-t-gradient-start border-gray-200 dark:border-gray-700 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <motion.p 
                className="mt-4 text-gray-600 dark:text-gray-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Loading paste...
              </motion.p>
            </div>
          ) : (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <motion.div 
                  className="flex items-center"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="bg-gradient-to-r from-gradient-start to-gradient-end p-2 rounded-md mr-3">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-lg font-medium">
                    Paste Code: <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{code}</span>
                  </h2>
                </motion.div>
                
                {pasteData && (
                  <motion.button
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    {copied ? "Copied!" : "Copy"}
                  </motion.button>
                )}
              </div>
              
              {error ? (
                <motion.div 
                  className="text-center py-8"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-md border border-red-100 dark:border-red-900/20">
                    <p className="text-red-600 dark:text-red-400 text-lg font-medium mb-2">{error}</p>
                    <p className="text-gray-600 dark:text-gray-400">The paste may have expired or the code is invalid.</p>
                  </div>
                </motion.div>
              ) : pasteData ? (
                <motion.div 
                  className="space-y-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Content:</label>
                    <div className="relative">
                      <textarea
                        value={pasteData.content}
                        readOnly
                        className="w-full min-h-[250px] resize-y bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md py-3 px-4 font-mono text-sm"
                      />
                      <div className="absolute top-2 right-2 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs text-gray-500 dark:text-gray-400">
                        {pasteData.content.length} characters
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                    <motion.div 
                      className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"
                      animate={{ 
                        scale: [1, 1.1, 1],
                        opacity: [1, 0.7, 1]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    Created: {new Date(pasteData.createdAt).toLocaleString()}
                  </div>
                </motion.div>
              ) : null}
            </div>
          )}
        </AnimatedCard>
      </div>
    </div>
  )
}
