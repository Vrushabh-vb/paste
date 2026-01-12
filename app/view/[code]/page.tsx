"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Copy,
  Check,
  Download,
  FileIcon,
  Edit3,
  Save,
  X,
  Eye,
  AlertCircle,
  ChevronLeft,
  Clock,
  ShieldCheck,
  Code
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import Footer from "@/components/footer"

interface FileData { name: string; type: string; content: string; }
interface PasteData { content: string; createdAt: string; expiresAt: string; timeRemaining: string; fileName?: string; fileType?: string; isFile?: boolean; files?: FileData[]; isMultiFile?: boolean; allowEditing?: boolean; downloadCount?: number; isCode?: boolean; }

export default function ViewPastePage({ params }: { params: { code: string } | Promise<{ code: string }> }) {
  const [code, setCode] = useState<string>("");
  const [pasteData, setPasteData] = useState<PasteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const resolveParams = async () => {
      try { const resolvedParams = await Promise.resolve(params); setCode(resolvedParams.code); }
      catch (err) { setError("Invalid parameters"); setLoading(false); }
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (!code) return;
    const fetchPaste = async () => {
      try {
        // First, try to get from localStorage
        const localData = localStorage.getItem(`paste_${code}`);
        if (localData) {
          const parsed = JSON.parse(localData);

          // Check if expired
          if (Date.now() > parsed.expiresAt) {
            localStorage.removeItem(`paste_${code}`);
            setError("Resource expired or not found");
            setLoading(false);
            return;
          }

          // Calculate time remaining
          const timeRemaining = parsed.expiresAt - Date.now();
          const minutes = Math.floor(timeRemaining / (1000 * 60));
          const hours = Math.floor(minutes / 60);
          const days = Math.floor(hours / 24);
          let timeRemainingFormatted = "";
          if (days > 0) timeRemainingFormatted = `${days} day${days > 1 ? 's' : ''}`;
          else if (hours > 0) timeRemainingFormatted = `${hours} hour${hours > 1 ? 's' : ''}`;
          else timeRemainingFormatted = `${minutes} minute${minutes > 1 ? 's' : ''}`;

          setPasteData({
            ...parsed,
            createdAt: new Date(parsed.createdAt).toISOString(),
            expiresAt: new Date(parsed.expiresAt).toISOString(),
            timeRemaining: timeRemainingFormatted
          });
          setEditContent(parsed.content || "");
          setLoading(false);
          return;
        }

        // Fallback to API if not in localStorage
        const response = await fetch(`/api/paste/${code}`)
        if (response.ok) {
          const data = await response.json();
          setPasteData(data);
          setEditContent(data.content || "");
        } else setError("Resource expired or not found");
      } catch (err) { setError("Network error occurred"); }
      finally { setLoading(false); }
    }
    fetchPaste()
  }, [code])

  const copyToClipboard = async (text?: string) => {
    const contentToCopy = text || pasteData?.content;
    if (!contentToCopy) return;
    try {
      await navigator.clipboard.writeText(contentToCopy);
      setCopied(true); toast.success("Copied");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) { toast.error("Copy failed"); }
  }

  const handleSaveEdit = async () => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/paste", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, content: editContent }),
      })
      if (response.ok) {
        // Update local state
        setPasteData(prev => prev ? { ...prev, content: editContent } : null);

        // Update localStorage if it exists so refreshes show the new content
        const localData = localStorage.getItem(`paste_${code}`);
        if (localData) {
          const parsed = JSON.parse(localData);
          parsed.content = editContent;
          localStorage.setItem(`paste_${code}`, JSON.stringify(parsed));
        }

        setIsEditing(false);
        toast.success("Updated successfully");
      } else {
        const err = await response.json();
        toast.error(err.error || "Failed to update");
      }
    } catch (err) {
      toast.error("Network error while saving");
    } finally {
      setIsSaving(false);
    }
  }

  const downloadFile = (fileContent: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = fileContent; link.download = fileName;
    document.body.appendChild(link); link.click();
    document.body.removeChild(link);
  };

  const decodeBase64 = (s: string) => { try { return atob(s.split(',')[1] || s); } catch { return 'Binary Content'; } };

  const renderContent = () => {
    if (!pasteData) return null;

    if (pasteData.isMultiFile && pasteData.files) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-widest">Shared Files ({pasteData.files.length})</h3>
            <Button onClick={() => pasteData.files?.forEach((f, i) => setTimeout(() => downloadFile(f.content, f.name), i * 300))} variant="outline" className="h-9 rounded-xl font-bold text-xs">Download All</Button>
          </div>
          {pasteData.files.map((file, idx) => (
            <div key={idx} className="p-4 rounded-2xl border bg-white dark:bg-slate-900 flex items-center justify-between hover:border-primary/40 transition-all">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400"><FileIcon className="h-5 w-5" /></div>
                <div><p className="text-sm font-bold truncate max-w-[200px]">{file.name}</p></div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => downloadFile(file.content, file.name)} className="h-9 w-9 rounded-xl"><Download className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      );
    }

    if (pasteData.isFile) {
      return (
        <div className="space-y-8">
          <div className="bg-primary/5 p-12 rounded-[2.5rem] border-2 border-dashed border-primary/10 text-center">
            <div className="h-16 w-16 bg-white dark:bg-slate-900 rounded-2xl shadow-xl flex items-center justify-center mx-auto mb-6"><FileIcon className="h-8 w-8 text-primary" /></div>
            <h2 className="text-2xl font-black mb-2">{pasteData.fileName}</h2>
            <p className="text-muted-foreground text-sm mb-8 uppercase tracking-widest font-bold">{pasteData.fileType}</p>
            <Button onClick={() => downloadFile(pasteData.content, pasteData.fileName!)} className="h-14 px-10 rounded-2xl font-black bg-primary shadow-xl shadow-primary/20">Download File</Button>
          </div>
        </div>
      );
    }

    if (isEditing) {
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl">
            <span className="text-xs font-bold px-4 text-muted-foreground uppercase tracking-widest">Editing Snippet</span>
            <div className="flex gap-2">
              <Button onClick={() => setIsEditing(false)} variant="ghost" size="sm" className="rounded-xl font-bold">Cancel</Button>
              <Button onClick={handleSaveEdit} size="sm" className="rounded-xl font-bold bg-primary px-6" disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</Button>
            </div>
          </div>
          <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="min-h-[500px] p-8 rounded-3xl border-none focus-visible:ring-0 text-lg font-medium leading-relaxed bg-slate-50 dark:bg-slate-900/30" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center border-b pb-6">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
            <span className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">
              {pasteData.isCode ? "Code Snippet" : "Verified Content"}
            </span>
            {pasteData.isCode && <Code className="h-3.5 w-3.5 text-blue-500" />}
          </div>
          <div className="flex gap-2">
            {pasteData.allowEditing && <Button onClick={() => setIsEditing(true)} variant="outline" size="sm" className="h-9 rounded-xl font-bold border-none bg-slate-50 dark:bg-slate-800">Edit</Button>}
            <Button onClick={() => copyToClipboard()} variant="outline" size="sm" className="h-9 rounded-xl font-bold border-none bg-slate-50 dark:bg-slate-800">
              {copied ? <Check className="h-3.5 w-3.5 mr-2 text-green-500" /> : <Copy className="h-3.5 w-3.5 mr-2" />}
              Copy Content
            </Button>
          </div>
        </div>
        <div className="relative group">
          <Textarea value={pasteData.content} readOnly className="min-h-[500px] p-0 border-none focus-visible:ring-0 text-xl font-medium leading-relaxed bg-transparent resize-none font-mono" />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950">
      <nav className="fixed top-0 w-full z-50 border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl h-14 flex items-center justify-center">
        <div className="w-full max-w-5xl px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="font-bold tracking-tight text-sm">Dashboard</span>
          </Link>
          <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-3 py-1 rounded-full">
            <ShieldCheck className="h-3 w-3" /> Secure Recall
          </div>
        </div>
      </nav>

      <main className="flex-grow pt-24 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[50vh]">
              <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-100">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-6" />
              <h2 className="text-2xl font-black mb-2">Access Void</h2>
              <p className="text-muted-foreground font-medium mb-10">{error}</p>
              <Link href="/"><Button className="h-12 px-8 rounded-xl font-bold bg-slate-900 dark:bg-white dark:text-slate-900">Go Home</Button></Link>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-12">
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h1 className="text-7xl font-black tracking-tighter mb-4">#{code}</h1>
                  <div className="flex gap-4">
                    <span className="text-xs font-bold text-muted-foreground bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded-full border">Shared on {new Date(pasteData!.createdAt).toLocaleDateString()}</span>
                    <span className="text-xs font-bold text-muted-foreground bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded-full border flex items-center gap-2"><Eye className="h-3 w-3" /> {pasteData!.downloadCount || 0} Views</span>
                  </div>
                </div>
                <div className="bg-slate-900 text-white p-6 rounded-[2rem] flex items-center gap-4 relative overflow-hidden group">
                  <div className="absolute right-0 top-0 h-full w-20 bg-primary/20 blur-[40px] transition-opacity opacity-50 group-hover:opacity-100"></div>
                  <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center text-primary"><Clock className="h-5 w-5" /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-500">Self-Destruction</p>
                    <p className="text-sm font-bold capitalize">{pasteData!.timeRemaining}</p>
                  </div>
                </div>
              </header>

              <div className="min-h-[500px]">
                {renderContent()}
              </div>
            </motion.div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
