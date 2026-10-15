import {
  File as FileGeneric,
  FileArchive,
  FileAudio,
  FileCode2,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  type LucideIcon,
} from "lucide-react"
import { fileKind, type FileKind } from "@/lib/file-kind"
import { cn } from "@/lib/utils"

const ICONS: Record<FileKind, LucideIcon> = {
  image: FileImage,
  video: FileVideo,
  audio: FileAudio,
  archive: FileArchive,
  pdf: FileText,
  code: FileCode2,
  text: FileText,
  document: FileText,
  sheet: FileSpreadsheet,
  other: FileGeneric,
}

export function FileIcon({
  name,
  type,
  className,
}: {
  name: string
  type: string
  className?: string
}) {
  const Icon = ICONS[fileKind(name, type)]
  return (
    <span
      aria-hidden
      className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-gold", className)}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
    </span>
  )
}
