'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AdminShell } from '../../../../components/layout/AdminShell'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { api } from '../../../../lib/api-client'
import BoardColorPicker from '../../../../components/job-boards/BoardColorPicker'
import { useSearchParams } from 'next/navigation'
import { useToast } from '../../../../components/ui/toast'
import { AuthenticatedPhoto } from '../../../../components/job-boards/operations/shared/AuthenticatedPhoto'

type SourceType = 'MANUAL' | 'JOB_BOOK_ENTRY' | 'FM_INSTALL'

export default function CreateBoardPage() {
  const router = useRouter()
  const [color, setColor] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sourceType, setSourceType] = useState<SourceType>('JOB_BOOK_ENTRY')
  const [backgroundImage, setBackgroundImage] = useState('')
  const [backgroundPreview, setBackgroundPreview] = useState('')
  const [uploadingBg, setUploadingBg] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
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
      setSourceType(data.sourceType || 'MANUAL')
      setBackgroundImage(data.backgroundImage || '')
      setBackgroundPreview(data.backgroundImage || '')
    }

    loadBoard()
  }, [editId])

  const onPickBackground = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Local preview immediately
    const localUrl = URL.createObjectURL(file)
    setBackgroundPreview(localUrl)

    // If editing an existing board, upload now; otherwise stash as data URL for create
    if (editId) {
      try {
        setUploadingBg(true)
        const formData = new FormData()
        formData.append('file', file)
        const res = await api.post(`/job-boards/${editId}/background`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        const url = res.data?.data?.backgroundImage ?? res.data?.backgroundImage
        setBackgroundImage(url || '')
        setBackgroundPreview(url || localUrl)
        showToast({ type: 'success', title: 'Background uploaded' })
      } catch {
        showToast({ type: 'error', title: 'Failed to upload background' })
      } finally {
        setUploadingBg(false)
      }
    } else {
      // Convert to base64 data URL so create can store it after board exists, then upload
      const reader = new FileReader()
      reader.onload = () => {
        setBackgroundImage(String(reader.result || ''))
      }
      reader.readAsDataURL(file)
    }
  }

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
        // Never write API proxy paths back into DB (that wiped Azure URLs on refresh)
        const canPersistBg =
          !!backgroundImage &&
          !backgroundImage.startsWith('data:') &&
          !backgroundImage.includes('/background/file') &&
          (backgroundImage.startsWith('http://') || backgroundImage.startsWith('https://'))

        await api.patch(`/job-boards/${editId}`, {
          name,
          description,
          color,
          sourceType,
          ...(backgroundImage === ''
            ? { backgroundImage: null }
            : canPersistBg
              ? { backgroundImage }
              : {}),
        })
      } else {
        const res = await api.post('/job-boards', {
          name,
          description,
          color,
          sourceType,
          // Only send http(s) URLs on create; data URLs uploaded after
          backgroundImage:
            backgroundImage && !backgroundImage.startsWith('data:')
              ? backgroundImage
              : null,
        })
        const board = res.data?.data ?? res.data

        // Upload pending background file after board exists
        if (board?.id && backgroundImage?.startsWith('data:') && fileRef.current?.files?.[0]) {
          const formData = new FormData()
          formData.append('file', fileRef.current.files[0])
          await api.post(`/job-boards/${board.id}/background`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        }
      }

      router.push('/admin/job-boards')
    } catch {
      alert('Failed to save board')
    }
  }

  return (
    <AdminShell title={editId ? 'Edit Job Board' : 'Create Job Board'}>
      <div className="max-w-lg space-y-5">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/job-boards')}
          >
            ← Back to Job Boards
          </Button>
        </div>

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

        <div className="space-y-2">
          <div className="text-xs font-medium text-slate-600">Display cards from</div>
          {/* Table layout — immune to global label/input CSS that stretches radios */}
          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: 12,
              background: '#fff',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {(
                  [
                    { value: 'JOB_BOOK_ENTRY' as const, label: 'Job Book Entry' },
                    { value: 'FM_INSTALL' as const, label: 'FM Install' },
                    { value: 'MANUAL' as const, label: 'Manual (blank board)' },
                  ] as const
                ).map(opt => (
                  <tr
                    key={opt.value}
                    onClick={() => setSourceType(opt.value)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td
                      style={{
                        width: 22,
                        verticalAlign: 'middle',
                        padding: '8px 0',
                      }}
                    >
                      <input
                        type="radio"
                        name="jobBoardSourceType"
                        checked={sourceType === opt.value}
                        onChange={() => setSourceType(opt.value)}
                        style={{
                          width: 14,
                          height: 14,
                          minWidth: 14,
                          maxWidth: 14,
                          margin: 0,
                          padding: 0,
                          display: 'block',
                          accentColor: '#00b0b3',
                        }}
                      />
                    </td>
                    <td
                      style={{
                        verticalAlign: 'middle',
                        padding: '8px 0 8px 10px',
                        whiteSpace: 'nowrap',
                        fontSize: 14,
                        color: '#334155',
                        lineHeight: '20px',
                      }}
                    >
                      {opt.label}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sourceType !== 'MANUAL' && (
            <p className="text-xs text-slate-500">
              Cards from {sourceType === 'JOB_BOOK_ENTRY' ? 'Job Book Entry' : 'FM Install'} will
              load into the first list (To Do). Drag them to In Progress as needed. Add Card is
              hidden unless Manual is selected.
            </p>
          )}
        </div>

        {/* Background image */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Background image</label>
          <div className="rounded-lg border border-slate-200 p-3 bg-white space-y-3">
            {(backgroundPreview || backgroundImage) && (
              backgroundPreview?.startsWith('blob:') || backgroundImage?.startsWith('data:') ? (
                <img
                  src={backgroundPreview || backgroundImage}
                  alt="Background preview"
                  className="h-28 w-full rounded-md object-cover border bg-slate-100"
                />
              ) : (
                <AuthenticatedPhoto
                  src={backgroundPreview || backgroundImage}
                  alt="Background preview"
                  className="h-28 w-full rounded-md object-cover border bg-slate-100"
                  openOnClick={false}
                />
              )
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="text-sm"
                onChange={onPickBackground}
              />
              {uploadingBg && (
                <span className="text-xs text-slate-500">Uploading…</span>
              )}
              {(backgroundImage || backgroundPreview) && (
                <button
                  type="button"
                  className="text-xs text-red-600"
                  onClick={() => {
                    setBackgroundImage('')
                    setBackgroundPreview('')
                    if (fileRef.current) fileRef.current.value = ''
                  }}
                >
                  Remove
                </button>
              )}
            </div>
            <Input
              label="Or paste image URL"
              value={backgroundImage.startsWith('data:') ? '' : backgroundImage}
              onChange={e => {
                setBackgroundImage(e.target.value)
                setBackgroundPreview(e.target.value)
              }}
              placeholder="https://…"
            />
          </div>
        </div>

        <BoardColorPicker value={color} onChange={setColor} />

        <div className="flex items-center gap-3">
          <Button onClick={onSave}>
            {editId ? 'Update Board' : 'Create Board'}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/admin/job-boards')}
          >
            Back
          </Button>
        </div>
      </div>
    </AdminShell>
  )
}
