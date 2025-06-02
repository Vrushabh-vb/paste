"use client"

import { motion } from "framer-motion"
import { ArrowRight, KeyRound } from "lucide-react"
import { useState, useRef, useEffect } from "react"

interface CodeInputProps {
  onSubmit: (code: string) => void
}

export function CodeInput({ onSubmit }: CodeInputProps) {
  const [code, setCode] = useState<string>("")
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Auto focus on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.trim() && /^\d{4}$/.test(code)) {
      onSubmit(code.trim())
    }
  }
  
  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <label htmlFor="viewCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
        <KeyRound className="w-4 h-4 mr-2 text-gray-600 dark:text-gray-400" />
        <span>I have a code:</span>
      </label>
      
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            id="viewCode"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Enter 4-digit code"
            pattern="\d{4}"
            maxLength={4}
            className={`w-full font-mono text-center text-2xl bg-white dark:bg-gray-800 border ${isFocused ? 'border-gray-500 dark:border-gray-400' : 'border-gray-200 dark:border-gray-700'} rounded-lg py-3 px-4 focus:outline-none transition-colors`}
          />
          
          {/* Digit placeholders */}
          {code.length < 4 && (
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
              <div className="flex space-x-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className={`w-6 h-1 rounded ${
                      i < code.length ? 'bg-gray-600 dark:bg-gray-400' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    initial={{ width: 6 }}
                    animate={{ 
                      width: i === code.length ? 20 : 6,
                      opacity: i < code.length ? 1 : 0.5
                    }}
                    transition={{ duration: 0.2 }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        
        <motion.button
          type="submit"
          disabled={!code.trim() || !/^\d{4}$/.test(code)}
          className="mt-3 w-full flex items-center justify-center px-4 py-2 bg-gradient-to-r from-gradient-start to-gradient-end text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <ArrowRight className="w-4 h-4 mr-2" />
          View
        </motion.button>
      </form>
    </motion.div>
  )
} 