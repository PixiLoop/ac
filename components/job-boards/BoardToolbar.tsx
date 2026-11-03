'use client'

import {
  Archive,
  CalendarDays,
  Filter,
  LayoutGrid,
  MoreHorizontal,
  Plug,
  Search,
  Settings,
  Share2,
  Star,
  UserPlus,
  Zap,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useToast } from '../ui/toast'

type BoardViewMode = 'board' | 'calendar'

export default function BoardToolbar({
  board,
  viewMode,
  onViewModeChange,
  filterText,
  onFilterTextChange,
}: {
  board: any
  viewMode: BoardViewMode
  onViewModeChange: (mode: BoardViewMode) => void
  filterText: string
  onFilterTextChange: (value: string) => void
}) {
  const { showToast } = useToast()
  const [showFilter, setShowFilter] = useState(false)
  const [starred, setStarred] = useState(false)

  const members = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>()
    for (const list of board?.lists || []) {
      for (const card of list.cards || []) {
        for (const m of card.members || []) {
          const id = m.userId || m.user?.id || m.id
          if (!id || map.has(id)) continue
          map.set(id, {
            id,
            name: m.user?.displayName || m.user?.email || 'Member',
          })
        }
      }
    }
    return Array.from(map.values())
  }, [board])

  const initials = (name: string) =>
    name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()

  const copyShareLink = async () => {
    try {
      const url = typeof window !== 'undefined' ? window.location.href : ''
      await navigator.clipboard.writeText(url)
      showToast({ type: 'success', title: 'Board link copied', replace: true })
    } catch {
      showToast({ type: 'error', title: 'Could not copy link', replace: true })
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 bg-[#1d6f7a] text-white shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <h2 className="font-semibold text-[15px] truncate max-w-[12rem] sm:max-w-[20rem]">
          {board?.name || 'Board'}
        </h2>

        <button
          type="button"
          onClick={() => onViewModeChange('board')}
          className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium ${
            viewMode === 'board' ? 'bg-white/25' : 'bg-white/10 hover:bg-white/20'
          }`}
          title="Board view"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Board
        </button>

        <div className="hidden md:flex items-center -space-x-1.5 ml-1">
          {members.slice(0, 4).map((m) => (
            <div
              key={m.id}
              title={m.name}
              className="h-7 w-7 rounded-full bg-[#cfd8dc] text-[#37474f] text-[10px] font-bold flex items-center justify-center ring-2 ring-[#1d6f7a]"
            >
              {initials(m.name)}
            </div>
          ))}
          {members.length > 4 && (
            <div className="h-7 w-7 rounded-full bg-[#455a64] text-white text-[10px] font-semibold flex items-center justify-center ring-2 ring-[#1d6f7a]">
              +{members.length - 4}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-wrap justify-end">
        <div className="relative mr-1">
          <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={filterText}
            onChange={(e) => onFilterTextChange(e.target.value)}
            placeholder="Search all cards…"
            className="!h-8 rounded border-0 !pl-8 !pr-2.5 !text-xs w-44 sm:w-52 bg-white text-slate-800"
            style={{ paddingLeft: 32 }}
          />
        </div>

        <IconBtn
          title="Calendar"
          active={viewMode === 'calendar'}
          onClick={() => onViewModeChange(viewMode === 'calendar' ? 'board' : 'calendar')}
        >
          <CalendarDays className="h-4 w-4" />
        </IconBtn>
        <IconBtn title="Board settings" onClick={() => showToast({ type: 'info', title: 'Board settings coming soon', replace: true })}>
          <Settings className="h-4 w-4" />
        </IconBtn>
        <button
          type="button"
          className="hidden sm:inline-flex h-8 items-center px-2 rounded text-xs font-medium bg-white/10 hover:bg-white/20"
          onClick={() => showToast({ type: 'info', title: 'Archive done coming soon', replace: true })}
        >
          Archive Done
        </button>
        <IconBtn title="Power-Ups" onClick={() => showToast({ type: 'info', title: 'Power-Ups coming soon', replace: true })}>
          <Plug className="h-4 w-4" />
        </IconBtn>
        <IconBtn title="Automation" onClick={() => showToast({ type: 'info', title: 'Automation coming soon', replace: true })}>
          <Zap className="h-4 w-4" />
        </IconBtn>
        <IconBtn
          title="Filter"
          active={!!filterText}
          onClick={() => {
            setShowFilter((v) => !v)
            if (filterText) onFilterTextChange('')
          }}
        >
          <Filter className="h-4 w-4" />
        </IconBtn>
        <IconBtn title="Star board" active={starred} onClick={() => setStarred((v) => !v)}>
          <Star className={`h-4 w-4 ${starred ? 'fill-amber-300 text-amber-300' : ''}`} />
        </IconBtn>
        <IconBtn title="Members" onClick={() => showToast({ type: 'info', title: 'Board members coming soon', replace: true })}>
          <UserPlus className="h-4 w-4" />
        </IconBtn>
        <button
          type="button"
          onClick={() => { void copyShareLink() }}
          className="inline-flex items-center gap-1.5 h-8 rounded bg-white text-[#1d6f7a] px-2.5 text-xs font-semibold hover:bg-slate-100 ml-0.5"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </button>
        <IconBtn title="More" onClick={() => showToast({ type: 'info', title: 'More options coming soon', replace: true })}>
          <MoreHorizontal className="h-4 w-4" />
        </IconBtn>
        <IconBtn title="Archive" onClick={() => showToast({ type: 'info', title: 'Archive coming soon', replace: true })}>
          <Archive className="h-4 w-4" />
        </IconBtn>
      </div>
    </div>
  )
}

function IconBtn({
  children,
  title,
  onClick,
  active,
}: {
  children: React.ReactNode
  title: string
  onClick: () => void
  active?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`h-8 w-8 rounded flex items-center justify-center ${
        active ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'
      }`}
    >
      {children}
    </button>
  )
}
