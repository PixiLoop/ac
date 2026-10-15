'use client'

import { useEffect, useState, useRef } from 'react'
import { X, Send } from 'lucide-react'
import { useComments } from '../../providers/CommentProvider'
import { socket } from '../../lib/socket'
import { api } from '../../lib/api-client';

type Comment = {
  id: string
  message: string
  createdAt: string
  createdBy: string
  createdByName?: string | null
  type: 'COMMENT' | 'SYSTEM'
}

export function GlobalCommentSidebar() {
  const {
    isOpen,
    close,
    context,
    incrementUnread,
  } = useComments()


  const [messages, setMessages] = useState<Comment[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  const bottomRef = useRef<HTMLDivElement | null>(null)
  const joinedRoomRef = useRef<string | null>(null)

  //LOAD COMMENTS
  useEffect(() => {
    if (!context?.entityId || !isOpen) return

    async function loadComments() {
      try {
        const { data } = await api.get(
          `/comments/${context.entityType}/${context.entityId}`
        )
        setMessages(Array.isArray(data) ? data : data?.data || [])
      } catch (err) {
        console.error('Failed to load comments', err)
      }
    }

    loadComments()
  }, [context?.entityType, context?.entityId, isOpen])

  useEffect(() => {
    if (!context?.entityId) return

    const room = `${context.entityType}:${context.entityId}`

    if (joinedRoomRef.current !== room) {
      socket.emit('join', room)
      joinedRoomRef.current = room
    }

    function onNewComment(comment: Comment) {
      setMessages(prev => {
        if (prev.some(m => m.id === comment.id)) return prev

        if (!isOpen) incrementUnread()

        return [...prev, comment]
      })
    }

    socket.on('comment:new', onNewComment)

    return () => {
      socket.off('comment:new', onNewComment)
    }

  }, [context?.entityType, context?.entityId, isOpen])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim()) return
    if (sending) return
    if (!context) return

    try {
      setSending(true)

      const res = await api.post('/comments', {
        entityType: context.entityType,
        entityId: context.entityId,
        message: input.trim(),
      })

      // normalize API response
      const data = res.data?.data ?? res.data

      const newComment: Comment = {
        id: data.id,
        message: data.message,
        createdAt: data.createdAt || new Date().toISOString(),
        createdBy: data.createdBy,
        createdByName: data.createdByName ?? 'User',
        type: data.type || 'COMMENT',
      }

      setMessages(prev => {
        if (prev.some(m => m.id === newComment.id)) return prev
        return [...prev, newComment]
      })

      setInput('')

    } catch (err) {
      console.error('Failed to send comment', err)
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <aside
      className={`fixed top-0 right-0 z-40 h-full w-96 bg-white border-l shadow-lg transition-transform flex flex-col
      ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <p className="font-semibold">Comments</p>
          <p className="text-xs text-muted-foreground">
            {context ? (context.title || context.entityId) : 'Loading...'}
          </p>
        </div>
        <button onClick={close}>
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No comments yet
          </p>
        )}

        {messages.map(msg => {
          const isMe =
            msg.createdBy === localStorage.getItem('userId')

          // SYSTEM / AUDIT MESSAGE
          if (msg.type === 'SYSTEM') {
            return (
              <div
                key={msg.id || msg.createdAt}
                className="text-xs text-center text-gray-400"
              >
                {msg.message}
              </div>
            )
          }

          return (
            <div
              key={msg.id || msg.createdAt}
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm
                ${isMe
                  ? 'ml-auto bg-blue-500 text-white'
                  : 'mr-auto bg-gray-200'
                }`}
            >
              <div className="text-[10px] opacity-70 mb-1">
                {isMe ? 'You' : (msg.createdByName || 'User')} •{' '}
                {msg.createdAt
                  ? new Date(msg.createdAt).toLocaleString()
                  : 'Just now'}
              </div>
              <div>{msg.message}</div>
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a comment..."
          className="flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none"
        />

        <button
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          className="rounded-md bg-blue-600 px-3 text-white disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </div>
    </aside>
  )
}
