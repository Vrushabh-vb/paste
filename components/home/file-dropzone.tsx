"use client"

import { useRef } from "react"
import { CloudUpload, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FileIcon } from "@/components/file-icon"
import { MAX_FILE_SIZE, MAX_FILES, MAX_TOTAL_FILES_SIZE, MB } from "@/lib/config"
import { formatFileSize } from "@/lib/format"
import type { StagedFile } from "@/lib/stage-files"
import { cn } from "@/lib/utils"

interface FileDropzoneProps {
  files: StagedFile[]
  onAdd: (files: File[]) => void
  onRemove: (id: string) => void
  onClear: () => void
  disabled?: boolean
}

export function FileDropzone({ files, onAdd, onRemove, onClear, disabled }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const total = files.reduce((s, f) => s + f.size, 0)
  const hasFiles = files.length > 0

  const pick = () => inputRef.current?.click()

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose files to share"
        onChange={e => {
          if (e.target.files) onAdd(Array.from(e.target.files))
          e.target.value = "" // lets the same file be chosen again after removing it
        }}
      />

      <button
        type="button"
        onClick={pick}
        disabled={disabled}
        className={cn(
          "group flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-input bg-muted/40 text-center transition-colors hover:border-gold-soft hover:bg-muted/70 disabled:opacity-60",
          hasFiles ? "gap-1 px-4 py-5" : "gap-3 px-6 py-12 sm:py-14",
        )}
      >
        {hasFiles ? (
          <span className="flex items-center gap-2 text-sm font-medium">
            <Plus className="h-4 w-4 text-gold" aria-hidden /> Add more files
          </span>
        ) : (
          <>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-card text-gold shadow-sm ring-1 ring-border transition-transform duration-300 group-hover:-translate-y-0.5">
              <CloudUpload className="h-5 w-5" aria-hidden />
            </span>
            <span className="space-y-1">
              <span className="block text-[15px] font-medium">
                Drop files anywhere, or <span className="underline decoration-gold-soft underline-offset-4">browse</span>
              </span>
              <span className="block text-sm text-muted-foreground">
                Images, video, zips, documents · up to {MAX_FILE_SIZE / MB} MB each
              </span>
              <span className="block text-xs text-muted-foreground/80">You can also paste a screenshot with Ctrl+V</span>
            </span>
          </>
        )}
      </button>

      {hasFiles && (
        <div className="animate-fade-in space-y-3">
          <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
            <span className="tabular">
              {files.length} of {MAX_FILES} files · {formatFileSize(total)} of {MAX_TOTAL_FILES_SIZE / MB} MB
            </span>
            <button type="button" onClick={onClear} disabled={disabled} className="rounded font-medium transition-colors hover:text-destructive">
              Remove all
            </button>
          </div>
          <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {files.map(f => (
              <li key={f.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 pr-2">
                <FileIcon name={f.name} type={f.type} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={f.name}>{f.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatFileSize(f.size)} · {f.type}
                  </p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => onRemove(f.id)} disabled={disabled} aria-label={`Remove ${f.name}`}>
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
