"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatedHeader } from "@/components/animated-header"
import { AnimatedCard } from "@/components/animated-card"
import { TextInput } from "@/components/text-input"
import { CodeInput } from "@/components/code-input"
import { CodeDisplay } from "@/components/code-display"
import { AnimatedDivider } from "@/components/animated-divider"

export default function HomePage() {
  const [content, setContent] = useState("")
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  const handleSubmit = async () => {
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
      } else {
        alert("Failed to generate code. Please try again.")
      }
    } catch (error) {
      console.error("Error generating code:", error)
      alert("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewCode = (code: string) => {
    if (code.trim() && /^\d{4}$/.test(code)) {
      router.push(`/view/${code.trim()}`)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
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
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const copyCode = () => copyToClipboard(generatedCode!)
  const copyViewUrl = () => copyToClipboard(`${window.location.origin}/view/${generatedCode}`)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <AnimatedHeader />
        
        <AnimatedCard>
          <div className="p-6">
            {!generatedCode ? (
              <div className="space-y-6">
                <TextInput 
                  value={content}
                  onChange={setContent}
                  onSubmit={handleSubmit}
                  isLoading={isLoading}
                />
                
                <AnimatedDivider />
                
                <CodeInput onSubmit={handleViewCode} />
              </div>
            ) : (
              <CodeDisplay 
                code={generatedCode}
                onCopyCode={copyCode}
                onCopyLink={copyViewUrl}
                copied={copied}
              />
            )}
            
            {generatedCode && (
              <div className="mt-6">
                <button
                  onClick={() => {
                    setGeneratedCode(null)
                    setCopied(false)
                  }}
                  className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Create Another Paste
                </button>
              </div>
            )}
          </div>
        </AnimatedCard>
      </div>
    </div>
  )
}
