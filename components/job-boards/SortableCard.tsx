'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../../lib/api-client'
import { useToast } from '../ui/toast'
import ConfirmModal from '../ui/ConfirmModal'

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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  }

  const handleDelete = async () => {
    setLoading(true)

    try {
      await api.delete(`/job-boards/cards/${card.id}`)

      reload(card.id) //remove from UI state

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

  const handleEdit = (e: any) => {
    e.stopPropagation()
    router.push(`/admin/job-boards/cards/${card.id}`)
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="bg-white p-3 rounded shadow hover:shadow-md cursor-grab relative"
      >
        {card.title}

        {hovered && (
          <div className="absolute top-2 right-2 flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleEdit(e)
              }}
              className="text-gray-500 hover:text-blue-600"
            >
              <Pencil size={16} />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowConfirm(true)
              }}
              className="text-gray-500 hover:text-red-600"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Confirm Modal */}
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