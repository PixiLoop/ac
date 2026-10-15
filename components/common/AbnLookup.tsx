'use client'

import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { Input } from '../ui/input'
import { Loader2 } from 'lucide-react'
import clsx from 'clsx'

type AbnResult = {
  Abn: string
  Name: string
  Gst: string
}

const ABN_GUID = process.env.NEXT_PUBLIC_ABN_GUID
const ABR_JSON = 'https://abr.business.gov.au/json'

function parseJsonp(payload: string) {
  const text = payload.trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end < start) return null
  return JSON.parse(text.slice(start, end + 1))
}

function entityToResult(data: any): AbnResult | null {
  if (!data?.Abn) return null
  if (typeof data.Message === 'string' && data.Message.trim()) return null
  const businessName = Array.isArray(data.BusinessName) ? data.BusinessName[0] : ''
  const gst = data.Gst == null || data.Gst === '' || data.Gst === 'N' ? 'N' : 'Y'
  return {
    Abn: data.Abn,
    Name: data.EntityName || businessName || data.Name || '',
    Gst: gst,
  }
}

export function AbnLookup({
  value,
  label,
  onChange,
  onSelect,
}: {
  value: string
  label?: string
  onChange: (v: string) => void
  onSelect: (r: AbnResult) => void
}) {
  const [results, setResults] = useState<AbnResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const wrapperRef = useRef<HTMLDivElement>(null)

  /* ---------------- Outside click close ---------------- */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* ---------------- ABN Search ---------------- */
  useEffect(() => {
    if (!value || value.length < 2) {
      setResults([])
      setOpen(false)
      return
    }

    const t = setTimeout(async () => {
      try {
        setLoading(true)

        const clean = value.replace(/\s/g, '')
        const isAbn = /^\d{11}$/.test(clean)
        const isAcn = /^\d{9}$/.test(clean)

        if (/^\d+$/.test(clean) && !isAbn && !isAcn) {
          setResults([])
          setOpen(false)
          return
        }

        const url = isAbn
          ? `${ABR_JSON}/AbnDetails.aspx`
          : isAcn
            ? `${ABR_JSON}/AcnDetails.aspx`
            : `${ABR_JSON}/MatchingNames.aspx`

        const params = isAbn
          ? { abn: clean, callback: 'callback', guid: ABN_GUID }
          : isAcn
            ? { acn: clean, callback: 'callback', guid: ABN_GUID }
            : { name: value, callback: 'callback', guid: ABN_GUID }

        const res = await axios.get(url, {
          params,
          responseType: 'text',
        })

        const json = parseJsonp(res.data)
        if (isAbn || isAcn) {
          const result = entityToResult(json)
          setResults(result ? [result] : [])
          setOpen(!!result)
        } else {
          const names = (json?.Names ?? []).map((row: any) => ({
            Abn: row.Abn,
            Name: row.Name,
            Gst: row.Gst === 'N' ? 'N' : row.Gst ? 'Y' : '',
          }))
          setResults(names)
          setOpen(names.length > 0)
        }
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(t)
  }, [value])

  /* ---------------- Keyboard ---------------- */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || !results.length) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => (i + 1) % results.length)
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => (i - 1 + results.length) % results.length)
    }
    if (e.key === 'Enter' && activeIndex >= 0) {
      const r = results[activeIndex]
      onSelect(r)
      setOpen(false)
    }
  }

  return (
    <div ref={wrapperRef} className="relative space-y-1">
      {label && <label className="text-sm font-medium">{label}</label>}

      <div className="relative">
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type ABN, ACN or business name"
        />

        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-20 w-full bg-white border rounded shadow">
          {results.map((r, i) => (
            <div
              key={r.Abn}
              className={clsx(
                'px-3 py-2 cursor-pointer',
                i === activeIndex ? 'bg-slate-100' : 'hover:bg-slate-50',
              )}
              onClick={() => {
                onSelect(r)
                setOpen(false)
              }}
            >
              <div className="font-medium">{r.Name}</div>
              <div className="text-xs">ABN: {r.Abn}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
