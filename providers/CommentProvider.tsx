'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from 'react'

import { GlobalCommentSidebar } from '../components/comments/GlobalCommentSidebar'
import { FloatingChatButton } from '../components/comments/FloatingChatButton'
import { useRouteComments } from '../hooks/useRouteComments'

type CommentContextType = {
  isOpen: boolean
  open: () => void
  close: () => void
  setContext: (ctx: any) => void
  context: any
  unreadCount: number
  incrementUnread: () => void
}

const CommentContext = createContext<CommentContextType | null>(null)

export function useComments() {
  const ctx = useContext(CommentContext)
  if (!ctx) {
    throw new Error('useComments must be used inside CommentProvider')
  }
  return ctx
}


function RouteCommentListener() {
  useRouteComments()
  return null
}

export function CommentProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [context, setContextState] = useState<any>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  const open = useCallback(() => {
    setIsOpen(true)
    setUnreadCount(0)
  }, [])

  const close = useCallback(() => setIsOpen(false), [])

  const setContext = useCallback((ctx: any) => {
    setContextState(ctx)
    if (!ctx?.entityId) setIsOpen(false)
  }, [])

  const incrementUnread = useCallback(() => setUnreadCount(c => c + 1), [])

  const value = useMemo(
    () => ({
      isOpen,
      open,
      close,
      setContext,
      context,
      unreadCount,
      incrementUnread,
    }),
    [isOpen, open, close, setContext, context, unreadCount, incrementUnread],
  )

  return (
    <CommentContext.Provider value={value}>
      <RouteCommentListener />
        {children}
      <GlobalCommentSidebar />
      <FloatingChatButton />
    </CommentContext.Provider>
  )
}
