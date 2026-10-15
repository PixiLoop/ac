'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminShell } from '../../../components/layout/AdminShell'
import { Button } from '../../../components/ui/button'
import { api } from '../../../lib/api-client'
import { useToast } from '../../../components/ui/toast'
import ConfirmModal from '../../../components/ui/ConfirmModal'
import Link from 'next/link'
import { useAuth } from '../../../providers/auth-provider'
import { createPermissionChecker } from '../../../lib/permission'

export default function JobBoardsPage() {
  const router = useRouter()
  const [boards, setBoards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const { showToast } = useToast()
  const [deleteBoardId, setDeleteBoardId] = useState<string | null>(null)

  const { permissions, isSystem } = useAuth()
  const { has } = createPermissionChecker(permissions, isSystem)

  const canView = has('jobboards.view')
  const canCreate = has('jobboards.create')
  const canEdit = has('jobboards.edit')
  const canDelete = has('jobboards.delete')

  useEffect(() => {
    const handleClick = () => setOpenMenuId(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])


  useEffect(() => {
    const loadBoards = async () => {
      try {
        const res = await api.get('/job-boards')
        const data = res.data

        if (Array.isArray(data)) {
          setBoards(data)
        } else if (Array.isArray(data.data)) {
          setBoards(data.data)
        } else if (Array.isArray(data.items)) {
          setBoards(data.items)
        } else {
          setBoards([])
        }
      } catch (err) {
        console.error(err)
        setBoards([])
      } finally {
        setLoading(false)
      }
    }

    loadBoards()
  }, [])

  if (!canView) {
    return (
      <AdminShell title="Job Boards">
        <p className="text-sm text-slate-600">You do not have permission.</p>
      </AdminShell>
    )
  }

  return (
    <AdminShell title="Job Boards">
      <ConfirmModal
        open={!!deleteBoardId}
        message="Are you sure you want to delete this board?"
        confirmText="Delete"
        onCancel={() => setDeleteBoardId(null)}
        onConfirm={async () => {
          if (!deleteBoardId) return

          try {
            await api.delete(`/job-boards/${deleteBoardId}`)

            setBoards(prev =>
              prev.filter(b => b.id !== deleteBoardId),
            )

            showToast({
              type: 'success',
              title: 'Board deleted successfully',
            })
          } catch {
            showToast({
              type: 'error',
              title: 'Failed to delete board',
            })
          }

          setDeleteBoardId(null)
        }}
      />

      <div className="flex justify-end mb-6">
        <Link href="/admin/job-boards/new">
          <Button>New Board</Button>
        </Link>
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {boards.map(board => (
            <div key={board.id} className="relative group">

              {/* CARD */}
              <div
                onClick={() => router.push(`/admin/job-boards/${board.id}`)}
                className="cursor-pointer rounded-xl bg-white shadow-sm hover:shadow-md transition overflow-hidden border"
              >
                {/* Color Strip */}
                <div
                  className="h-24"
                  style={{ background: board.color || '#d1d5db' }}
                />

                <div className="p-4">
                  <h3 className="font-medium text-sm text-slate-800 truncate">
                    {board.name}
                  </h3>
                </div>
              </div>

              {/*DOT BUTTON (SHOW ONLY ON HOVER) */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setOpenMenuId(openMenuId === board.id ? null : board.id)
                }}
                className="
        absolute top-2 right-2
        opacity-0 group-hover:opacity-100
        transition
        p-1 rounded
        hover:bg-black/10
      "
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 text-slate-700"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M4 10a2 2 0 114 0 2 2 0 01-4 0zm6 0a2 2 0 114 0 2 2 0 01-4 0zm6 0a2 2 0 114 0 2 2 0 01-4 0z" />
                </svg>
              </button>

              {/* Dropdown */}
              {openMenuId === board.id && (
                <div className="absolute top-10 right-2 w-28 bg-white rounded-lg shadow-lg border py-1 z-50">
                  <Link href={`/admin/job-boards/new?id=${board.id}`}>
                    <button
                      className="block w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-gray-100"
                    >
                      Edit
                    </button>
                  </Link>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteBoardId(board.id)
                      setOpenMenuId(null)
                    }}
                    className="block w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-gray-100"
                  >
                    Delete
                  </button>
                </div>









              )}

            </div>
          ))}
        </div>
      )}
    </AdminShell>
  )
}
