"use client"

import { motion } from "framer-motion"
import { Copy, Check } from "lucide-react"
import { useState } from "react"

interface CodeDisplayProps {
  code: string
  onCopyCode: () => void
  onCopyLink: () => void
  copied: boolean
}

export function CodeDisplay({ code, onCopyCode, onCopyLink, copied }: CodeDisplayProps) {
  const [isHovering, setIsHovering] = useState(false)
  
  const digitVariants = {
    initial: { opacity: 0, y: 10 },
    animate: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.08,
        duration: 0.3,
        type: "spring",
        stiffness: 100
      }
    })
  }
  
  return (
    <motion.div 
      className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-4 text-center"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Code Generated</h2>
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 mb-4 relative overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
        {/* Code display */}
        <div className="relative z-10">
          <div className="text-4xl font-mono font-bold text-gray-800 dark:text-gray-200 mb-2 flex justify-center">
            {code.split('').map((digit, i) => (
              <motion.span
                key={i}
                className="inline-block mx-1 text-gradient-start dark:text-gradient-end"
                custom={i}
                variants={digitVariants}
                initial="initial"
                animate="animate"
              >
                {digit}
              </motion.span>
            ))}
          </div>
          
          <div className="flex gap-2 justify-center mt-4">
            <motion.button
              onClick={onCopyCode}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? "Copied!" : "Copy Code"}
            </motion.button>
            
            <motion.button
              onClick={onCopyLink}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Copy className="w-4 h-4" />
              Copy Link
            </motion.button>
          </div>
        </div>
      </div>
      
      <motion.p 
        className="text-sm text-gray-600 dark:text-gray-400"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Share this code with others to let them view your content at:{" "}
        <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">
          /view/{code}
        </code>
      </motion.p>
    </motion.div>
  )
} 