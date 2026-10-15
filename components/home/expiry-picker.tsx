"use client"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { EXPIRATION_OPTIONS, MAX_FILE_TTL_SECONDS } from "@/lib/config"

const SHORT: Record<string, string> = {
  "5min": "5 min",
  "30min": "30 min",
  "1hour": "1 hour",
  "6hours": "6 hours",
  "12hours": "12 hours",
  "1day": "1 day",
  "3days": "3 days",
  "7days": "7 days",
}

interface ExpiryPickerProps {
  value: string
  onChange: (value: string) => void
  /** Files can only live 24h to keep the service free; text can live 7 days. */
  filesOnly: boolean
  disabled?: boolean
}

export function ExpiryPicker({ value, onChange, filesOnly, disabled }: ExpiryPickerProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between">
        <span id="expiry-label" className="eyebrow">Delete after</span>
        {filesOnly && <span className="text-xs text-muted-foreground">Files are kept for 24 hours at most</span>}
      </div>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={value}
        onValueChange={v => v && onChange(v)}
        disabled={disabled}
        aria-labelledby="expiry-label"
      >
        {Object.entries(SHORT).map(([key, label]) => (
          <ToggleGroupItem
            key={key}
            value={key}
            disabled={filesOnly && EXPIRATION_OPTIONS[key] > MAX_FILE_TTL_SECONDS}
            className="tabular"
          >
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
