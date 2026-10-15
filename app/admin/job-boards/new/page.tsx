'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminShell } from '../../../../components/layout/AdminShell'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { api } from '../../../../lib/api-client'
import BoardColorPicker from '../../../../components/job-boards/BoardColorPicker'
import { useSearchParams } from 'next/navigation'
import { useToast } from '../../../../components/ui/toast'

export default function CreateBoardPage() {
  const router = useRouter()
  const [color, setColor] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const searchParams = useSearchParams()
  const editId = searchParams.get('id')
  const { showToast } = useToast()

  useEffect(() => {
    if (!editId) return

    const loadBoard = async () => {
      const res = await api.get(`/job-boards/${editId}`)
      const data = res.data?.data ?? res.data

      setName(data.name)
      setDescription(data.description || '')
      setColor(data.color || '')
    }

    loadBoard()
  }, [editId])

  const onSave = async () => {
    const trimmedName = name.trim()

    if (!trimmedName) {
      showToast({
        type: 'error',
        title: 'Board name is required',
      })
      return
    }

    try {
      if (editId) {
        await api.patch(`/job-boards/${editId}`, {
          name,
          description,
          color,
        })
      } else {
        await api.post('/job-boards', {
          name,
          description,
          color,
        })
      }

      router.push('/admin/job-boards')
    } catch {
      alert('Failed to save board')
    }
  }

  return (
    <AdminShell title={editId ? "Edit Job Board" : "Create Job Board"}>
      <div className="max-w-lg space-y-4">
        <Input
          label="Board Name"
          value={name}
          onChange={e => setName(e.target.value)}
        />

        <Input
          label="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />

        <BoardColorPicker value={color} onChange={setColor} />

        <Button onClick={onSave}>
          {editId ? 'Update Board' : 'Create Board'}
        </Button>
      </div>
    </AdminShell>
  )
}
