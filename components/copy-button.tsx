"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Copy } from "lucide-react"
import { toast } from "sonner"
import { Button, type ButtonProps } from "@/components/ui/button"
import { copyText } from "@/lib/clipboard"
import { cn } from "@/lib/utils"

interface CopyButtonProps extends Omit<ButtonProps, "onClick" | "value"> {
  value: string
  /** Visible label. Omit for an icon-only button (then pass aria-label). */
  label?: string
  successMessage?: string
}

export function CopyButton({ value, label, successMessage = "Copied", className, children, ...props }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const onClick = async () => {
    if (!(await copyText(value))) return void toast.error("Couldn't copy. Please select the text and copy it manually.")
    setCopied(true)
    toast.success(successMessage)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1800)
  }

  return (
    <Button type="button" onClick={onClick} className={cn(className)} {...props}>
      {copied ? <Check className="text-success" /> : <Copy />}
      {label ? <span>{copied ? "Copied" : label}</span> : children}
      <span className="sr-only" aria-live="polite">{copied ? "Copied to clipboard" : ""}</span>
    </Button>
  )
}
