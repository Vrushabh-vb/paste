"use client"

import { motion } from "framer-motion"

interface AnimatedDividerProps {
  text?: string
}

export function AnimatedDivider({ text = "OR" }: AnimatedDividerProps) {
  return (
    <motion.div 
      className="relative my-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <div className="absolute inset-0 flex items-center">
        <motion.span 
          className="w-full border-t border-gray-200 dark:border-gray-700"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        />
      </div>
      
      <div className="relative flex justify-center text-xs uppercase">
        <motion.span 
          className="bg-gray-50 dark:bg-gray-900 px-3 py-1 text-gray-500 dark:text-gray-400 rounded-full"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ 
            duration: 0.3, 
            delay: 0.4,
            type: "spring",
            stiffness: 100
          }}
        >
          {text}
        </motion.span>
      </div>
    </motion.div>
  )
} 