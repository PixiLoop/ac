'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import SortableCard from './SortableCard'
import { useState, useRef, useEffect } from 'react'
import { api } from '../../lib/api-client'
import ConfirmModal from '../../components/ui/ConfirmModal'
import BoardColorPicker from './BoardColorPicker'
import { Pencil, Trash2 } from 'lucide-react'


export default function SortableList({ list, reload, activeId, setBoard }: any) {
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  }
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')

  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState(list.name)
  const [hovering, setHovering] = useState(false)
  const [showColors, setShowColors] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)

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
      className="min-w-[260px] w-[260px] rounded-lg shadow-sm flex flex-col max-h-full overflow-hidden"
      style={{
        background: list.color || '#ffffff',
      }}

    >
      <div
        ref={headerRef}
        className="relative p-3"
        style={{
          background: list.color || '#ffffff',
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
            className="font-semibold cursor-grab pr-12"
          >
            {list.name}
          </div>
        )}

        {/* Hover Icons */}
        {hovering && !editingName && (
          <div className="absolute right-3 top-3 flex items-center gap-2 text-gray-500">
            {/* Edit */}
            <button
              onClick={() => setEditingName(true)}
              className="hover:text-black text-sm"
            >
              <Pencil size={16} />
            </button>

            {/* Delete */}
            <button
              onClick={() => setConfirmOpen(true)}
              className="hover:text-red-500 text-sm"
            >
              <Trash2 size={16} />
            </button>

            {/* Color */}
            <button
              onClick={() => setShowColors(!showColors)}
              className="hover:text-black text-sm"
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
      </div>

      <div className="p-2 space-y-2 overflow-y-auto max-h-[60vh] p-2 space-y-2 overflow-y-auto">
        <SortableContext
          items={list.cards.map((c: any) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {list.cards.map(card => (
            <SortableCard
              key={card.id}
              card={card}
              activeId={activeId}
              reload={reload}
            />
          ))}
        </SortableContext>
      </div>

      <div className="p-2">
        {adding ? (
          <div className="space-y-2">
            <input
              className="w-full border rounded p-2 text-sm"
              placeholder="Enter a title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!title.trim()) return

                  try {
                    const res = await api.post(
                      `/job-boards/lists/${list.id}/cards`,
                      { title }
                    )
                    const newCard = res.data?.data ?? res.data
                    list.cards = [...list.cards, newCard]

                    setTitle('')
                    setAdding(false)

                    reload() //keep reload for safety
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
            className="w-full text-sm text-slate-500 hover:text-black"
          >
            + Add Card
          </button>
        )}
      </div>


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
