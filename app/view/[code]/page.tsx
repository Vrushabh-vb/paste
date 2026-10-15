"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Download, FileQuestion, Link2, Pencil, ShieldAlert, TimerOff, WrapText, X, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { CopyButton } from "@/components/copy-button"
import { ExpiryMeter } from "@/components/countdown"
import { FileIcon } from "@/components/file-icon"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { getShare, updateShareText } from "@/lib/client-api"
import { formatBytes, formatCode, formatFileSize, utf8Length } from "@/lib/format"
import { decodeLegacyPaste } from "@/lib/store"
import { cn } from "@/lib/utils"

interface ViewFile {
  name: string
  type: string
  size: number
  url: string
  preview: "image" | "video" | "audio" | null
  legacy?: boolean // pre-v2 file: url is a data: URL or a public R2 URL
}

interface ViewData {
  source: "server" | "legacy"
  ref: string // what the API is called with (the share id)
  code: string
  text: string
  files: ViewFile[]
  createdAt: number
  expiresAt: number
  allowEditing: boolean
  isCode: boolean
}

type Problem = { icon: typeof FileQuestion; title: string; message: string }

const PROBLEMS = {
  notFound: { icon: FileQuestion, title: "Nothing here", message: "This share doesn't exist, or it has already expired and been deleted." },
  expired: { icon: TimerOff, title: "This share has expired", message: "It was deleted automatically when its timer ran out." },
  tooMany: { icon: ShieldAlert, title: "Slow down a little", message: "Too many attempts from your connection. Please wait a minute and try again." },
  broken: { icon: FileQuestion, title: "Link looks incomplete", message: "We couldn't read this link. Ask the sender to share it again." },
} satisfies Record<string, Problem>

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" })

