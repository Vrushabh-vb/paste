"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CloudUpload, Loader2, Paperclip, Send, Type } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ExpiryPicker } from "@/components/home/expiry-picker"
import { FileDropzone } from "@/components/home/file-dropzone"
import { createFileShare, createTextShare, type CreatedShare } from "@/lib/client-api"
import {
  DEFAULT_EXPIRATION,
  DEFAULT_TTL_SECONDS,
  EXPIRATION_OPTIONS,
  MAX_FILE_TTL_SECONDS,
  MAX_TEXT_BYTES,
  MB,
} from "@/lib/config"
import { looksLikeCode } from "@/lib/detect-code"
import { formatBytes, utf8Length } from "@/lib/format"
import { nameClipboardFile, stageFiles, type StagedFile } from "@/lib/stage-files"
import { saveToHistory, type ShareHistoryItem } from "@/lib/store"
import { cn } from "@/lib/utils"

type Mode = "text" | "files"

function OptionTile({
  id,
  title,
  description,
  checked,
  onChange,
}: {
  id: string
  title: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border bg-muted/30 p-3.5 transition-colors hover:bg-muted/60"
    >
      <span className="space-y-0.5">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs leading-relaxed text-muted-foreground">{description}</span>
      </span>
      <Switch id={id} checked={checked} onCheckedChange={onChange} className="mt-0.5" />
    </label>
  )
}

