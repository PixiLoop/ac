'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '../../../../../lib/api-client'
import { AdminShell } from '../../../../../components/layout/AdminShell'
import { Button } from '../../../../../components/ui/button'
import { AuthenticatedPhoto } from '../../../../../components/job-boards/operations/shared/AuthenticatedPhoto'
import { useToast } from '../../../../../components/ui/toast'

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  NOT_ACTIONED: ['WORKSHOP_SETUP'],
  WORKSHOP_SETUP: ['WAITING_INSTALL'],
  WAITING_INSTALL: ['INSTALLED'],
  INSTALLED: ['INVOICED'],
  INVOICED: ['COMPLETED'],
  COMPLETED: [],
}

const STATUS_LABEL: Record<string, string> = {
  NOT_ACTIONED: 'Not Actioned',
  WORKSHOP_SETUP: 'Workshop Setup',
  WAITING_INSTALL: 'Waiting Install',
  INSTALLED: 'Installed',
  INVOICED: 'Invoiced',
  COMPLETED: 'Completed',
}

const STATUS_COLOR: Record<string, string> = {
  NOT_ACTIONED: 'bg-slate-100 text-slate-700',
  WORKSHOP_SETUP: 'bg-yellow-100 text-yellow-800',
  WAITING_INSTALL: 'bg-blue-100 text-blue-800',
  INSTALLED: 'bg-green-100 text-green-800',
  INVOICED: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
}

