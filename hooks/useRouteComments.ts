'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useComments } from '../providers/CommentProvider'

function isRecordId(segment: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)
    || /^c[a-z0-9]{24}$/i.test(segment)
}

export function useRouteComments() {
  const pathname = usePathname()
  const { setContext } = useComments()

  useEffect(() => {
    if (!pathname) return

    const segments = pathname.split('?')[0].split('/').filter(Boolean)
    const recordId = [...segments].reverse().find(isRecordId)

    // Lists and unsaved new screens have no record id yet.
    if (!recordId || segments.includes('new')) {
      setContext(null)
      return
    }

    const page = segments[0] || 'record'
    const idIndex = segments.lastIndexOf(recordId)

    // /module/:id and /module/:id/view keep the existing comment thread key.
    const entityType = idIndex === 1
      ? page.slice(0, -1)
      : (segments[idIndex - 1] || page).replace(/s$/, '')

    setContext({
      entityType,
      entityId: recordId,
      title: `${page} #${recordId}`,
    })
  }, [pathname, setContext])
}