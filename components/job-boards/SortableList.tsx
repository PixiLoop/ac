'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import SortableCard from './SortableCard'
import { useState, useRef, useEffect } from 'react'
import { api } from '../../lib/api-client'
import ConfirmModal from '../../components/ui/ConfirmModal'
import BoardColorPicker from './BoardColorPicker'
import { Pencil, Search, Trash2 } from 'lucide-react'


const LIST_TINTS = [
  '#f8fafc', // slate
  '#eff6ff', // blue
  '#f0fdf4', // green
  '#fff7ed', // orange
  '#faf5ff', // purple
  '#fef2f2', // rose
]

export default function SortableList({
  list,
  listIndex = 0,
  columnWidth = 280,
  reload,
  activeId,
  setBoard,
  hideAddCard,
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list.id,
  })

  const listTint = list.color || LIST_TINTS[listIndex % LIST_TINTS.length]
  const width = Math.max(220, Number(columnWidth) || 280)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
    background: listTint,
    width,
    minWidth: width,
  }
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [listSearch, setListSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const listSearchRef = useRef<HTMLInputElement>(null)

  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState(list.name)
  const [hovering, setHovering] = useState(false)
  const [showColors, setShowColors] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)

  const q = listSearch.trim().toLowerCase()
  const visibleCards = !q
    ? list.cards || []
    : (list.cards || []).filter((card: any) => {
        const labels = (card.labels || []).map((l: any) => l.name || '').join(' ')
        const members = (card.members || [])
          .map((m: any) => m.user?.displayName || m.user?.email || '')
          .join(' ')
        const hay = [
          card.title,
          card.description,
          card.location,
          labels,
          members,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return hay.includes(q)
      })

  useEffect(() => {
    if (showSearch) {
      setTimeout(() => listSearchRef.current?.focus(), 0)
    }
  }, [showSearch])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        headerRef.current &&
        !headerRef.current.contains(event.target as Node)
      ) {
        setEditingName(false)
        setShowColors(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="shrink-0 rounded-xl shadow-sm border border-slate-200/80 flex flex-col h-full max-h-full min-h-0 overflow-hidden"
    >
      <div
        ref={headerRef}
        className="relative p-3 shrink-0"
        style={{
          background: listTint,
          borderBottom: '1px solid rgba(0,0,0,0.08)',
        }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        {editingName ? (
          <div className="flex items-center gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 border rounded px-2 py-1 text-sm"
            />
            <button
              onClick={async () => {
                if (!newName.trim()) return
                await api.patch(`/job-boards/lists/${list.id}`, {
                  name: newName,
                })
                list.name = newName
                setEditingName(false)
              }}
              className="bg-blue-600 text-white px-2 py-1 rounded text-xs"
            >
              Save
            </button>
          </div>
        ) : (
          <div
            {...attributes}
            {...listeners}
            className="font-semibold cursor-grab pr-24 select-none truncate"
            style={{ touchAction: 'none', userSelect: 'none' }}
          >
            {list.name}
          </div>
        )}

        {/* Hover Icons — search next to edit */}
        {(hovering || showSearch || !!listSearch) && !editingName && (
          <div className="absolute right-2 top-2.5 flex items-center gap-1.5 text-gray-500 bg-inherit z-10">
            <button
              type="button"
              title="Search cards"
              onClick={(e) => {
                e.stopPropagation()
                setShowSearch((v) => {
                  if (v) {
                    setListSearch('')
                    return false
                  }
                  return true
                })
              }}
              className={`hover:text-black ${showSearch || listSearch ? 'text-blue-600' : ''}`}
            >
              <Search size={15} />
            </button>

            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="hover:text-black text-sm"
              title="Rename list"
            >
              <Pencil size={16} />
            </button>

            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="hover:text-red-500 text-sm"
              title="Delete list"
            >
              <Trash2 size={16} />
            </button>

            <button
              type="button"
              onClick={() => setShowColors(!showColors)}
              className="hover:text-black text-sm"
              title="List color"
            >
              🎨
            </button>
          </div>
        )}

        {/* Color Picker */}
        {showColors && (
          <div className="mt-3">
            <BoardColorPicker
              value={list.color}
              onChange={async (val) => {
                await api.patch(`/job-boards/lists/${list.id}`, {
                  color: val,
                })

                list.color = val
              }}
            />
          </div>
        )}

        {showSearch && (
          <div className="relative mt-2">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-[1]" />
            <input
              ref={listSearchRef}
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setListSearch('')
                  setShowSearch(false)
                }
              }}
              placeholder="Search…"
              className="w-full !h-7 !rounded border border-slate-200 bg-white !pl-8 !pr-2 !text-[11px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
              style={{ paddingLeft: 32 }}
            />
          </div>
        )}
      </div>

      <div
        className="px-3 py-2 space-y-2 overflow-y-auto flex-1 min-h-0 w-full job-board-v-scroll"
        style={{ background: listTint }}
      >
        <SortableContext
          items={visibleCards.map((c: any) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {visibleCards.map((card: any, cardIndex: number) => (
            <SortableCard
              key={card.id}
              card={card}
              cardIndex={cardIndex}
              activeId={activeId}
              reload={reload}
            />
          ))}
        </SortableContext>
        {q && visibleCards.length === 0 && (
          <p className="text-[11px] text-slate-500 px-1 py-2">No cards match “{listSearch.trim()}”</p>
        )}
      </div>

      {/* Add Card only when Display cards from = Manual */}
      {!hideAddCard && (
        <div className="px-3 py-2 w-full shrink-0 border-t border-slate-200/70" style={{ background: listTint }}>
          {adding ? (
            <div className="space-y-2 w-full">
              <input
                className="!w-full border rounded p-2 text-sm text-left"
                placeholder="Enter a title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <div className="flex gap-2 justify-start">
                <button
                  onClick={async () => {
                    if (!title.trim()) return

                    try {
                      const res = await api.post(
                        `/job-boards/lists/${list.id}/cards`,
                        { title }
                      )
                      const newCard = res.data?.data ?? res.data
                      list.cards = [newCard, ...list.cards]

                      setTitle('')
                      setAdding(false)

                      reload()
                    } catch (err) {
                      console.error('Failed to create card', err)
                    }
                  }}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                >
                  Add card
                </button>

                <button
                  onClick={() => setAdding(false)}
                  className="text-sm text-slate-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full text-left text-sm text-slate-500 hover:text-black"
            >
              + Add Card
            </button>
          )}
        </div>
      )}


      <ConfirmModal
        open={confirmOpen}
        title="Delete Stage"
        message="Are you sure you want to delete this stage and all its cards?"
        confirmText="Delete"
        loading={deleting}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          try {
            setDeleting(true)

            await api.delete(`/job-boards/lists/${list.id}`)


            setBoard((prev: any) => ({
              ...prev,
              lists: prev.lists.filter((l: any) => l.id !== list.id),
            }))

            setConfirmOpen(false)
          } finally {
            setDeleting(false)
          }
        }}
      />

    </div>
  )
}
