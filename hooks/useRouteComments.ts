'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useComments } from '../providers/CommentProvider'

export function useRouteComments() {
  const pathname = usePathname()
  const { setContext } = useComments()

  useEffect(() => {
    if (!pathname) return

    const segments = pathname.split('?')[0].split('/').filter(Boolean)

    const page = segments[0] || 'dashboard'

    let entityType = 'module'
    let entityId = page
    let title = page

    // CREATE PAGE
    if (segments.length === 2 && segments[1] === 'new') {
      entityType = page
      entityId = 'create'
      title = `Create ${page}`
    }

    // EDIT PAGE
    else if (segments.length === 2) {
      entityType = page.slice(0, -1)
      entityId = segments[1]
      title = `${page} #${segments[1]}`
    }

    // VIEW PAGE
    else if (segments.length === 3) {
      entityType = page.slice(0, -1)
      entityId = segments[1]
      title = `${page} #${segments[1]}`
    }

    const ctx = {
      entityType,
      entityId,
      title,
    }

    console.log('Comment context set:', ctx)

    setContext(ctx)

  }, [pathname])
}