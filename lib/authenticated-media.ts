import { baseURL } from './api-client'

export function resolveMediaUrl(path?: string | null) {
  if (!path) return ''
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('blob:') ||
    path.startsWith('data:')
  ) {
    return path
  }
  const cleanBase = (baseURL || '').replace(/\/+$/, '')
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  if (cleanBase && cleanPath.startsWith(cleanBase)) {
    return cleanPath
  }
  if (cleanBase.endsWith('/api') && cleanPath.startsWith('/api/')) {
    return cleanPath
  }
  return `${cleanBase}${cleanPath}`
}

/** Private Azure blobs or authenticated proxy file endpoints. */
export function needsAuthMediaFetch(url: string) {
  if (!url) return false
  if (url.startsWith('data:') || url.startsWith('blob:')) return false
  if (url.includes('.blob.core.windows.net/')) return true
  return (
    (url.includes('/job-boards/') || url.includes('/installations/')) &&
    url.includes('/file')
  )
}

export async function fetchAuthenticatedObjectUrl(path?: string | null): Promise<string | null> {
  if (!path) return null
  if (path.startsWith('data:') || path.startsWith('blob:')) return path

  // Public http(s) URLs that are not private Azure / API file proxies — use directly
  if (
    (path.startsWith('http://') || path.startsWith('https://')) &&
    !needsAuthMediaFetch(path)
  ) {
    return path
  }

  const absolute = resolveMediaUrl(path)

  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    const res = await fetch(absolute, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) return null
    const contentType = (res.headers.get('content-type') || '').toLowerCase()
    const blob = await res.blob()
    if (
      contentType.includes('application/json') ||
      contentType.includes('text/') ||
      blob.size < 32
    ) {
      return null
    }
    const imageBlob =
      contentType.startsWith('image/') || blob.type.startsWith('image/')
        ? blob
        : new Blob([blob], { type: contentType || 'image/jpeg' })
    return URL.createObjectURL(imageBlob)
  } catch {
    return null
  }
}
