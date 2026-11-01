'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '../ui/input'
import { api } from '../../lib/api-client'
import ConfirmModal from '../ui/ConfirmModal'
import { INVALID_CUSTOMER_NUMBER, NOT_AN_FM_CUSTOMER } from './CustomerSearchSelect'

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
  rejectUnlessFm?: boolean
}

export function CustomerSelect({ value, onSelect, disabled, rejectUnlessFm = false }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<Customer[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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

  const accept = async (customer: Customer) => {
    if (rejectUnlessFm) {
      try {
        const res = await api.get('/customers/lookup', { params: { number: customer.customerNumber } })
        const full = res.data?.data ?? res.data
        if (!full?.fmCustomer) {
          setNotice(NOT_AN_FM_CUSTOMER)
          return
        }
        onSelect(full)
      } catch {
        setNotice(INVALID_CUSTOMER_NUMBER)
        return
      }
    } else {
      onSelect(customer)
    }
    setOpen(false)
    setSearch('')
  }

  const resolveEnteredNumber = async () => {
    const term = search.trim()
    if (!term) return
    const exact = items.find(
      c => c.customerNumber?.toLowerCase() === term.toLowerCase(),
    )
    if (exact) {
      await accept(exact)
      return
    }
    try {
      const res = await api.get('/customers/lookup', { params: { number: term } })
      const customer = res.data?.data ?? res.data
      if (customer?.id) {
        await accept(customer)
        return
      }
    } catch {
      /* unrecognised number */
    }
    if (items.length > 0 && !/^\d[\d\s-]*$/.test(term)) {
      onSelect(items[0])
      setOpen(false)
      setSearch('')
      return
    }
    setNotice(INVALID_CUSTOMER_NUMBER)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <ConfirmModal
        open={!!notice}
        title=""
        message={notice ?? ''}
        confirmText="OK"
        alertOnly
        danger={false}
        onConfirm={() => {
          setNotice(null)
          setOpen(true)
          setTimeout(() => inputRef.current?.focus(), 0)
        }}
        onCancel={() => {
          setNotice(null)
          setTimeout(() => inputRef.current?.focus(), 0)
        }}
      />
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
            ref={inputRef}
            className="w-full border-b px-3 py-2 text-sm outline-none"
            placeholder="Type to search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void resolveEnteredNumber()
              }
            }}
          />

          {/* LIST */}
          <div className="max-h-64 overflow-auto">
            {items.map(c => (
              <div
                key={c.id}
                className="cursor-pointer px-3 py-2 text-sm hover:bg-slate-100"
                onClick={() => { void accept(c) }}
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
