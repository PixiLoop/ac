'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlignLeft,
  Bell,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  MessageSquare,
  Paperclip,
  RefreshCw,
  X,
} from 'lucide-react'
import { useToast } from '../ui/toast'

type CalMode = 'week' | 'month'

function startOfWeek(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - x.getDay())
  return x
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function addDays(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function ymd(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function cardDate(card: any) {
  // Due date = Job Book Completion Time (preferred). Fall back to createdAt only if unset.
  const raw = card.dueDate || card.createdAt
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

function flattenCards(board: any, filterText: string) {
  const q = filterText.trim().toLowerCase()
  const out: any[] = []
  for (const list of board?.lists || []) {
    for (const card of list.cards || []) {
      if (q) {
        const hay = `${card.title || ''} ${card.description || ''} ${list.name || ''}`.toLowerCase()
        if (!hay.includes(q)) continue
      }
      out.push({
        ...card,
        listName: list.name,
        listColor: list.color,
      })
    }
  }
  return out
}

export default function BoardCalendarView({
  board,
  filterText,
  onClose,
}: {
  board: any
  filterText: string
  onClose?: () => void
}) {
  const router = useRouter()
  const { showToast } = useToast()
  const [anchor, setAnchor] = useState(() => new Date())
  const [mode, setMode] = useState<CalMode>('week')
  const today = useMemo(() => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return t
  }, [])

  const cards = useMemo(() => flattenCards(board, filterText), [board, filterText])

  const days = useMemo(() => {
    if (mode === 'week') {
      const start = startOfWeek(anchor)
      return Array.from({ length: 7 }, (_, i) => addDays(start, i))
    }
    const start = startOfMonth(anchor)
    const first = startOfWeek(start)
    return Array.from({ length: 42 }, (_, i) => addDays(first, i))
  }, [anchor, mode])

  const cardsByDay = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const card of cards) {
      const d = cardDate(card)
      if (!d) continue
      const key = ymd(d)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(card)
    }
    Array.from(map.values()).forEach((list) => {
      list.sort((a, b) => {
        const da = cardDate(a)?.getTime() || 0
        const db = cardDate(b)?.getTime() || 0
        return da - db
      })
    })
    return map
  }, [cards])

  const monthOptions = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - 6 + i)
      return d
    })
  }, [])

  const shift = (dir: -1 | 1) => {
    setAnchor((prev) => {
      const next = new Date(prev)
      if (mode === 'week') next.setDate(next.getDate() + dir * 7)
      else next.setMonth(next.getMonth() + dir)
      return next
    })
  }

  const syncCalendar = () => {
    const withDue = cards.filter((c) => c.dueDate || c.createdAt)
    if (!withDue.length) {
      showToast({ type: 'error', title: 'No cards to sync', replace: true })
      return
    }
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Airco AIMS//Job Board//EN',
    ]
    for (const card of withDue) {
      const due = cardDate(card)
      if (!due) continue
      const stamp = due
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}Z$/, 'Z')
      const day = ymd(due).replace(/-/g, '')
      lines.push(
        'BEGIN:VEVENT',
        `UID:${card.id}@airco-aims`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${day}`,
        `SUMMARY:${String(card.title || 'Job').replace(/,/g, '\\,')}`,
        `DESCRIPTION:${String(card.listName || '').replace(/,/g, '\\,')}`,
        'END:VEVENT',
      )
    }
    lines.push('END:VCALENDAR')
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${String(board?.name || 'board').replace(/\s+/g, '-')}-calendar.ics`
    a.click()
    URL.revokeObjectURL(url)
    showToast({ type: 'success', title: 'Calendar file downloaded', replace: true })
  }

  return (
    <div className="h-full min-h-0 flex flex-col bg-[#f4f5f7]">
      {/* Calendar chrome — Trello-like */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-white border-b border-[#dfe1e6] shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <select
              value={`${anchor.getFullYear()}-${anchor.getMonth()}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split('-').map(Number)
                setAnchor(new Date(y, m, Math.min(anchor.getDate(), 28)))
              }}
              className="appearance-none border-0 border-b-2 border-transparent hover:border-[#0079bf] focus:border-[#0079bf] bg-transparent pr-6 pl-0 py-1 text-[15px] font-semibold text-[#172b4d] outline-none cursor-pointer"
            >
              {monthOptions.map((d) => (
                <option key={`${d.getFullYear()}-${d.getMonth()}`} value={`${d.getFullYear()}-${d.getMonth()}`}>
                  {d.toLocaleString('en-US', { month: 'short', year: 'numeric' })}
                </option>
              ))}
            </select>
            <ChevronDown className="h-3.5 w-3.5 text-[#5e6c84] absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="inline-flex items-center rounded border border-[#dfe1e6] overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => shift(-1)}
              className="h-8 w-8 hover:bg-[#ebecf0] flex items-center justify-center text-[#5e6c84] border-r border-[#dfe1e6]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setAnchor(new Date())}
              className="h-8 px-3 text-[13px] font-medium text-[#172b4d] hover:bg-[#ebecf0] border-r border-[#dfe1e6]"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => shift(1)}
              className="h-8 w-8 hover:bg-[#ebecf0] flex items-center justify-center text-[#5e6c84]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="relative">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as CalMode)}
              className="appearance-none border border-[#dfe1e6] rounded bg-white pl-2.5 pr-7 h-8 text-[13px] font-medium text-[#172b4d] outline-none hover:bg-[#ebecf0] cursor-pointer"
            >
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
            <ChevronDown className="h-3.5 w-3.5 text-[#5e6c84] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={syncCalendar}
            className="inline-flex items-center gap-1.5 h-8 rounded border border-[#dfe1e6] bg-white px-3 text-[13px] font-medium text-[#172b4d] hover:bg-[#ebecf0]"
          >
            <CalendarDays className="h-3.5 w-3.5 text-[#5e6c84]" />
            Sync to personal calendar
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded hover:bg-[#ebecf0] flex items-center justify-center text-[#5e6c84]"
              title="Close calendar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {mode === 'week' ? (
        <div className="flex-1 min-h-0 overflow-auto bg-white">
          <div className="grid grid-cols-7 min-w-[980px] h-full">
            {days.map((day) => {
              const key = ymd(day)
              const dayCards = cardsByDay.get(key) || []
              const isToday = sameDay(day, today)
              return (
                <div
                  key={key}
                  className={`border-r border-[#dfe1e6] min-h-[520px] flex flex-col ${
                    isToday ? 'bg-[#e4f0f6]' : 'bg-white'
                  }`}
                >
                  <div
                    className={`px-3 py-2.5 sticky top-0 z-10 ${
                      isToday
                        ? 'bg-[#e4f0f6] border-t-[3px] border-t-[#0079bf]'
                        : 'bg-white border-t-[3px] border-t-transparent'
                    } border-b border-[#dfe1e6]`}
                  >
                    <div className="text-[11px] font-semibold tracking-wide uppercase text-[#5e6c84]">
                      {day.toLocaleString('en-US', { weekday: 'short' })}
                    </div>
                    <div className={`text-[20px] font-semibold leading-none mt-0.5 ${isToday ? 'text-[#0079bf]' : 'text-[#172b4d]'}`}>
                      {day.getDate()}
                    </div>
                  </div>
                  <div className="p-2 space-y-2 overflow-y-auto flex-1">
                    {dayCards.map((card) => (
                      <CalendarCard
                        key={card.id}
                        card={card}
                        onOpen={() => router.push(`/admin/job-boards/cards/${card.id}`)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto p-3 bg-white">
          <div className="grid grid-cols-7 gap-px bg-[#dfe1e6] border border-[#dfe1e6] rounded-md overflow-hidden min-w-[980px]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="bg-[#f4f5f7] text-[11px] font-semibold text-[#5e6c84] px-2 py-1.5 uppercase">
                {d}
              </div>
            ))}
            {days.map((day) => {
              const key = ymd(day)
              const dayCards = cardsByDay.get(key) || []
              const inMonth = day.getMonth() === anchor.getMonth()
              const isToday = sameDay(day, today)
              return (
                <div
                  key={key}
                  className={`min-h-[120px] p-1.5 bg-white ${inMonth ? '' : 'bg-[#fafbfc] opacity-60'} ${
                    isToday ? 'ring-2 ring-inset ring-[#0079bf]' : ''
                  }`}
                >
                  <div className={`text-[13px] font-semibold mb-1 ${isToday ? 'text-[#0079bf]' : 'text-[#172b4d]'}`}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayCards.slice(0, 4).map((card) => (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => router.push(`/admin/job-boards/cards/${card.id}`)}
                        className="w-full text-left text-[11px] px-1.5 py-1 rounded bg-white border border-[#dfe1e6] text-[#172b4d] truncate hover:bg-[#f4f5f7]"
                        title={card.title}
                      >
                        {card.title}
                      </button>
                    ))}
                    {dayCards.length > 4 && (
                      <div className="text-[10px] text-[#5e6c84] px-1">+{dayCards.length - 4} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function CalendarCard({ card, onOpen }: { card: any; onOpen: () => void }) {
  const commentCount =
    card._count?.activities ??
    card.activities?.filter((a: any) => a.type === 'COMMENT')?.length ??
    0
  const attachmentCount = card._count?.attachments ?? card.attachments?.length ?? 0
  const checklistItems = card.checklists?.flatMap((c: any) => c.items || []) ?? []
  const checklistDone = checklistItems.filter((i: any) => i.isCompleted).length
  const members = card.members || []
  const hasDesc = !!String(card.description || '').trim()
  const invoiced = /invoice/i.test(String(card.listName || ''))

  const memberInitials = (m: any) => {
    const name = m.user?.displayName || m.user?.email || '?'
    return name
      .split(' ')
      .map((p: string) => p[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-[3px] border border-[#dfe1e6] bg-white shadow-[0_1px_0_#091e4240] hover:bg-[#f4f5f7] p-2 space-y-1.5"
    >
      {card.labels?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.labels.slice(0, 5).map((l: any) => (
            <span
              key={l.id}
              className="h-[8px] w-[40px] rounded-[4px]"
              style={{ backgroundColor: l.color }}
              title={l.name}
            />
          ))}
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[11px] px-1.5 py-[1px] rounded-[3px] bg-[#091e420f] text-[#172b4d] font-medium">
              {card.listName || 'List'}
            </span>
            {card.recurring && card.recurring !== 'never' && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-[1px] rounded-[3px] bg-[#e4f0f6] text-[#0079bf]">
                <RefreshCw className="h-2.5 w-2.5" />
                Recurring
              </span>
            )}
            {invoiced && <CheckCircle2 className="h-3.5 w-3.5 text-[#61bd4f]" />}
          </div>
          <div className="text-[13px] font-semibold text-[#172b4d] leading-snug line-clamp-3">
            {card.title}
          </div>
        </div>
        {members.length > 0 && (
          <div className="flex -space-x-1 shrink-0 pt-0.5">
            {members.slice(0, 2).map((m: any) => (
              <div
                key={m.id || m.userId}
                className="h-6 w-6 rounded-full bg-[#dfe1e6] text-[#172b4d] text-[9px] font-bold flex items-center justify-center ring-2 ring-white"
                title={m.user?.displayName}
              >
                {memberInitials(m)}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap text-[#5e6c84]">
        {card.dueDate && (
          <span className="inline-flex items-center gap-0.5 text-[11px] px-1 rounded bg-[#f5cd47] text-[#172b4d] font-medium">
            <Bell className="h-3 w-3" />
            {new Date(card.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        {hasDesc && <AlignLeft className="h-3.5 w-3.5" />}
        {commentCount > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[11px]">
            <MessageSquare className="h-3.5 w-3.5" /> {commentCount}
          </span>
        )}
        {attachmentCount > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[11px]">
            <Paperclip className="h-3.5 w-3.5" /> {attachmentCount}
          </span>
        )}
        {checklistItems.length > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[11px]">
            <CheckSquare className="h-3.5 w-3.5" /> {checklistDone}/{checklistItems.length}
          </span>
        )}
        <Eye className="h-3.5 w-3.5 opacity-50" />
      </div>
    </button>
  )
}
