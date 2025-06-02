"use client"

import { motion } from "framer-motion"
import { Clipboard, ClipboardCheck } from "lucide-react"
import { useState, useEffect } from "react"

export function AnimatedHeader() {
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    setIsVisible(true)
  }, [])
  
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-gradient-start to-gradient-end py-8 px-4 rounded-lg mb-6">
      {/* Minimal background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-white/5 rounded-full"
            style={{
              width: Math.random() * 40 + 10,
              height: Math.random() * 40 + 10,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0.05, 0.1, 0.05],
              scale: [1, 1.1, 1],
            }}
            transition={{ 
              duration: Math.random() * 4 + 3,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>
      
      {/* Header content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <motion.div 
          className="flex items-center mb-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : -20 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="bg-white/10 p-2 rounded-full mr-2"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 5, repeat: Infinity }}
          >
            <Clipboard className="w-6 h-6 text-white" />
          </motion.div>
          <motion.div
            className="bg-white/10 p-2 rounded-full ml-2"
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 5, repeat: Infinity, delay: 0.5 }}
          >
            <ClipboardCheck className="w-6 h-6 text-white" />
          </motion.div>
        </motion.div>
        
        <motion.h1 
          className="text-3xl md:text-4xl font-bold text-white mb-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : -20 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          Copy-Paste Online
        </motion.h1>
        
        <motion.p
          className="text-lg text-white/90"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : -20 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          Share text with simple 4-digit codes
        </motion.p>
      </div>
    </div>
  )
} 