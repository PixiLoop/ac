'use client'

import {
  createContext,
  useContext,
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
  const [context, setContext] = useState<any>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  return (
    <CommentContext.Provider
      value={{
        isOpen,
        open: () => {
          setIsOpen(true)
          setUnreadCount(0)
        },
        close: () => setIsOpen(false),
        setContext,
        context,
        unreadCount,
        incrementUnread: () => setUnreadCount(c => c + 1),
      }}
    >
      <RouteCommentListener />
        {children}
      <GlobalCommentSidebar />
      <FloatingChatButton />
    </CommentContext.Provider>
  )
}