"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { FileUp, X, File, Plus, Trash2 } from "lucide-react"
import { MAX_FILE_SIZE, MAX_FILES, MAX_TOTAL_FILES_SIZE } from "@/lib/store"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

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
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
          } ${isProcessing ? "opacity-70 pointer-events-none" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileInput}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2"></div>
              <p className="text-sm">Processing...</p>
            </div>
          ) : (
            <>
              <FileUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">Drag and drop a file here or click to browse</p>
              <p className="text-xs text-muted-foreground">Maximum file size: 5MB</p>
            </>
          )}
          <Input 
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleInputChange}
            disabled={isProcessing}
          />
        </div>
      )
    }

    return (
      <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
        <div className="flex items-center gap-3">
          <File className="h-6 w-6 text-primary" />
          <div className="truncate">
            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">{selectedFile.type} • {formatFileSize(selectedFile.size)}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation()
            onClearFile()
          }}
          className="h-8 w-8 rounded-full"
          disabled={isProcessing}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Remove file</span>
        </Button>
      </div>
    )
  }

  // For multiple file upload
  const renderMultipleFiles = () => {
    return (
      <div className="space-y-3">
        <div
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
          } ${isProcessing ? "opacity-70 pointer-events-none" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileInput}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2"></div>
              <p className="text-sm">Processing files...</p>
            </div>
          ) : (
            <>
              <FileUp className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
              <p className="text-sm font-medium">Drag and drop files or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">
                Maximum {MAX_FILES} files, 5MB each (20MB total)
              </p>
            </>
          )}
          <Input 
            ref={fileInputRef}
            type="file"
            multiple={multiple}
            className="hidden"
            onChange={handleInputChange}
            disabled={isProcessing}
          />
        </div>
        
        {selectedFiles.length > 0 && (
          <div className="border rounded-lg">
            <div className="p-2 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}</Badge>
                <span className="text-xs text-muted-foreground">Total: {getTotalSize()}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onClearFiles()
                }}
                className="h-7 text-xs"
                disabled={isProcessing}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Clear all
              </Button>
            </div>
            
            <ScrollArea className="h-[200px] p-2">
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded-md bg-muted/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <File className="h-4 w-4 flex-shrink-0 text-primary" />
                      <div className="truncate min-w-0">
                        <p className="text-xs font-medium truncate">{file.name}</p>
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
                      className="h-6 w-6"
                      disabled={isProcessing}
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            {selectedFiles.length < MAX_FILES && (
              <div className="p-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={triggerFileInput}
                  className="w-full h-7 text-xs"
                  disabled={isProcessing}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add more files ({MAX_FILES - selectedFiles.length} remaining)
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {multiple ? renderMultipleFiles() : renderSingleFile()}
    </div>
  )
} 