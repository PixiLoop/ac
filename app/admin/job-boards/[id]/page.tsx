'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import BoardView from '../../../../components/job-boards/BoardView'
import { AdminShell } from '../../../../components/layout/AdminShell'
import { api } from '../../../../lib/api-client'

export default function JobBoardDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [board, setBoard] = useState<any>(null)

  const loadBoard = async () => {
    const res = await api.get(`/job-boards/${id}`)
    const result = res.data
    setBoard(result.data ?? result)
  }

  useEffect(() => {
    if (id) loadBoard()
  }, [id])

  if (!board) return <div className="p-6">Loading...</div>

  return (
    <AdminShell title="Job Board">
      <div className="h-[calc(100vh-120px)] bg-slate-100 overflow-x-auto" style={{
        background:  '#f1f5f9',
      }}>
        <BoardView board={board} setBoard={setBoard} reload={loadBoard} />
      </div>
    </AdminShell>
  )
}
