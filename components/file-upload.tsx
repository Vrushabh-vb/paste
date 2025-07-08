"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { FileUp, X, File, Plus, Trash2, Upload, Cloud, CheckCircle2 } from "lucide-react"
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

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File size exceeds 5MB limit (${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB)`)
      return
    }

    setIsProcessing(true)
    try {
      const base64 = await convertToBase64(file)
      onFileSelect({
        base64,
        name: file.name,
        type: file.type,
        size: file.size
      })
      toast.success("File uploaded successfully!")
    } catch (error) {
      toast.error("Failed to process file")
      console.error("File processing error:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFilesChange = async (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return
    
    // Check number of files
    const totalFiles = selectedFiles.length + filesList.length
    if (totalFiles > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files allowed`)
      return
    }

    // Process each file
    setIsProcessing(true)
    const newFiles: FileData[] = []
    let totalExistingSize = selectedFiles.reduce((sum, file) => sum + file.size, 0)
    
    try {
      for (let i = 0; i < filesList.length; i++) {
        const file = filesList[i]
        
        // Check individual file size
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`File "${file.name}" exceeds 5MB limit`)
          continue
        }
        
        // Check if adding this file would exceed the total limit
        if (totalExistingSize + file.size > MAX_TOTAL_FILES_SIZE) {
          toast.error(`Total file size would exceed 20MB limit`)
          break
        }
        
        try {
          const base64 = await convertToBase64(file)
          newFiles.push({
            base64,
            name: file.name,
            type: file.type,
            size: file.size
          })
          totalExistingSize += file.size
        } catch (error) {
          toast.error(`Failed to process file "${file.name}"`)
          console.error("File processing error:", error)
        }
      }
      
      if (newFiles.length > 0) {
        onFilesSelect([...selectedFiles, ...newFiles])
        toast.success(`${newFiles.length} file${newFiles.length > 1 ? 's' : ''} uploaded successfully!`)
      }
    } catch (error) {
      toast.error("An error occurred while processing files")
      console.error("Files processing error:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        if (reader.result) {
          resolve(reader.result as string)
        } else {
          reject(new Error("Failed to convert file to base64"))
        }
      }
      reader.onerror = (error) => reject(error)
    })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return
    
    if (multiple) {
      handleFilesChange(e.dataTransfer.files)
    } else if (e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0])
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    
    if (multiple) {
      handleFilesChange(e.target.files)
    } else if (e.target.files.length > 0) {
      handleFileChange(e.target.files[0])
    }
  }

  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles]
    newFiles.splice(index, 1)
    onFilesSelect(newFiles)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    else return (bytes / 1048576).toFixed(1) + ' MB'
  }

  const getTotalSize = (): string => {
    const totalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0)
    return formatFileSize(totalBytes)
  }

  // For single file upload
  const renderSingleFile = () => {
    if (!selectedFile) {
      return (
        <motion.div
          className={`relative overflow-hidden border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 group ${
            isDragging 
              ? "border-primary bg-gradient-to-br from-primary/10 to-blue-600/10 scale-[1.02]" 
              : "border-muted-foreground/30 hover:border-primary/50 hover:bg-gradient-to-br hover:from-primary/5 hover:to-blue-600/5"
          } ${isProcessing ? "opacity-70 pointer-events-none" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {isProcessing ? (
            <motion.div 
              className="flex flex-col items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="relative mb-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary"></div>
                <Upload className="h-6 w-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-primary" />
              </div>
              <p className="text-sm font-medium">Processing your file...</p>
              <p className="text-xs text-muted-foreground mt-1">This won't take long</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="relative mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-blue-600/10 group-hover:from-primary/20 group-hover:to-blue-600/20 transition-all duration-300">
                  <Cloud className="h-8 w-8 text-primary group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">Drop your file here</h3>
              <p className="text-sm text-muted-foreground mb-4">
                or <span className="text-primary font-medium">click to browse</span> from your device
              </p>
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  <span>Up to 5MB</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  <span>Any file type</span>
                </div>
              </div>
            </motion.div>
          )}
          <Input 
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleInputChange}
            disabled={isProcessing}
          />
        </motion.div>
      )
    }

    return (
      <motion.div 
        className="flex items-center justify-between p-4 border border-muted-foreground/20 rounded-2xl bg-gradient-to-r from-muted/50 to-muted/30 backdrop-blur-sm"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-blue-600/10">
            <File className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate text-foreground">{selectedFile.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground">{selectedFile.type}</p>
              <span className="text-xs text-muted-foreground">•</span>
              <Badge variant="secondary" className="text-xs px-2 py-0">
                {formatFileSize(selectedFile.size)}
              </Badge>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation()
            onClearFile()
          }}
          className="h-9 w-9 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
          disabled={isProcessing}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Remove file</span>
        </Button>
      </motion.div>
    )
  }

  // For multiple file upload
  const renderMultipleFiles = () => {
    return (
      <div className="space-y-6">
        <motion.div
          className={`relative overflow-hidden border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 group ${
            isDragging 
              ? "border-primary bg-gradient-to-br from-primary/10 to-blue-600/10 scale-[1.01]" 
              : "border-muted-foreground/30 hover:border-primary/50 hover:bg-gradient-to-br hover:from-primary/5 hover:to-blue-600/5"
          } ${isProcessing ? "opacity-70 pointer-events-none" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          whileHover={{ scale: 1.005 }}
          whileTap={{ scale: 0.995 }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {isProcessing ? (
            <motion.div 
              className="flex flex-col items-center justify-center py-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="relative mb-3">
                <div className="h-10 w-10 animate-spin rounded-full border-3 border-primary/20 border-t-primary"></div>
                <Upload className="h-5 w-5 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-primary" />
              </div>
              <p className="text-sm font-medium">Processing files...</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-blue-600/10 group-hover:from-primary/20 group-hover:to-blue-600/20 transition-all duration-300 mb-3">
                <Cloud className="h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="text-base font-semibold mb-1 text-foreground">Drop multiple files here</h3>
              <p className="text-sm text-muted-foreground mb-3">
                or <span className="text-primary font-medium">click to browse</span>
              </p>
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  <span>Up to {MAX_FILES} files</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  <span>5MB each</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  <span>20MB total</span>
                </div>
              </div>
            </motion.div>
          )}
          <Input 
            ref={fileInputRef}
            type="file"
            multiple={multiple}
            className="hidden"
            onChange={handleInputChange}
            disabled={isProcessing}
          />
        </motion.div>
        
        <AnimatePresence>
          {selectedFiles.length > 0 && (
            <motion.div 
              className="border border-muted-foreground/20 rounded-2xl overflow-hidden bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="p-4 border-b border-muted-foreground/10 bg-gradient-to-r from-muted/50 to-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-semibold">
                      {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      Total: <span className="font-medium text-foreground">{getTotalSize()}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onClearFiles()
                    }}
                    className="h-8 text-xs hover:bg-destructive/10 hover:text-destructive transition-colors"
                    disabled={isProcessing}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear all
                  </Button>
                </div>
              </div>
              
              <ScrollArea className="h-[240px] p-4">
                <div className="space-y-3">
                  {selectedFiles.map((file, index) => (
                    <motion.div 
                      key={index} 
                      className="flex items-center justify-between p-3 border border-muted-foreground/10 rounded-xl bg-gradient-to-r from-background/50 to-muted/20 hover:from-background/80 hover:to-muted/40 transition-all duration-200"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      layout
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-blue-600/10">
                          <File className="h-4 w-4 text-primary" />
                        </div>
                        <div className="truncate min-w-0">
                          <p className="text-sm font-medium truncate text-foreground">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(index)
                        }}
                        className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                        disabled={isProcessing}
                      >
                        <X className="h-3.5 w-3.5" />
                        <span className="sr-only">Remove</span>
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
              
              {selectedFiles.length < MAX_FILES && (
                <div className="p-4 border-t border-muted-foreground/10">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={triggerFileInput}
                    className="w-full h-10 text-sm border border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 transition-colors"
                    disabled={isProcessing}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add more files ({MAX_FILES - selectedFiles.length} remaining)
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {multiple ? renderMultipleFiles() : renderSingleFile()}
    </div>
  )
} 