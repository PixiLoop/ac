'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '../ui/input'
import { api } from '../../lib/api-client'

interface Customer {
  id: string
  customerNumber: string
  registeredName: string
  nextFmWebNumber?: string
}

interface Props {
  value?: Customer | null
  onSelect: (customer: Customer) => void
  disabled?:boolean
}

export function CustomerSelect({ value, onSelect, disabled  }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<Customer[]>([])
  const wrapperRef = useRef<HTMLDivElement>(null)

  const load = async (term?: string) => {
    const res = await api.get('/customers', {
        params: {
        search: term || undefined,
        take: 20,
        },
    })

    const payload = res.data?.data ?? res.data

    // normalize to array
    const list = Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload)
        ? payload
        : payload
        ? [payload]
        : []

    setItems(list)
    }


  useEffect(() => {
    if (open) load()
  }, [open])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => load(search), 300)
    return () => clearTimeout(t)
  }, [search, open])

  // close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={wrapperRef} className="relative">
      {/* DISPLAY FIELD */}
      <Input
        readOnly
        value={
          value
            ? `${value.customerNumber} — ${value.registeredName}`
            : ''
        }
        placeholder="Select customer"
        onClick={() => setOpen(o => !o)}
        className="cursor-pointer"
        disabled={disabled}
      />

      {/* DROPDOWN */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow">
          {/* SEARCH */}
          <input
            className="w-full border-b px-3 py-2 text-sm outline-none"
            placeholder="Type to search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          {/* LIST */}
          <div className="max-h-64 overflow-auto">
            {items.map(c => (
              <div
                key={c.id}
                className="cursor-pointer px-3 py-2 text-sm hover:bg-slate-100"
                onClick={() => {
                  onSelect(c)
                  setOpen(false)
                  setSearch('')
                }}
              >
                <div className="font-medium">
                  {c.customerNumber}
                </div>
                <div className="text-xs text-slate-500">
                  {c.registeredName}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
