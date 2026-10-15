'use client'

import { MessageCircle } from 'lucide-react'
import { useComments } from '../../providers/CommentProvider'

export function FloatingChatButton() {
  const { open, unreadCount, isOpen } = useComments()
  if (isOpen) return null
  return (
    <button
      onClick={open}
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg"
    >
      <MessageCircle />

      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
          {unreadCount}
        </span>
      )}
    </button>
  )
}
