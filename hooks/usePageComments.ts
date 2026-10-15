'use client'

import { useEffect } from 'react'
import { useComments } from '../providers/CommentProvider'

export function usePageComments(entityType: string, entityId: string, title?: string) {
  const { setContext } = useComments()

  useEffect(() => {
    setContext({
      entityType,
      entityId,
      title,
    })
  }, [entityType, entityId, title, setContext])
}