"use client"

import { motion } from "framer-motion"
import { FileText, Sparkles } from "lucide-react"
import { useState } from "react"

interface TextInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isLoading: boolean
}

export function TextInput({ value, onChange, onSubmit, isLoading }: TextInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value.trim()) {
      onSubmit()
    }
  }
  
  return (
    <motion.form 
      onSubmit={handleSubmit}
      className="space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
          <FileText className="w-4 h-4 mr-2 text-gray-600 dark:text-gray-400" />
          <span>Enter your text content:</span>
        </label>
        
        <div className="relative">
          <textarea
            id="content"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Paste or type your content here..."
            className={`w-full min-h-[200px] resize-y bg-white dark:bg-gray-800 border ${isFocused ? 'border-gray-500 dark:border-gray-400' : 'border-gray-200 dark:border-gray-700'} rounded-lg py-3 px-4 focus:outline-none transition-colors`}
            required
          />
          
          {/* Character count */}
          <motion.div 
            className="absolute bottom-2 right-2 text-xs text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-gray-800/80 px-2 py-1 rounded-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: value.length > 0 ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          >
            {value.length} characters
          </motion.div>
        </div>
      </div>
      
      <motion.button
        type="submit"
        disabled={isLoading || !value.trim()}
        className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-gradient-start to-gradient-end text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Code
          </>
        )}
      </motion.button>
    </motion.form>
  )
} 