// `params` is a Promise in Next 15+, a plain object in older versions.
export default function ViewPage({ params }: { params: { code: string } | Promise<{ code: string }> }) {
  // The URL segment is either the unguessable share id (from a link) or the 6-digit code.
  const [segment, setSegment] = useState("")
  const [hashKey, setHashKey] = useState(0)
  const [data, setData] = useState<ViewData | null>(null)
  const [problem, setProblem] = useState<Problem | null>(null)
  const [loading, setLoading] = useState(true)
  const [wrap, setWrap] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    Promise.resolve(params).then(
      p => setSegment(p.code),
      () => {
        setProblem(PROBLEMS.broken)
        setLoading(false)
      },
    )
  }, [params])

  // Pre-v2 links differ only by their #hash; the browser doesn't reload for that, so watch for it.
  useEffect(() => {
    const onHashChange = () => setHashKey(k => k + 1)
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  useEffect(() => {
    if (!segment) return
    let cancelled = false
    setProblem(null)
    setData(null)
    setIsEditing(false)
    setLoading(true)

    // Pre-v2 links carry their content in the #hash and never touch the server.
    const hash = window.location.hash.slice(1)
    if (hash) {
      const record = decodeLegacyPaste(hash)
      if (!record) setProblem(PROBLEMS.broken)
      else if (record.expiresAt < Date.now()) setProblem(PROBLEMS.expired)
      else {
        const files: ViewFile[] = (record.files ?? []).map(f => ({
          name: f.name, type: f.type, size: f.size, url: f.url || f.content || "", preview: null, legacy: true,
        }))
        if (record.isFile && files.length === 0) {
          files.push({ name: record.fileName ?? "file", type: record.fileType ?? "", size: record.fileSize ?? 0, url: record.content, preview: null, legacy: true })
        }
        setData({
          source: "legacy", ref: segment, code: segment, text: files.length ? "" : record.content, files,
          createdAt: record.createdAt, expiresAt: record.expiresAt, allowEditing: false, isCode: !!record.isCode,
        })
      }
      setLoading(false)
      return
    }

    getShare(segment)
      .then(s => {
        if (cancelled) return
        setData({
          source: "server", ref: s.id, code: s.code, text: s.text ?? "", files: s.files ?? [],
          createdAt: s.createdAt, expiresAt: s.expiresAt, allowEditing: s.allowEditing, isCode: s.isCode,
        })
        setEditContent(s.text ?? "")
      })
      .catch((err: Error & { status?: number }) => {
        if (cancelled) return
        if (err.status === 404) setProblem(PROBLEMS.notFound)
        else if (err.status === 429) setProblem(PROBLEMS.tooMany)
        else setProblem({ icon: FileQuestion, title: "Couldn't load this share", message: err.message })
      })
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [segment, hashKey])

  // Remove the content from the screen the moment the share expires.
  const expiresAt = data?.expiresAt
  useEffect(() => {
    if (!expiresAt) return
    const ms = expiresAt - Date.now()
    const expire = () => {
      setData(null)
      setProblem(PROBLEMS.expired)
    }
    if (ms <= 0) return expire()
    const t = setTimeout(expire, Math.min(ms, 2 ** 31 - 1))
    return () => clearTimeout(t)
  }, [expiresAt])

  const saveEdit = async () => {
    if (!data) return
    setIsSaving(true)
    try {
      const updated = await updateShareText(data.ref, editContent)
      setData({ ...data, text: updated.text ?? editContent })
      setIsEditing(false)
      toast.success("Saved. Everyone with the link now sees this version.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save your changes")
    } finally {
      setIsSaving(false)
    }
  }

  const downloadFile = useCallback((file: ViewFile) => {
    const a = document.createElement("a")
    a.download = file.name
    if (file.legacy) {
      a.href = file.url
      a.target = "_blank"
      a.rel = "noopener noreferrer"
    } else {
      a.href = `${file.url}?dl=1` // server answers with a short-lived signed link + attachment headers
    }
    document.body.appendChild(a)
    a.click()
    a.remove()
  }, [])

  const saveText = () => {
    if (!data) return
    const url = URL.createObjectURL(new Blob([data.text], { type: "text/plain;charset=utf-8" }))
    const a = document.createElement("a")
    a.href = url
    a.download = `pastehere-${data.code}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const isFiles = !!data && data.files.length > 0
  const kindLabel = !data ? "" : isFiles ? (data.files.length === 1 ? "Shared file" : `${data.files.length} shared files`) : data.isCode ? "Shared code" : "Shared text"
  const totalSize = data?.files.reduce((s, f) => s + f.size, 0) ?? 0
  const lineCount = data && !isFiles ? data.text.split("\n").length : 0

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        {loading ? (
          <div className="space-y-8" role="status" aria-label="Loading share">
            <div className="flex items-end justify-between gap-6">
              <div className="space-y-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-12 w-56" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="hidden h-10 w-44 sm:block" />
            </div>
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>
        ) : problem || !data ? (
          <div className="mx-auto max-w-md animate-fade-up py-16 text-center sm:py-24">
            {(() => {
              const p = problem ?? PROBLEMS.notFound
              const Icon = p.icon
              return (
                <>
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-gold">
                    <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden />
                  </span>
                  <h1 className="mt-6 font-serif text-4xl leading-tight">{p.title}</h1>
                  <p className="mt-3 text-balance text-muted-foreground">{p.message}</p>
                  <Button asChild size="lg" className="mt-8">
                    <Link href="/">Share something new</Link>
                  </Button>
                </>
              )
            })()}
          </div>
        ) : (
          <div className="animate-fade-up space-y-8">
            <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow">{kindLabel}</p>
                <h1 className="mt-2 font-mono text-4xl font-medium tabular tracking-[0.06em] sm:text-5xl" aria-label={`Code ${data.code.split("").join(" ")}`}>
                  {formatCode(data.code)}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">Shared {dateFmt.format(data.createdAt)}</p>
              </div>
              <ExpiryMeter createdAt={data.createdAt} expiresAt={data.expiresAt} className="sm:w-56" />
            </header>

            {isFiles ? (
              <section aria-label="Shared files" className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-muted-foreground tabular">
                    {data.files.length} {data.files.length === 1 ? "file" : "files"} · {formatFileSize(totalSize)}
                  </p>
                  {data.files.length > 1 && (
                    <Button variant="outline" size="sm" onClick={() => data.files.forEach((f, i) => setTimeout(() => downloadFile(f), i * 450))}>
                      <Download /> Download all
                    </Button>
                  )}
                </div>
                <ul className="grid items-start gap-4 sm:grid-cols-2">
                  {data.files.map((file, i) => (
                    <li key={i} className="surface flex flex-col overflow-hidden sm:[&:only-child]:col-span-2">
                      {file.preview === "image" ? (
                        <a href={file.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${file.name} full size`} className="block bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={file.url} alt={file.name} loading="lazy" className="max-h-[28rem] w-full object-contain" />
                        </a>
                      ) : file.preview === "video" ? (
                        <video src={file.url} controls preload="metadata" className="aspect-video w-full bg-black" />
                      ) : file.preview === "audio" ? (
                        <div className="bg-muted/50 p-4">
                          <audio src={file.url} controls preload="metadata" className="w-full" />
                        </div>
                      ) : (
                        <div className="flex h-28 items-center justify-center bg-muted/50">
                          <FileIcon name={file.name} type={file.type} className="h-14 w-14 rounded-2xl bg-card shadow-sm ring-1 ring-border [&_svg]:h-6 [&_svg]:w-6" />
                        </div>
                      )}
                      <div className="flex items-center gap-3 p-3.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium" title={file.name}>{file.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{formatFileSize(file.size)} · {file.type || "file"}</p>
                        </div>
                        <Button variant="outline" size="icon" onClick={() => downloadFile(file)} aria-label={`Download ${file.name}`}>
                          <Download />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <section aria-label="Shared text" className="surface overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
                  <p className="text-sm text-muted-foreground tabular">
                    {data.isCode ? "Code" : "Text"} · {formatBytes(utf8Length(isEditing ? editContent : data.text))} · {lineCount} {lineCount === 1 ? "line" : "lines"}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {isEditing ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => { setIsEditing(false); setEditContent(data.text) }}>
                          <X /> Cancel
                        </Button>
                        <Button size="sm" onClick={saveEdit} disabled={isSaving || !editContent.trim()}>
                          <Save /> {isSaving ? "Saving…" : "Save"}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => setWrap(w => !w)} aria-pressed={wrap}>
                          <WrapText /> <span className="hidden sm:inline">Wrap</span>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={saveText}>
                          <Download /> <span className="hidden sm:inline">Save .txt</span>
                        </Button>
                        {data.allowEditing && (
                          <Button variant="outline" size="sm" onClick={() => { setEditContent(data.text); setIsEditing(true) }}>
                            <Pencil /> Edit
                          </Button>
                        )}
                        <CopyButton value={data.text} label="Copy" size="sm" successMessage="Text copied" />
                      </>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <Textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    aria-label="Edit text"
                    spellCheck={false}
                    className="min-h-[420px] rounded-none border-0 font-mono text-[13.5px] leading-relaxed focus-visible:ring-inset"
                  />
                ) : (
                  <pre
                    tabIndex={0}
                    aria-label="Shared content"
                    className={cn(
                      "max-h-[70vh] min-h-[10rem] overflow-auto p-4 font-mono text-[13.5px] leading-relaxed sm:p-5",
                      wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre",
                    )}
                  >
                    {data.text}
                  </pre>
                )}
              </section>
            )}

            {data.allowEditing && !isFiles && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link2 className="h-4 w-4" aria-hidden /> Anyone with this link can edit this text.
              </p>
            )}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
