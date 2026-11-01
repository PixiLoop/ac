import { baseURL } from './api-client'

export function resolveMediaUrl(path?: string | null) {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
    return path
  }
  return `${baseURL}${path.startsWith('/') ? '' : '/'}${path}`
}

/** Private Azure blobs must be fetched via JWT API proxy (same as checklist photos). */
export function needsAuthMediaFetch(url: string) {
  if (!url) return false
  if (url.includes('.blob.core.windows.net/')) return true
  return (
    (url.includes('/job-boards/') || url.includes('/installations/')) &&
    url.includes('/file')
  )
}

export async function fetchAuthenticatedObjectUrl(path?: string | null): Promise<string | null> {
  if (!path) return null
  const absolute = resolveMediaUrl(path)
  if (!needsAuthMediaFetch(absolute)) return absolute

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
  const res = await fetch(absolute, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const contentType = (res.headers.get('content-type') || '').toLowerCase()
  const blob = await res.blob()
  if (
    contentType.includes('application/json') ||
    contentType.includes('text/') ||
    blob.size < 32
  ) {
    throw new Error(`Unexpected media payload (${contentType || 'unknown'}, ${blob.size}b)`)
  }
  const imageBlob =
    contentType.startsWith('image/') || blob.type.startsWith('image/')
      ? blob
      : new Blob([blob], { type: contentType || 'image/jpeg' })
  return URL.createObjectURL(imageBlob)
}
