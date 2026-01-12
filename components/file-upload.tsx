"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { FileUp, X, File, Plus, Trash2, CloudUpload, ShieldCheck, CheckCircle2 } from "lucide-react"
import { MAX_FILE_SIZE, MAX_FILES, MAX_TOTAL_FILES_SIZE } from "@/lib/store"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { motion, AnimatePresence } from "framer-motion"

interface FileData {
  name: string;
  type: string;
  base64: string;
  size: number;
}

interface FileUploadProps {
  onFileSelect: (fileData: FileData) => void;
  onFilesSelect: (filesData: FileData[]) => void;
  onClearFile: () => void;
  onClearFiles: () => void;
  selectedFile: FileData | null;
  selectedFiles: FileData[];
  multiple?: boolean;
}

export function FileUpload({
  onFileSelect,
  onFilesSelect,
  onClearFile,
  onClearFiles,
  selectedFile,
  selectedFiles,
  multiple = false
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (file: File | null) => {
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File size exceeds 500MB limit`)
      return
    }
    setIsProcessing(true)
    try {
      const base64 = await convertToBase64(file)
      onFileSelect({ base64, name: file.name, type: file.type || 'text/plain', size: file.size })
      toast.success("File processed")
    } catch (error) {
      toast.error("Processing failed")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFilesChange = async (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return
    const totalFiles = selectedFiles.length + filesList.length
    if (totalFiles > MAX_FILES) {
      toast.error(`Limit reached (${MAX_FILES} files)`)
      return
    }
    setIsProcessing(true)
    const newFiles: FileData[] = []
    let currentTotalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0)

    try {
      for (let i = 0; i < filesList.length; i++) {
        const file = filesList[i]
        if (file.size > MAX_FILE_SIZE || currentTotalSize + file.size > MAX_TOTAL_FILES_SIZE) {
          toast.error(`${file.name} exceeds limits`)
          continue
        }
        const base64 = await convertToBase64(file)
        newFiles.push({ base64, name: file.name, type: file.type || 'text/plain', size: file.size })
        currentTotalSize += file.size
      }
      if (newFiles.length > 0) onFilesSelect([...selectedFiles, ...newFiles])
    } finally {
      setIsProcessing(false)
    }
  }

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
    })
  }

  const handleDrag = (e: React.DragEvent, active: boolean) => {
    e.preventDefault()
    setIsDragging(active)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (!e.dataTransfer.files?.length) return
    if (multiple) handleFilesChange(e.dataTransfer.files)
    else handleFileChange(e.dataTransfer.files[0])
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    const units = ['KB', 'MB', 'GB']
    let size = bytes / 1024
    let unitIndex = 0
    while (size > 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    return size.toFixed(1) + ' ' + units[unitIndex]
  }

  return (
    <div className="space-y-6">
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => handleDrag(e, true)}
        onDragLeave={(e) => handleDrag(e, false)}
        onDrop={handleDrop}
        className={`group relative overflow-hidden h-48 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer flex flex-col items-center justify-center ${isDragging
          ? "border-primary bg-primary/5 scale-[0.99]"
          : "border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
          } ${isProcessing ? "opacity-50 pointer-events-none" : ""}`}
      >
        <div className="absolute top-4 right-4 group-hover:translate-x-1 transition-transform">
          <ShieldCheck className="h-5 w-5 text-slate-300 dark:text-slate-700" />
        </div>

        {isProcessing ? (
          <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
            <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Encrypting Assets...</p>
          </div>
        ) : (
          <div className="text-center p-6 space-y-4">
            <div className={`mx-auto h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-300 ${isDragging ? "bg-primary text-white scale-110" : "bg-primary/10 text-primary group-hover:scale-110"}`}>
              <CloudUpload className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold mb-1">Click or drag files to share</p>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                Up to 500MB • All formats secured
              </p>
            </div>
          </div>
        )}

        <Input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          className="hidden"
          onChange={(e) => {
            if (multiple) handleFilesChange(e.target.files)
            else handleFileChange(e.target.files?.[0] || null)
          }}
        />
      </div>

      {(multiple ? selectedFiles.length > 0 : selectedFile) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Staged for sharing</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={multiple ? onClearFiles : onClearFile}
              className="h-8 text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg group"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2 group-hover:scale-110 transition-transform" />
              Remove All
            </Button>
          </div>

          <ScrollArea className={`${multiple ? 'h-48' : 'h-auto'} rounded-2xl border border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-2`}>
            <div className="space-y-2">
              <AnimatePresence>
                {(multiple ? selectedFiles : [selectedFile!]).map((file, idx) => (
                  <motion.div
                    key={file.name + idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                        <File className="h-4.5 w-4.5" />
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-bold truncate pr-4">{file.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{formatFileSize(file.size)} • {file.type || 'Binary'}</p>
                      </div>
                    </div>
                    {multiple && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const updated = [...selectedFiles]
                          updated.splice(idx, 1)
                          onFilesSelect(updated)
                        }}
                        className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </div>
  )
}