export function Composer({ onCreated }: { onCreated: (created: CreatedShare) => void }) {
  const [mode, setMode] = useState<Mode>("text")
  const [content, setContent] = useState("")
  const [files, setFiles] = useState<StagedFile[]>([])
  const [expiration, setExpiration] = useState(DEFAULT_EXPIRATION)
  const [allowEditing, setAllowEditing] = useState(false)
  const [autoShare, setAutoShare] = useState(true)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)

  const filesRef = useRef(files)
  filesRef.current = files
  const busyRef = useRef(busy)
  busyRef.current = busy

  useEffect(() => {
    try {
      const saved = localStorage.getItem("autoPaste")
      if (saved !== null) setAutoShare(saved === "true")
    } catch {
      /* storage unavailable: keep default */
    }
  }, [])

  const changeAutoShare = (value: boolean) => {
    setAutoShare(value)
    try {
      localStorage.setItem("autoPaste", String(value))
    } catch {
      /* ignore */
    }
  }

  // Files can only live 24h: don't leave a longer expiry selected when switching to files.
  useEffect(() => {
    if (mode === "files" && EXPIRATION_OPTIONS[expiration] > MAX_FILE_TTL_SECONDS) setExpiration("1day")
  }, [mode, expiration])

  const addFiles = useCallback((incoming: File[]) => {
    if (incoming.length === 0 || busyRef.current) return
    const { files: next, errors } = stageFiles(filesRef.current, incoming)
    errors.slice(0, 3).forEach(message => toast.error(message))
    filesRef.current = next
    setFiles(next)
    if (next.length > 0) setMode("files")
  }, [])

  // Drop files anywhere on the page, or paste a screenshot, from either tab.
  useEffect(() => {
    let depth = 0
    const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types?.includes("Files")
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth++
      setDragging(true)
    }
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault()
    }
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setDragging(false)
      addFiles(Array.from(e.dataTransfer?.files ?? []))
    }
    const onPaste = (e: ClipboardEvent) => {
      const pasted = Array.from(e.clipboardData?.files ?? [])
      // Spreadsheet/Word copies carry an image *and* text: only treat it as a file when there is no text.
      if (pasted.length === 0 || e.clipboardData?.getData("text/plain")) return
      e.preventDefault()
      addFiles(pasted.map(f => nameClipboardFile(f)))
      toast.success(pasted.length === 1 ? "Image added from clipboard" : `${pasted.length} files added`)
    }
    window.addEventListener("dragenter", onEnter)
    window.addEventListener("dragleave", onLeave)
    window.addEventListener("dragover", onOver)
    window.addEventListener("drop", onDrop)
    window.addEventListener("paste", onPaste)
    return () => {
      window.removeEventListener("dragenter", onEnter)
      window.removeEventListener("dragleave", onLeave)
      window.removeEventListener("dragover", onOver)
      window.removeEventListener("drop", onDrop)
      window.removeEventListener("paste", onPaste)
    }
  }, [addFiles])

  const textBytes = utf8Length(content)
  const tooLarge = textBytes > MAX_TEXT_BYTES
  const canSubmit = mode === "text" ? content.trim().length > 0 && !tooLarge : files.length > 0

  const submit = async (override?: string) => {
    if (busy) return
    const text = override ?? content
    if (mode === "text") {
      if (!text.trim()) return
      if (utf8Length(text) > MAX_TEXT_BYTES) {
        return void toast.error(`That's over ${MAX_TEXT_BYTES / MB} MB. Save it as a file and upload it instead.`)
      }
    } else if (files.length === 0) {
      return
    }

    setBusy(true)
    setProgress(null)
    try {
      const ttl = EXPIRATION_OPTIONS[expiration] ?? DEFAULT_TTL_SECONDS
      let created: CreatedShare
      let type: ShareHistoryItem["type"]
      if (mode === "text") {
        const isCode = looksLikeCode(text)
        type = isCode ? "code" : "text"
        created = await createTextShare({ text, ttl, allowEditing, isCode })
      } else {
        type = files.length > 1 ? "multi" : "file"
        setProgress(0)
        created = await createFileShare(files.map(f => f.rawFile), ttl, setProgress)
      }
      // Store what the server decided (it may shorten the expiry), not what we asked for.
      saveToHistory({ code: created.code, url: created.url, type, createdAt: created.createdAt, expiresAt: created.expiresAt })
      onCreated(created)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  const onTextPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData("text")
    // "Share on paste" only fires into an empty box, so pasting a snippet into existing text never surprises you.
    if (autoShare && pasted.trim() && content.trim() === "") {
      e.preventDefault()
      setContent(pasted)
      void submit(pasted)
    }
  }

  const idleLabel =
    mode === "text"
      ? "Create share"
      : files.length === 0
        ? "Upload files"
        : `Upload ${files.length} ${files.length === 1 ? "file" : "files"}`
  const label = progress !== null ? `Uploading ${Math.round(progress * 100)}%` : busy ? "Creating share…" : idleLabel

  return (
    <>
      {dragging && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm animate-fade-in"
        >
          <div className="flex h-full max-h-[28rem] w-full max-w-3xl flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-gold-soft bg-card/90 shadow-2xl">
            <CloudUpload className="h-10 w-10 text-gold" />
            <p className="text-2xl font-semibold tracking-tight">Drop to share</p>
            <p className="text-sm text-muted-foreground">Release anywhere on the page</p>
          </div>
        </div>
      )}

      <section aria-labelledby="composer-title" className="surface overflow-hidden">
        <h2 id="composer-title" className="sr-only">Create a share</h2>
        <Tabs value={mode} onValueChange={v => setMode(v as Mode)}>
          <div className="px-4 pt-4 sm:px-6 sm:pt-6">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="text" className="sm:min-w-36">
                <Type aria-hidden /> Text or code
              </TabsTrigger>
              <TabsTrigger value="files" className="sm:min-w-36">
                <Paperclip aria-hidden /> Files
                {files.length > 0 && (
                  <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-5 text-primary-foreground">
                    {files.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-4 sm:p-6">
            <TabsContent value="text" className="mt-0">
              <div className="relative">
                <Textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  onPaste={onTextPaste}
                  onKeyDown={e => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault()
                      void submit()
                    }
                  }}
                  disabled={busy}
                  spellCheck={false}
                  aria-label="Text or code to share"
                  aria-invalid={tooLarge}
                  placeholder="Paste text or code here…"
                  className="min-h-[160px] resize-y pb-9 font-mono text-[13.5px] leading-relaxed sm:min-h-[180px]"
                />
                <span
                  className={cn(
                    "pointer-events-none absolute bottom-3 right-4 text-xs tabular",
                    tooLarge ? "font-medium text-destructive" : "text-muted-foreground",
                  )}
                >
                  {formatBytes(textBytes)} / {MAX_TEXT_BYTES / MB} MB
                </span>
              </div>
            </TabsContent>

            <TabsContent value="files" className="mt-0">
              <FileDropzone
                files={files}
                onAdd={addFiles}
                onRemove={id => {
                  const next = files.filter(f => f.id !== id)
                  filesRef.current = next
                  setFiles(next)
                }}
                onClear={() => {
                  filesRef.current = []
                  setFiles([])
                }}
                disabled={busy}
              />
            </TabsContent>

            <div className="mt-5 space-y-5 border-t border-border pt-5">
              <ExpiryPicker value={expiration} onChange={setExpiration} filesOnly={mode === "files"} disabled={busy} />

              {mode === "text" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <OptionTile
                    id="opt-edit"
                    title="Allow editing"
                    description="Anyone with the link can edit"
                    checked={allowEditing}
                    onChange={setAllowEditing}
                  />
                  <OptionTile
                    id="opt-paste"
                    title="Share on paste"
                    description="Shares instantly when you paste"
                    checked={autoShare}
                    onChange={changeAutoShare}
                  />
                </div>
              )}

              <div>
                <Button size="lg" className="w-full" disabled={busy || !canSubmit} onClick={() => void submit()}>
                  {busy ? <Loader2 className="animate-spin" /> : <Send />}
                  {label}
                  {mode === "text" && !busy && (
                    <kbd className="ml-1 hidden rounded border border-primary-foreground/25 px-1.5 py-0.5 font-mono text-[10.5px] font-normal opacity-70 sm:inline">
                      Ctrl ↵
                    </kbd>
                  )}
                </Button>
                {progress !== null && <Progress value={progress * 100} className="mt-3" aria-label="Upload progress" />}
              </div>
            </div>
          </div>
        </Tabs>
      </section>
    </>
  )
}
