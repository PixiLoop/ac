'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Pencil, Trash2, MessageSquare, Paperclip, CheckSquare } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../../lib/api-client'
import { useToast } from '../ui/toast'
import ConfirmModal from '../ui/ConfirmModal'
import { fetchAuthenticatedObjectUrl } from '../../lib/authenticated-media'

export default function SortableCard({ card, reload }: any) {
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    touchAction: 'none' as const,
    userSelect: 'none' as const,
    WebkitUserSelect: 'none' as const,
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

  const rawCover =
    card.coverImageUrl ||
    card.attachments?.find((a: any) =>
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
        className="bg-white rounded shadow hover:shadow-md cursor-grab active:cursor-grabbing relative overflow-hidden select-none"
      >
        {coverUrl && (
          <div
            className="h-28 w-full bg-cover bg-center pointer-events-none"
            style={{ backgroundImage: `url(${coverUrl})` }}
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