export default function CardEditPage() {
  const params = useParams()
  const router = useRouter()
  const { showToast } = useToast()

  const [card, setCard] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingCard, setLoadingCard] = useState(true)
  const [users, setUsers] = useState<any[]>([])

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [comment, setComment] = useState('')
  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [showActivityDetails, setShowActivityDetails] = useState(true)

  const [addingItemChecklistId, setAddingItemChecklistId] = useState<string | null>(null)
  const [newItemText, setNewItemText] = useState('')

  const [activePanel, setActivePanel] = useState<'members' | 'checklist' | 'dates' | 'attachment' | 'labels' | 'cover' | null>(null)
  const coverInputRef = useRef<HTMLInputElement | null>(null)

  const titleRef = useRef<HTMLInputElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  const [popupLabelName, setPopupLabelName] = useState('')
  const [popupLabelColor, setPopupLabelColor] = useState('#22c55e')

  const [newChecklistTitle, setNewChecklistTitle] = useState('Checklist')
  const [checklistCopyQuery, setChecklistCopyQuery] = useState('')
  const [checklistSources, setChecklistSources] = useState<any[]>([])
  const [selectedCopySource, setSelectedCopySource] = useState<{
    id: string
    sourceType: 'CARD' | 'TEMPLATE'
    title: string
  } | null>(null)
  const [checklistSourcesLoading, setChecklistSourcesLoading] = useState(false)
  const [addingChecklist, setAddingChecklist] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('#22c55e')
  const [dueDate, setDueDate] = useState('')
  const [dueDateEnabled, setDueDateEnabled] = useState(true)
  const [search, setSearch] = useState('')
  const [labelSearch, setLabelSearch] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentText, setEditingCommentText] = useState('')

  //FMPreinstall state
  const [preinstall, setPreinstall] = useState<any>(null)
  const [statusChanging, setStatusChanging] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)

  const toLocalInput = (utcString: string): string => {
    const d = new Date(utcString)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const loadCard = async () => {
    setLoadError(null)
    const res = await api.get(`/job-boards/cards/${params.id}`)
    const data = res.data?.data ?? res.data
    if (!data?.id) {
      throw new Error('Card not found')
    }
    setCard(data)
    setTitle(data.title)
    setDescription(data.description || '')
    setDueDate(data.dueDate ? toLocalInput(data.dueDate) : '')
    setDueDateEnabled(!!data.dueDate)
  }

  //Load linked FMPreinstall
  const loadPreinstall = async (cardId: string) => {
    try {
      const res = await api.get(`/fm-preinstall/by-card/${cardId}`)
      const data = res.data?.data ?? res.data
      if (data?.id) setPreinstall(data)
      else setPreinstall(null)
    } catch {
      setPreinstall(null)
    }
  }

  //Status change handler
  const handleStatusChange = async (newStatus: string) => {
    if (!preinstall) return
    setStatusChanging(true)
    setStatusError(null)
    try {
      await api.patch(`/fm-preinstall/${preinstall.id}/status`, {
        status: newStatus,
      })
      // Reload both card and preinstall so list name and status badge update
      await Promise.all([
        loadCard(),
        loadPreinstall(params.id as string),
      ])
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Status change failed'
      setStatusError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setStatusChanging(false)
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setActivePanel(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoadingCard(true)
      setLoadError(null)
      try {
        try {
          const u = await api.get('/users')
          setUsers(u.data?.data?.items ?? u.data?.items ?? [])
        } catch {
          setUsers([])
        }
        await loadCard()
        await loadPreinstall(params.id as string)
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          'Failed to load card'
        setLoadError(typeof msg === 'string' ? msg : JSON.stringify(msg))
        setCard(null)
      } finally {
        setLoadingCard(false)
      }
    }
    if (params.id) load()
  }, [params.id])

  useEffect(() => {
    const handleClickOutsideTitle = async (event: MouseEvent) => {
      if (
        titleRef.current &&
        !titleRef.current.contains(event.target as Node)
      ) {
        if (card && title !== card.title) {
          await api.patch(`/job-boards/cards/${card.id}`, { title })
          await loadCard()
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutsideTitle)
    return () => document.removeEventListener('mousedown', handleClickOutsideTitle)
  }, [title, card])

  const saveCard = async () => {
    if (!card?.id || saving) return
    setSaving(true)
    try {
      await api.patch(`/job-boards/cards/${card.id}`, {
        title: title.trim() || card.title,
        description,
        dueDate: dueDateEnabled && dueDate ? new Date(dueDate).toISOString() : null,
      })
      await loadCard()
      showToast({ type: 'success', title: 'Card saved' })
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to save'
      showToast({
        type: 'error',
        title: typeof msg === 'string' ? msg : 'Failed to save card',
      })
    } finally {
      setSaving(false)
    }
  }

  const toggleMember = async (userId: string, assigned: boolean) => {
    if (assigned) {
      await api.delete(`/job-boards/cards/${card.id}/members/${userId}`)
    } else {
      await api.post(`/job-boards/cards/${card.id}/members/${userId}`)
    }
    await loadCard()
  }

  const loadChecklistSources = async (q: string) => {
    setChecklistSourcesLoading(true)
    try {
      // Search all boards + templates (do not scope to current board only)
      const res = await api.get('/job-boards/checklists/search', {
        params: { q: q || undefined },
      })
      let data = res.data?.data ?? res.data
      if (!Array.isArray(data)) data = []

      // Fallback: also pull Checklist Templates API if search returned none
      if (data.length === 0 || !data.some((r: any) => r.sourceType === 'TEMPLATE')) {
        try {
          const tRes = await api.get('/templates', { params: { search: q || undefined } })
          const raw = tRes.data?.data ?? tRes.data
          const list = Array.isArray(raw) ? raw : raw?.data || []
          const fromTemplates = (list || []).map((t: any) => {
            const itemCount = (t.sections || []).reduce(
              (n: number, s: any) => n + (s.items?.length || 0),
              0,
            )
            return {
              id: t.id,
              sourceType: 'TEMPLATE' as const,
              title: t.name,
              subtitle: `Template · ${itemCount} items`,
              itemCount,
            }
          })
          const existingIds = new Set(data.map((r: any) => r.id))
          data = [
            ...fromTemplates.filter((t: any) => !existingIds.has(t.id)),
            ...data,
          ]
        } catch {
          /* templates module may be permission-gated */
        }
      }

      setChecklistSources(data)
    } catch {
      setChecklistSources([])
    } finally {
      setChecklistSourcesLoading(false)
    }
  }

  useEffect(() => {
    if (activePanel !== 'checklist' || !card) return
    const t = setTimeout(() => {
      loadChecklistSources(checklistCopyQuery)
    }, 250)
    return () => clearTimeout(t)
  }, [activePanel, checklistCopyQuery, card?.id])

  const addChecklist = async () => {
    if (!newChecklistTitle.trim()) return
    setAddingChecklist(true)
    try {
      await api.post(`/job-boards/cards/${card.id}/checklists`, {
        title: newChecklistTitle.trim(),
        ...(selectedCopySource?.sourceType === 'CARD'
          ? { copyFromChecklistId: selectedCopySource.id }
          : {}),
        ...(selectedCopySource?.sourceType === 'TEMPLATE'
          ? { copyFromTemplateId: selectedCopySource.id }
          : {}),
      })
      setNewChecklistTitle('Checklist')
      setChecklistCopyQuery('')
      setSelectedCopySource(null)
      setActivePanel(null)
      await loadCard()
    } finally {
      setAddingChecklist(false)
    }
  }

  const toggleItem = async (item: any) => {
    await api.patch(`/job-boards/checklist-items/${item.id}`, {
      isCompleted: !item.isCompleted,
    })
    await loadCard()
  }

  const addLabel = async () => {
    await api.post(`/job-boards/cards/${card.id}/labels`, {
      name: newLabelName,
      color: newLabelColor,
    })
    setNewLabelName('')
    await loadCard()
  }

  const addComment = async () => {
    if (!comment.trim()) return
    await api.post(`/job-boards/cards/${card.id}/comments`, {
      message: comment.trim(),
    })
    setComment('')
    await loadCard()
  }

  const addReply = async (parentId: string) => {
    if (!replyText.trim()) return
    await api.post(`/job-boards/cards/${card.id}/comments`, {
      message: replyText.trim(),
      parentId,
    })
    setReplyText('')
    setReplyingToId(null)
    await loadCard()
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes} min ago`
    if (hours < 24) return `${hours} hr ago`
    if (days < 7) return `${days} days ago`
    return d.toLocaleString()
  }

  if (loadingCard) {
    return (
      <AdminShell title="Card detail">
        <div className="p-6 text-sm text-slate-500">Loading card…</div>
      </AdminShell>
    )
  }

  if (loadError || !card) {
    return (
      <AdminShell title="Card detail">
        <div className="p-6 space-y-3 max-w-lg">
          <p className="text-sm text-red-600">
            {loadError || 'Card not found'}
          </p>
          <p className="text-xs text-slate-500">
            Use the hyphen URL: <code className="bg-slate-100 px-1 rounded">/admin/job-boards/cards/…</code>
            (not <code className="bg-slate-100 px-1 rounded">job_boards</code>).
          </p>
          <Button variant="outline" onClick={() => router.push('/admin/job-boards')}>
            ← Back to Job Boards
          </Button>
        </div>
      </AdminShell>
    )
  }

  const boardId = card.list?.boardId || card.list?.board?.id

  return (
    <AdminShell title={card.title || 'Card detail'}>
      <div className="mb-3">
        <Button
          variant="outline"
          onClick={() =>
            router.push(boardId ? `/admin/job-boards/${boardId}` : '/admin/job-boards')
          }
        >
          ← Back to Board
        </Button>
      </div>
      <div className="w-full max-w-none flex gap-6 py-4 h-[calc(100vh-160px)] overflow-hidden bg-gray-50 rounded-xl px-3 sm:px-4">

        {/*LEFT*/}
        <div className="flex-1 space-y-3 overflow-y-auto pr-2">

          {/* COVER IMAGE */}
          {card.coverImageUrl && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <AuthenticatedPhoto
                src={card.coverImageUrl}
                alt="Card cover"
                className="w-full max-h-56 object-cover"
              />
            </div>
          )}

          {/* HEADER */}
          <div className="bg-white p-4 rounded-lg shadow-sm relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <span className="text-sm text-gray-600 font-medium">
                {card.list?.name}
              </span>
            </div>

            <input
              ref={titleRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full text-2xl font-semibold border-b outline-none pb-2"
            />

            {/* ACTION BAR — Add / Checklist / Attachment / Cover (Trello-style) */}
            <div className="flex gap-2 mt-4 flex-wrap">
              <button
                onClick={() => setActivePanel(activePanel === 'members' ? null : 'members')}
                className="btn"
              >
                + Add
              </button>
              <button
                onClick={() => setActivePanel(activePanel === 'checklist' ? null : 'checklist')}
                className="btn"
              >
                Checklist
              </button>
              <button
                onClick={() => setActivePanel(activePanel === 'attachment' ? null : 'attachment')}
                className="btn"
              >
                Attachment
              </button>
              <button
                onClick={() => coverInputRef.current?.click()}
                className="btn"
              >
                Add Picture
              </button>
              <button
                onClick={() => setActivePanel(activePanel === 'dates' ? null : 'dates')}
                className="btn"
              >
                Dates
              </button>
              <button
                onClick={() => setActivePanel(activePanel === 'labels' ? null : 'labels')}
                className="btn"
              >
                Labels
              </button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const formData = new FormData()
                  formData.append('file', file)
                  await api.post(`/job-boards/cards/${card.id}/cover`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                  })
                  e.target.value = ''
                  await loadCard()
                }}
              />
            </div>

            {/* MEMBERS DROPDOWN */}
            {activePanel === 'members' && (
              <div ref={panelRef} className="absolute bg-white shadow-xl border rounded-xl p-4 mt-3 w-80 z-50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">Members</h4>
                  <button type="button" className="text-slate-400 text-sm" onClick={() => setActivePanel(null)}>✕</button>
                </div>
                <input
                  placeholder="Search members"
                  className="border rounded-lg p-2 w-full mb-3 text-sm"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {card.members?.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-semibold text-slate-500 mb-1">Card members</div>
                    <div className="space-y-1">
                      {card.members.map((m: any) => (
                        <div key={m.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-violet-500 text-white text-[11px] flex items-center justify-center font-semibold">
                              {m.user?.displayName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                            </span>
                            <span className="text-sm">{m.user?.displayName}</span>
                          </div>
                          <button
                            type="button"
                            className="text-slate-400 hover:text-red-500 text-xs"
                            onClick={() => toggleMember(m.userId, true)}
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="text-xs font-semibold text-slate-500 mb-1">Board members</div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {users
                    .filter(u => u.displayName?.toLowerCase().includes((search || '').toLowerCase()))
                    .map(u => {
                      const assigned = card.members?.some((m: any) => m.userId === u.id)
                      return (
                        <div
                          key={u.id}
                          onClick={() => toggleMember(u.id, assigned)}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${assigned ? 'bg-blue-50' : 'hover:bg-gray-100'}`}
                        >
                          <span className="w-7 h-7 rounded-full bg-slate-400 text-white text-[11px] flex items-center justify-center font-semibold shrink-0">
                            {u.displayName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                          </span>
                          <span className="text-sm flex-1">{u.displayName}</span>
                          {assigned && <span className="text-blue-600 text-sm">✓</span>}
                        </div>
                      )
                    })}
                </div>
              </div>
            )}

            {/* ADD CHECKLIST — Copy items from existing card checklists + templates */}
            {activePanel === 'checklist' && (
              <div ref={panelRef} className="absolute bg-white shadow-xl border rounded-xl p-4 mt-3 w-[360px] z-50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">Add checklist</h4>
                  <button type="button" className="text-slate-400 text-sm" onClick={() => setActivePanel(null)}>✕</button>
                </div>
                <label className="text-xs font-medium text-slate-500">Title</label>
                <input
                  placeholder="Checklist"
                  className="border rounded-lg p-2 w-full mb-3 text-sm"
                  value={newChecklistTitle}
                  onChange={e => setNewChecklistTitle(e.target.value)}
                />
                <label className="text-xs font-medium text-slate-500">Copy items from...</label>
                <input
                  placeholder="Search checklists or templates..."
                  className="border rounded-lg p-2 w-full mt-1 mb-2 text-sm"
                  value={checklistCopyQuery}
                  onChange={e => {
                    setChecklistCopyQuery(e.target.value)
                    setSelectedCopySource(null)
                  }}
                />
                {selectedCopySource && (
                  <div className="mb-2 flex items-center justify-between rounded-lg bg-aqua/10 border border-aqua/30 px-2 py-1.5 text-xs">
                    <span className="truncate pr-2">
                      {selectedCopySource.title}
                      <span className="text-slate-500"> · {selectedCopySource.sourceType === 'TEMPLATE' ? 'Template' : 'Checklist'}</span>
                    </span>
                    <button type="button" className="text-slate-500 shrink-0" onClick={() => setSelectedCopySource(null)}>Clear</button>
                  </div>
                )}
                <div className="max-h-48 overflow-y-auto border rounded-lg mb-3">
                  {checklistSourcesLoading && (
                    <div className="p-3 text-xs text-slate-400">Loading…</div>
                  )}
                  {!checklistSourcesLoading && checklistSources.length === 0 && (
                    <div className="p-3 text-xs text-slate-400">No matching checklists</div>
                  )}
                  {!checklistSourcesLoading && checklistSources.map((s: any) => (
                    <button
                      key={`${s.sourceType}-${s.id}`}
                      type="button"
                      onClick={() => {
                        setSelectedCopySource({
                          id: s.id,
                          sourceType: s.sourceType,
                          title: s.title,
                        })
                        if (!newChecklistTitle || newChecklistTitle === 'Checklist') {
                          setNewChecklistTitle(
                            s.sourceType === 'TEMPLATE'
                              ? s.title
                              : (String(s.subtitle || '').split('·')[0] || 'Checklist').trim(),
                          )
                        }
                      }}
                      className={`w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-slate-50 ${
                        selectedCopySource?.id === s.id && selectedCopySource?.sourceType === s.sourceType
                          ? 'bg-blue-50'
                          : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`mt-0.5 shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            s.sourceType === 'TEMPLATE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {s.sourceType === 'TEMPLATE' ? 'Template' : 'Checklist'}
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm text-slate-800 line-clamp-2">{s.title}</div>
                          <div className="text-[11px] text-slate-500">{s.subtitle}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={addChecklist}
                  disabled={addingChecklist || !newChecklistTitle.trim()}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {addingChecklist ? 'Adding…' : 'Add'}
                </button>
              </div>
            )}

            {/* DATES DROPDOWN */}
            {activePanel === 'dates' && (
              <div ref={panelRef} className="absolute bg-white shadow-xl border rounded-xl p-5 mt-3 w-80 z-50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">Dates</h4>
                  <button type="button" className="text-slate-400 text-sm" onClick={() => setActivePanel(null)}>✕</button>
                </div>
                <div className="mb-3">
                  <label className="flex items-center gap-2 text-sm text-slate-700 mb-1">
                    <input
                      type="checkbox"
                      checked={dueDateEnabled}
                      onChange={e => setDueDateEnabled(e.target.checked)}
                      style={{ width: 14, height: 14 }}
                    />
                    Due date
                  </label>
                  <input
                    type="datetime-local"
                    value={dueDate}
                    disabled={!dueDateEnabled}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full border rounded-lg p-2 mt-1 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
                <button
                  onClick={async () => {
                    await api.patch(`/job-boards/cards/${card.id}`, {
                      dueDate: dueDateEnabled && dueDate ? new Date(dueDate).toISOString() : null,
                    })
                    setActivePanel(null)
                    await loadCard()
                  }}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm mb-2"
                >Save</button>
                <button
                  onClick={async () => {
                    await api.patch(`/job-boards/cards/${card.id}`, { dueDate: null })
                    setDueDate('')
                    setDueDateEnabled(false)
                    setActivePanel(null)
                    await loadCard()
                  }}
                  className="w-full bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm"
                >Remove</button>
              </div>
            )}

            {/* LABELS DROPDOWN */}
            {activePanel === 'labels' && (
              <div ref={panelRef} className="absolute bg-white shadow-xl border rounded-xl p-5 mt-3 w-80 z-50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Labels</h4>
                  <button type="button" className="text-slate-400 text-sm" onClick={() => setActivePanel(null)}>✕</button>
                </div>
                <input
                  placeholder="Search labels..."
                  className="border rounded-lg p-2 w-full text-sm"
                  value={labelSearch}
                  onChange={e => setLabelSearch(e.target.value)}
                />
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {card.labels
                    ?.filter((l: any) => l.name?.toLowerCase().includes(labelSearch.toLowerCase()))
                    .map((l: any) => (
                    <div key={l.id} className="flex items-center gap-3 p-1 rounded hover:bg-gray-100">
                      <input
                        type="checkbox"
                        checked
                        onChange={async () => {
                          await api.delete(`/job-boards/cards/${card.id}/labels/${l.id}`)
                          await loadCard()
                        }}
                        style={{ width: 14, height: 14 }}
                      />
                      <div className="flex-1 text-white px-2 py-1 rounded text-sm" style={{ backgroundColor: l.color }}>
                        {l.name}
                      </div>
                    </div>
                  ))}
                  {(!card.labels || card.labels.length === 0) && (
                    <p className="text-xs text-slate-400">No labels on this card yet</p>
                  )}
                </div>
                <div className="text-xs font-medium text-slate-500">Create a new label</div>
                <div className="flex items-center gap-2">
                  <input
                    placeholder="Label name"
                    value={popupLabelName}
                    onChange={e => setPopupLabelName(e.target.value)}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    type="color"
                    value={popupLabelColor}
                    onChange={e => setPopupLabelColor(e.target.value)}
                    className="w-10 h-10 p-0 border rounded cursor-pointer"
                  />
                  <button
                    onClick={async () => {
                      if (!popupLabelName.trim()) return
                      await api.post(`/job-boards/cards/${card.id}/labels`, {
                        name: popupLabelName,
                        color: popupLabelColor,
                      })
                      setPopupLabelName('')
                      setPopupLabelColor('#22c55e')
                      await loadCard()
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 h-10 rounded-lg text-sm"
                  >+</button>
                </div>
              </div>
            )}

            {/* ATTACHMENT DROPDOWN */}
            {activePanel === 'attachment' && (
              <div ref={panelRef} className="absolute bg-white shadow-xl border rounded-xl p-5 mt-3 w-80 z-50 space-y-4">
                <h4 className="font-semibold">Attach File</h4>
                <input
                  type="file"
                  onChange={async (e: any) => {
                    const file = e.target.files[0]
                    if (!file) return
                    const formData = new FormData()
                    formData.append('file', file)
                    await api.post(`/job-boards/cards/${card.id}/attachments`, formData, {
                      headers: { 'Content-Type': 'multipart/form-data' },
                    })
                    setActivePanel(null)
                    await loadCard()
                  }}
                  className="w-full"
                />
                <button onClick={() => setActivePanel(null)} className="text-sm text-gray-500">Cancel</button>
              </div>
            )}
          </div>

          {/* SELECTED MEMBERS */}
          {card.members?.length > 0 && (
            <div className="mt-2">
              <div className="text-sm text-gray-600 mb-2 font-medium">Members</div>
              <div className="flex gap-2 flex-wrap items-center">
                {card.members?.map((m: any) => (
                  <div
                    key={m.id}
                    className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-semibold relative group"
                  >
                    <span>{m.user?.displayName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}</span>
                    <button
                      onClick={async () => {
                        await api.delete(`/job-boards/cards/${card.id}/members/${m.userId}`)
                        await loadCard()
                      }}
                      className="absolute -top-1 -right-1 bg-white text-gray-600 text-[10px] rounded-full w-4 h-4 hidden group-hover:flex items-center justify-center shadow"
                    >✕</button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setActivePanel('members')}
                  className="w-8 h-8 rounded-full border border-dashed border-slate-300 text-slate-400 text-sm hover:bg-slate-50"
                >+</button>
              </div>
            </div>
          )}

          {card.dueDate && (
            <div className="mt-2">
              <div className="text-sm text-gray-600 mb-1 font-medium">Due date</div>
              <button
                type="button"
                onClick={() => setActivePanel('dates')}
                className="inline-flex items-center gap-2 text-sm bg-white border rounded-lg px-3 py-1.5 shadow-sm"
              >
                {new Date(card.dueDate).toLocaleString('en-AU', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
                {new Date(card.dueDate).getTime() < Date.now() + 2 * 86400000 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Due soon</span>
                )}
              </button>
            </div>
          )}

          {/* LABELS */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold">Labels</h4>
            </div>
            <div className="flex gap-2 flex-wrap mb-2 items-center">
              {card.labels?.length === 0 && (
                <span className="text-sm text-gray-400">No labels added</span>
              )}
              {card.labels?.map((l: any) => (
                <div key={l.id} className="px-3 py-1 text-[11px] font-medium text-white rounded" style={{ backgroundColor: l.color }}>
                  <span>{l.name}</span>
                  <button
                    onClick={async () => {
                      await api.delete(`/job-boards/cards/${card.id}/labels/${l.id}`)
                      await loadCard()
                    }}
                    className="text-white text-xs ml-1 hover:opacity-70"
                  >✕</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                placeholder="Label name"
                value={newLabelName}
                onChange={e => setNewLabelName(e.target.value)}
                className="border p-2 text-sm"
              />
              <input type="color" value={newLabelColor} onChange={e => setNewLabelColor(e.target.value)} />
              <button onClick={addLabel} className="btn-primary">+</button>
            </div>
          </div>

          {/*FM PREINSTALL INFO*/}
          {preinstall && (
            <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">

              {/* HEADER ROW */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">FM Preinstall</span>
                  <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded border">
                    {preinstall.preinstallNo}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLOR[preinstall.status] ?? 'bg-slate-100 text-slate-700'}`}>
                    {STATUS_LABEL[preinstall.status] ?? preinstall.status}
                  </span>
                </div>

                <a href={`/fm-preinstall/${preinstall.id}`}
                  className="text-xs text-blue-600 hover:underline shrink-0"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Record →
                </a>
              </div>

              {/* INFO GRID */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs mb-4">
                <InfoRow label="Customer" value={preinstall.customer?.name} />
                <InfoRow label="FM Customer" value={preinstall.fmCustomer?.fmWebNumber} />
                <InfoRow label="Install Type" value={preinstall.type?.replace(/_/g, ' ')} />
                <InfoRow label="Unit Type" value={preinstall.installDetail?.fmUnitType} />
                <InfoRow label="Unit Code" value={preinstall.installDetail?.fmUnitCode} />
                <InfoRow label="Service Code" value={preinstall.installDetail?.serviceCode} />
                <InfoRow label="MIX Code" value={preinstall.installDetail?.mixCode} />
                <InfoRow label="Asset" value={preinstall.installDetail?.assetNumber} />
                <InfoRow label="Fleet" value={preinstall.installDetail?.fleetNumber} />
                <InfoRow label="Rego" value={preinstall.installDetail?.regoNumber} />
                <InfoRow label="VIN" value={preinstall.installDetail?.vinNumber} />
                <InfoRow
                  label="Vehicle"
                  value={[
                    preinstall.installDetail?.vehicleMake,
                    preinstall.installDetail?.vehicleModel,
                    preinstall.installDetail?.yearVariant,
                  ].filter(Boolean).join(' ')}
                />
                <InfoRow label="Location" value={preinstall.installDetail?.installLocation} />
                <InfoRow label="Installer" value={preinstall.installDetail?.installer} />
                <InfoRow
                  label="Install Date"
                  value={
                    preinstall.installDetail?.installDate
                      ? new Date(preinstall.installDetail.installDate).toLocaleDateString('en-AU')
                      : null
                  }
                />
              </div>

              {/* STATUS CHANGE */}
              {(ALLOWED_TRANSITIONS[preinstall.status]?.length ?? 0) > 0 && (
                <div className="border-t pt-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-500 font-medium">Move to:</span>
                    {ALLOWED_TRANSITIONS[preinstall.status].map(next => (
                      <button
                        key={next}
                        disabled={statusChanging}
                        onClick={() => handleStatusChange(next)}
                        className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        {statusChanging ? 'Updating…' : STATUS_LABEL[next]}
                      </button>
                    ))}
                  </div>
                  {statusError && (
                    <p className="text-xs text-red-500 mt-1">{statusError}</p>
                  )}
                </div>
              )}

              {preinstall.status === 'COMPLETED' && (
                <div className="border-t pt-2 text-xs text-emerald-600 font-medium">
                  ✓ This preinstall is completed
                </div>
              )}
            </div>
          )}

          {/* DESCRIPTION */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-sm">Description</h4>
              <button
                type="button"
                onClick={saveCard}
                disabled={saving}
                className="text-xs text-blue-600 hover:underline disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
            <textarea
              rows={6}
              value={description}
              onChange={e => setDescription(e.target.value)}
              onBlur={() => {
                if (description !== (card.description || '')) saveCard()
              }}
              className="w-full bg-gray-50 rounded-md px-3 py-2 text-sm resize-y min-h-[120px] focus:bg-white focus:ring-1 focus:ring-blue-500 leading-relaxed"
              placeholder="Add a more detailed description..."
            />
          </div>

          {/* ATTACHMENTS */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold">Attachments</h4>
              <button
                onClick={() => setActivePanel(activePanel === 'attachment' ? null : 'attachment')}
                className="text-xs text-blue-600 hover:underline"
              >
                + Add
              </button>
            </div>
            {(!card.attachments || card.attachments.length === 0) && (
              <p className="text-sm text-gray-400">No attachments</p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {card.attachments?.map((a: any) => {
                const isImage = /\.(png|jpe?g|gif|webp|bmp)$/i.test(a.fileName || a.fileUrl || '')
                return (
                  <div
                    key={a.id}
                    className="relative group/att border rounded-lg overflow-hidden hover:shadow-md transition"
                  >
                    <button
                      type="button"
                      title="Delete attachment"
                      className="absolute top-1 right-1 z-10 w-6 h-6 rounded-full bg-white/95 text-red-600 text-xs shadow border border-slate-200 opacity-100 sm:opacity-0 sm:group-hover/att:opacity-100 hover:bg-red-50"
                      onClick={async (e) => {
                        e.stopPropagation()
                        if (!confirm(`Delete "${a.fileName}"?`)) return
                        try {
                          await api.delete(`/job-boards/attachments/${a.id}`)
                          showToast({ type: 'success', title: 'Attachment deleted' })
                          await loadCard()
                        } catch {
                          showToast({ type: 'error', title: 'Failed to delete attachment' })
                        }
                      }}
                    >
                      ✕
                    </button>
                    {isImage ? (
                      <AuthenticatedPhoto
                        src={a.fileUrl}
                        alt={a.fileName}
                        className="h-24 w-full object-cover"
                      />
                    ) : (
                      <div className="h-24 flex items-center justify-center bg-slate-50 text-xs text-slate-500 px-2 text-center">
                        {a.fileName}
                      </div>
                    )}
                    <div className="px-2 py-1 flex items-center justify-between gap-1">
                      <span className="text-[11px] truncate text-slate-600">{a.fileName}</span>
                      <button
                        type="button"
                        className="text-[11px] text-red-600 hover:underline shrink-0"
                        onClick={async () => {
                          if (!confirm(`Delete "${a.fileName}"?`)) return
                          try {
                            await api.delete(`/job-boards/attachments/${a.id}`)
                            showToast({ type: 'success', title: 'Attachment deleted' })
                            await loadCard()
                          } catch {
                            showToast({ type: 'error', title: 'Failed to delete attachment' })
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* CHECKLISTS */}
          <h2 className="text-lg font-semibold mt-4 mb-3">Checklist</h2>

          {card.checklists?.length === 0 && (
            <div className="text-sm text-gray-400 bg-white p-4 rounded-lg shadow-sm">
              No checklist added
            </div>
          )}

          {card.checklists?.map((cl: any) => {
            const total = cl.items.length
            const done = cl.items.filter((i: any) => i.isCompleted).length
            const percent = total === 0 ? 0 : Math.round((done / total) * 100)
            return (
              <div key={cl.id} className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex justify-between items-center mb-2 gap-2">
                  <h4 className="font-semibold flex-1">{cl.title}</h4>
                  <span className="text-sm text-gray-500 shrink-0">{percent}%</span>
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:underline shrink-0"
                    onClick={async () => {
                      if (!confirm(`Delete checklist "${cl.title}"?`)) return
                      try {
                        await api.delete(`/job-boards/checklists/${cl.id}`)
                        showToast({ type: 'success', title: 'Checklist deleted' })
                        await loadCard()
                      } catch {
                        showToast({ type: 'error', title: 'Failed to delete checklist' })
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
                <div className="h-2 bg-gray-200 rounded mb-3">
                  <div className="h-2 bg-blue-600 rounded transition-all" style={{ width: `${percent}%` }} />
                </div>
                <div className="space-y-3">
                  {cl.items.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-3 group/item">
                      <input
                        type="checkbox"
                        checked={item.isCompleted}
                        onChange={() => toggleItem(item)}
                        style={{ width: 14, height: 14 }}
                      />
                      <span className={`text-sm flex-1 ${item.isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                        {item.content}
                      </span>
                      <button
                        type="button"
                        className="text-[11px] text-slate-400 hover:text-red-500 opacity-0 group-hover/item:opacity-100"
                        onClick={async () => {
                          await api.delete(`/job-boards/checklist-items/${item.id}`)
                          await loadCard()
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  {addingItemChecklistId === cl.id ? (
                    <div className="flex gap-2">
                      <input
                        value={newItemText}
                        onChange={e => setNewItemText(e.target.value)}
                        placeholder="Enter item name"
                        className="border p-2 rounded w-full text-sm"
                        autoFocus
                        onKeyDown={async (e) => {
                          if (e.key !== 'Enter' || !newItemText.trim()) return
                          await api.post(`/job-boards/checklists/${cl.id}/items`, { content: newItemText.trim() })
                          setNewItemText('')
                          setAddingItemChecklistId(null)
                          await loadCard()
                        }}
                      />
                      <button
                        onClick={async () => {
                          if (!newItemText.trim()) return
                          await api.post(`/job-boards/checklists/${cl.id}/items`, { content: newItemText.trim() })
                          setNewItemText('')
                          setAddingItemChecklistId(null)
                          await loadCard()
                        }}
                        className="bg-blue-600 text-white px-3 rounded text-sm"
                      >Add</button>
                      <button
                        onClick={() => { setNewItemText(''); setAddingItemChecklistId(null) }}
                        className="text-gray-500 text-sm"
                      >Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingItemChecklistId(cl.id)}
                      className="bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded text-sm"
                    >Add an item</button>
                  )}
                </div>
              </div>
            )
          })}

          <p className="text-xs text-slate-500">
            Checklist ticks and items save automatically. Use Save for title, description, and due date.
          </p>
          <button
            type="button"
            onClick={saveCard}
            disabled={saving}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        {/*RIGHT SIDE COMMENTS*/}
        <div className="w-80 bg-white border rounded-xl shadow-sm p-4 flex flex-col h-full">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Comments and Activity</h3>
            <button
              type="button"
              className="text-xs text-blue-600 hover:underline"
              onClick={() => setShowActivityDetails(v => !v)}
            >
              {showActivityDetails ? 'Hide details' : 'Show details'}
            </button>
          </div>
          <textarea
            placeholder="Write a comment..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            className="w-full border p-2 mb-2 text-sm rounded"
            rows={3}
          />
          <button onClick={addComment} className="btn-primary w-full mb-4">Comment</button>

          <div className="space-y-4 overflow-y-auto pr-2 flex-1 text-sm">
            {(() => {
              const activities = card.activities || []
              const comments = activities.filter((a: any) => a.type === 'COMMENT')
              const topLevel = comments.filter((a: any) => !a.parentId)
              const repliesByParent: Record<string, any[]> = {}
              for (const c of comments) {
                if (!c.parentId) continue
                if (!repliesByParent[c.parentId]) repliesByParent[c.parentId] = []
                repliesByParent[c.parentId].push(c)
              }
              const otherActivity = showActivityDetails
                ? activities.filter((a: any) => a.type !== 'COMMENT')
                : []

              const renderComment = (a: any, isReply = false) => (
                <div key={a.id} className={`flex gap-3 items-start group ${isReply ? 'ml-2 mt-2' : ''}`}>
                  <div className="w-8 h-8 rounded-full bg-gray-400 text-white flex items-center justify-center text-[11px] font-semibold shrink-0">
                    {a.user?.displayName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 leading-tight min-w-0">
                    <div className="text-[13px] flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="font-semibold">{a.user?.displayName}</span>
                      <span className="text-[11px] text-gray-400 whitespace-nowrap">{formatDate(a.createdAt)}</span>
                    </div>
                    {editingCommentId === a.id ? (
                      <div className="mt-1 space-y-1">
                        <textarea
                          className="w-full border rounded px-2 py-1 text-sm resize-none focus:ring-1 focus:ring-blue-500"
                          rows={3}
                          value={editingCommentText}
                          onChange={e => setEditingCommentText(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              await api.patch(`/job-boards/comments/${a.id}`, { message: editingCommentText })
                              setEditingCommentId(null)
                              await loadCard()
                            }}
                            className="bg-blue-600 text-white px-3 py-0.5 rounded text-xs"
                          >Save</button>
                          <button onClick={() => setEditingCommentId(null)} className="text-gray-500 text-xs">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-0.5 bg-gray-50 border rounded px-2 py-1.5 text-gray-800 text-[13px] whitespace-pre-wrap">
                        {a.message}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      {editingCommentId !== a.id && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingToId(a.id)
                              setReplyText('')
                            }}
                            className="text-[11px] text-gray-500 hover:text-blue-600"
                          >Reply</button>
                          <button
                            type="button"
                            onClick={() => { setEditingCommentId(a.id); setEditingCommentText(a.message) }}
                            className="text-[11px] text-gray-400 hover:text-blue-600"
                          >Edit</button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm('Delete this comment?')) {
                                await api.delete(`/job-boards/comments/${a.id}`)
                                await loadCard()
                              }
                            }}
                            className="text-[11px] text-gray-400 hover:text-red-500"
                          >Delete</button>
                        </>
                      )}
                    </div>

                    {replyingToId === a.id && (
                      <div className="mt-2 space-y-1">
                        <textarea
                          className="w-full border rounded px-2 py-1 text-sm resize-none"
                          rows={2}
                          placeholder="Write a reply..."
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => addReply(a.id)}
                            className="bg-blue-600 text-white px-3 py-0.5 rounded text-xs"
                          >Reply</button>
                          <button
                            type="button"
                            onClick={() => { setReplyingToId(null); setReplyText('') }}
                            className="text-gray-500 text-xs"
                          >Cancel</button>
                        </div>
                      </div>
                    )}

                    {(repliesByParent[a.id] || []).map((r: any) => renderComment(r, true))}
                  </div>
                </div>
              )

              return (
                <>
                  {topLevel.map((a: any) => renderComment(a))}
                  {otherActivity.map((a: any) => (
                    <div key={a.id} className="flex gap-3 items-start text-[13px] text-slate-600">
                      <div className="w-8 h-8 rounded-full bg-slate-300 text-white flex items-center justify-center text-[11px] font-semibold shrink-0">
                        {a.user?.displayName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800">{a.user?.displayName}</span>{' '}
                        {a.message}
                        <div className="text-[11px] text-gray-400 mt-0.5">{formatDate(a.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </>
              )
            })()}
          </div>
        </div>

      </div>
    </AdminShell>
  )
}

//Helper component
function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-1 min-w-0">
      <span className="text-slate-400 shrink-0">{label}:</span>
      <span className="text-slate-700 font-medium truncate">{value || '-'}</span>
    </div>
  )
}