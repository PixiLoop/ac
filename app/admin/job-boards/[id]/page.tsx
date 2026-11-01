'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import BoardView from '../../../../components/job-boards/BoardView'
import { AdminShell } from '../../../../components/layout/AdminShell'
import { api } from '../../../../lib/api-client'
import { Button } from '../../../../components/ui/button'
import { fetchAuthenticatedObjectUrl } from '../../../../lib/authenticated-media'

export default function JobBoardDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [board, setBoard] = useState<any>(null)
  const [bgObjectUrl, setBgObjectUrl] = useState<string | null>(null)
  const [bgFailed, setBgFailed] = useState(false)

  const loadBoard = async () => {
    const res = await api.get(`/job-boards/${id}`)
    const result = res.data
    setBoard(result.data ?? result)
  }

  useEffect(() => {
    if (id) loadBoard()
  }, [id])

  useEffect(() => {
    let revoked: string | null = null
    let cancelled = false
    setBgObjectUrl(null)
    setBgFailed(false)

    if (!board?.backgroundImage) return

    ;(async () => {
      try {
        // Always load via auth proxy path for this board (stable after refresh)
        const path =
          board.backgroundImage?.includes('/background/file')
            ? board.backgroundImage
            : `/job-boards/${board.id}/background/file`
        const url = await fetchAuthenticatedObjectUrl(path)
        if (cancelled || !url) {
          if (!cancelled) setBgFailed(true)
          return
        }
        if (url.startsWith('blob:')) revoked = url
        setBgObjectUrl(url)
      } catch {
        if (!cancelled) {
          setBgObjectUrl(null)
          setBgFailed(true)
        }
      }
    })()

    return () => {
      cancelled = true
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [board?.id, board?.backgroundImage])

  if (!board) return <div className="p-6">Loading...</div>

  // Color is the base layer; background image sits on top when loaded
  const bgStyle: React.CSSProperties = {
    backgroundColor: board.color || '#f1f5f9',
    ...(bgObjectUrl
      ? {
          backgroundImage: `linear-gradient(rgba(15,23,42,0.2), rgba(15,23,42,0.2)), url(${bgObjectUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }
      : {}),
  }

  return (
    <AdminShell title={board.name || 'Job Board'}>
      <div className="mb-3 flex items-center gap-3 flex-wrap">
        <Button
          variant="outline"
          onClick={() => router.push('/admin/job-boards')}
        >
          ← Back to Job Boards
        </Button>
        {board.backgroundImage && bgFailed && (
          <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
            Background image could not load — re-upload it in Edit Board.
          </span>
        )}
      </div>
      <div
        className="h-[calc(100vh-160px)] overflow-x-auto rounded-xl"
        style={bgStyle}
      >
        <BoardView board={board} setBoard={setBoard} reload={loadBoard} />
      </div>
    </AdminShell>
  )
}
