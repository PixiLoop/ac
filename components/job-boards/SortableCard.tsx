'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Pencil, Trash2, MessageSquare, Paperclip, CheckSquare, Clock } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../../lib/api-client'
import { useToast } from '../ui/toast'
import ConfirmModal from '../ui/ConfirmModal'
import { fetchAuthenticatedObjectUrl } from '../../lib/authenticated-media'

const CARD_COLORS = [
  { bg: '#ffffff', border: '#e2e8f0' },
  { bg: '#f0f9ff', border: '#bae6fd' },
  { bg: '#f0fdf4', border: '#bbf7d0' },
  { bg: '#fffbeb', border: '#fde68a' },
  { bg: '#faf5ff', border: '#e9d5ff' },
  { bg: '#fff1f2', border: '#fecdd3' },
]

export default function SortableCard({ card, cardIndex = 0, reload }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
  })

  const router = useRouter()
  const { showToast } = useToast()

  const [hovered, setHovered] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const didDrag = useRef(false)
  const tint = CARD_COLORS[cardIndex % CARD_COLORS.length]

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    touchAction: 'none' as const,
    userSelect: 'none' as const,
    WebkitUserSelect: 'none' as const,
    backgroundColor: tint.bg,
    borderColor: tint.border,
  }

  const openDetail = () => {
    router.push(`/admin/job-boards/cards/${card.id}`)
  }

  const handleDelete = async () => {
    setLoading(true)

    try {
      await api.delete(`/job-boards/cards/${card.id}`)
      reload(card.id)
      showToast({
        type: 'success',
        title: 'Card deleted successfully',
      })
      setShowConfirm(false)
    } catch {
      showToast({
        type: 'error',
        title: 'Failed to delete card',
      })
    } finally {
      setLoading(false)
    }
  }

  const isColorCover =
    !!card.coverImageUrl && /^color:#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(card.coverImageUrl).trim())
  const coverColor = isColorCover
    ? String(card.coverImageUrl).replace(/^color:/i, '')
    : null

  const rawCover = isColorCover
    ? null
    : card.coverImageUrl
      ? `${card.coverImageUrl}${String(card.coverImageUrl).includes('?') ? '&' : '?'}v=${card.updatedAt || ''}`
      : card.attachments?.find((a: any) =>
          /\.(png|jpe?g|gif|webp|bmp)$/i.test(a.fileName || a.fileUrl || ''),
        )?.fileUrl

  const [coverUrl, setCoverUrl] = useState<string | null>(null)

  useEffect(() => {
    let revoked: string | null = null
    let cancelled = false
    setCoverUrl(null)
    if (!rawCover) return
    ;(async () => {
      try {
        const url = await fetchAuthenticatedObjectUrl(rawCover)
        if (cancelled || !url) return
        if (url.startsWith('blob:')) revoked = url
        setCoverUrl(url)
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [rawCover])

  const commentCount =
    card._count?.activities ??
    card.activities?.filter((a: any) => a.type === 'COMMENT')?.length ??
    0
  const attachmentCount =
    card._count?.attachments ?? card.attachments?.length ?? 0
  const checklistItems =
    card.checklists?.flatMap((c: any) => c.items || []) ?? []
  const checklistDone = checklistItems.filter((i: any) => i.isCompleted).length

  // Preserve dnd-kit listeners — do not overwrite onPointerDown
  const { onPointerDown: dndPointerDown, ...restListeners } = listeners || {}

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...restListeners}
        onPointerDown={(e) => {
          pointerStart.current = { x: e.clientX, y: e.clientY }
          didDrag.current = false
          dndPointerDown?.(e)
        }}
        onPointerMove={(e) => {
          const start = pointerStart.current
          if (!start) return
          if (
            Math.abs(e.clientX - start.x) > 8 ||
            Math.abs(e.clientY - start.y) > 8
          ) {
            didDrag.current = true
          }
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button')) return
          if (didDrag.current || isDragging) {
            didDrag.current = false
            return
          }
          openDetail()
        }}
        className="rounded-lg border shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing relative overflow-hidden select-none"
      >
        {(coverUrl || coverColor) && (
          <div
            className="h-28 w-full bg-cover bg-center pointer-events-none"
            style={
              coverUrl
                ? { backgroundImage: `url(${coverUrl})` }
                : { backgroundColor: coverColor || undefined }
            }
          />
        )}

        <div className="p-3 text-left pointer-events-none">
          {card.labels?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {card.labels.map((l: any) => (
                <span
                  key={l.id}
                  className="h-2 w-10 rounded-full"
                  style={{ backgroundColor: l.color }}
                  title={l.name}
                />
              ))}
            </div>
          )}

          <div className="text-sm font-medium text-slate-800 pr-10">{card.title}</div>

          {card.dueDate && (
            <div className="mt-2">
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded ${
                  new Date(card.dueDate).getTime() < Date.now()
                    ? 'bg-red-100 text-red-800'
                    : new Date(card.dueDate).getTime() < Date.now() + 2 * 86400000
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-700'
                }`}
                title="Due date (Completion Time)"
              >
                <Clock size={11} />
                {new Date(card.dueDate).toLocaleString('en-AU', {
                  day: 'numeric',
                  month: 'short',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
                {new Date(card.dueDate).getTime() < Date.now() + 2 * 86400000 &&
                  new Date(card.dueDate).getTime() >= Date.now() && (
                    <span className="ml-0.5">Due soon</span>
                  )}
              </span>
            </div>
          )}

          {(commentCount > 0 || attachmentCount > 0 || checklistItems.length > 0) && (
            <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
              {commentCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <MessageSquare size={12} /> {commentCount}
                </span>
              )}
              {attachmentCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Paperclip size={12} /> {attachmentCount}
                </span>
              )}
              {checklistItems.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <CheckSquare size={12} /> {checklistDone}/{checklistItems.length}
                </span>
              )}
            </div>
          )}
        </div>

        {hovered && (
          <div className="absolute top-2 right-2 flex gap-2 bg-white/90 rounded px-1 py-0.5 shadow z-10 pointer-events-auto">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                openDetail()
              }}
              className="text-gray-500 hover:text-blue-600"
              title="Open details"
            >
              <Pencil size={16} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setShowConfirm(true)
              }}
              className="text-gray-500 hover:text-red-600"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      <ConfirmModal
        open={showConfirm}
        title="Delete Card"
        message="Are you sure you want to delete this card?"
        confirmText="Delete"
        cancelText="Cancel"
        loading={loading}
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  )
}
