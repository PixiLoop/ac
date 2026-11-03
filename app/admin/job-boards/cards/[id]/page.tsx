'use client'

import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useRouter } from 'next/navigation'
import {
  Archive,
  ArrowRight,
  Calendar,
  CheckSquare,
  ChevronDown,
  Copy,
  ExternalLink,
  ImagePlus,
  MoreHorizontal,
  Paperclip,
  Share2,
  Tag,
  UserPlus,
  UserMinus,
  X,
} from 'lucide-react'
import { api } from '../../../../../lib/api-client'
import { fetchAuthenticatedObjectUrl } from '../../../../../lib/authenticated-media'
import { AdminShell } from '../../../../../components/layout/AdminShell'
import { Button } from '../../../../../components/ui/button'
import { AuthenticatedPhoto } from '../../../../../components/job-boards/operations/shared/AuthenticatedPhoto'
import { useToast } from '../../../../../components/ui/toast'
import { useAuth } from '../../../../../providers/auth-provider'

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
  const { user } = useAuth()

  const [card, setCard] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingCard, setLoadingCard] = useState(true)
  const [users, setUsers] = useState<any[]>([])

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [editingDescription, setEditingDescription] = useState(false)
  const [location, setLocation] = useState('')
  const [editingLocation, setEditingLocation] = useState(false)
  const [comment, setComment] = useState('')
  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [showActivityDetails, setShowActivityDetails] = useState(true)
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [attachmentComment, setAttachmentComment] = useState('')
  const [attachmentSubmitting, setAttachmentSubmitting] = useState(false)

  const [addingItemChecklistId, setAddingItemChecklistId] = useState<string | null>(null)
  const [newItemText, setNewItemText] = useState('')

  const [activePanel, setActivePanel] = useState<
    'members' | 'checklist' | 'dates' | 'attachment' | 'labels' | 'cover' | 'actions' | 'move' | 'copy' | null
  >(null)
  const coverInputRef = useRef<HTMLInputElement | null>(null)
  const coverBtnRef = useRef<HTMLButtonElement | null>(null)
  const [coverMenuPos, setCoverMenuPos] = useState<{ top: number; right: number } | null>(null)
  const [coverRevision, setCoverRevision] = useState(0)
  const [coverSize, setCoverSize] = useState<'normal' | 'full'>('normal')
  const [coverUploading, setCoverUploading] = useState(false)
  const COVER_COLORS = [
    '#22c55e',
    '#eab308',
    '#f97316',
    '#ef4444',
    '#a855f7',
    '#3b82f6',
    '#38bdf8',
    '#14b8a6',
    '#ec4899',
    '#94a3b8',
  ]
  const [boards, setBoards] = useState<any[]>([])
  const [moveBoardId, setMoveBoardId] = useState('')
  const [moveListId, setMoveListId] = useState('')
  const [movePosition, setMovePosition] = useState(1)
  const [moveBusy, setMoveBusy] = useState(false)
  const [boardDetail, setBoardDetail] = useState<any>(null)

  const titleRef = useRef<HTMLInputElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const actionsBtnRef = useRef<HTMLButtonElement | null>(null)
  const [actionsMenuPos, setActionsMenuPos] = useState<{ top: number; right: number } | null>(null)

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
  const [labelSuggestOpen, setLabelSuggestOpen] = useState(false)
  const [dueDate, setDueDate] = useState('')
  const [dueDateEnabled, setDueDateEnabled] = useState(true)
  const [recurring, setRecurring] = useState('never')
  const [dueReminder, setDueReminder] = useState('1_day')
  const [search, setSearch] = useState('')
  const [labelSearch, setLabelSearch] = useState('')
  const [allLabels, setAllLabels] = useState<{ id: string; name: string; color: string }[]>([])
  const [labelsLoading, setLabelsLoading] = useState(false)
  const [attachmentMenuId, setAttachmentMenuId] = useState<string | null>(null)
  const [replacingAttachmentId, setReplacingAttachmentId] = useState<string | null>(null)
  const [pendingCommentAttachmentIds, setPendingCommentAttachmentIds] = useState<string[]>([])
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null)
  const replaceAttachmentInputRef = useRef<HTMLInputElement | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentText, setEditingCommentText] = useState('')
  const [imagePreview, setImagePreview] = useState<{ src: string; alt: string } | null>(null)

  //FMPreinstall state
  const [preinstall, setPreinstall] = useState<any>(null)
  const [statusChanging, setStatusChanging] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)

  const toLocalInput = (utcString: string): string => {
    const d = new Date(utcString)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const shippingAddressFromPreinstall = (pre: any) => {
    if (!pre) return ''
    // Packed as address2||city||state||postcode
    const packed = String(pre.shippingAddress2 || '')
    const parts = packed.includes('||')
      ? packed.split('||')
      : packed.includes('|')
        ? packed.split('|')
        : [packed, '', '', '']
    const shipAddr2 = String(parts[0] || '').trim()
    const shipCity = String(parts[1] || pre.shippingCity || '').trim()
    const shipState = String(parts[2] || pre.shippingState || '').trim()
    const shipPost = String(pre.shippingAddress3 || parts[3] || pre.shippingPostcode || '').trim()
    const line = [
      pre.shippingAddress1,
      // skip packed addr2 if it only held city/state (empty first segment common)
      shipAddr2 && !shipAddr2.includes('||') ? shipAddr2 : '',
      shipCity,
      shipState,
      shipPost,
      'Australia',
    ]
      .map((v: any) => String(v || '').trim())
      .filter(Boolean)
      .join(', ')
    if (pre.shippingAddress1 || shipCity || shipPost) return line
    return ''
  }

  const shippingAddressFromJobBookEntry = (entry: any) => {
    if (!entry) return ''
    const line = [
      entry.shippingAddress1,
      entry.shippingAddress2,
      entry.shippingAddress3,
      'Australia',
    ]
      .map((v: any) => String(v || '').trim())
      .filter(Boolean)
      .join(', ')
    if (entry.shippingAddress1 || entry.shippingAddress2 || entry.shippingAddress3) return line
    return ''
  }

  const resolveLocationFromSources = (cardData: any, pre: any, jbe?: any) => {
    // Prefer FM Preinstall shipping, then Job Book Entry shipping, then card.location
    const shipping = shippingAddressFromPreinstall(pre)
    if (shipping) return shipping

    const jbeShip = shippingAddressFromJobBookEntry(jbe)
    if (jbeShip) return jbeShip

    const fromCard = String(cardData?.location || '').trim()
    if (fromCard) return fromCard

    const fromInstall = String(
      pre?.installDetail?.installLocation || pre?.installLocation || '',
    ).trim()
    if (fromInstall && fromInstall !== '-') return fromInstall

    const depotName = String(pre?.Depots?.name || pre?.depot?.name || '').trim()
    if (depotName) return depotName

    const custAddr = pre?.customer?.addresses?.[0]
    const customerLine = [
      custAddr?.address1,
      custAddr?.address2,
      custAddr?.city,
      custAddr?.state,
      custAddr?.postcode,
    ]
      .map((v: any) => String(v || '').trim())
      .filter(Boolean)
      .join(', ')
    if (customerLine) return customerLine

    const desc = String(cardData?.description || '')
    const match = desc.match(/Location:\s*(.+)/i)
    if (match?.[1]) {
      const line = match[1].split('\n')[0].trim()
      if (line && line !== '-') return line
    }
    return ''
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
    setLocation((prev) => {
      const fromCard = String(data.location || '').trim()
      if (fromCard) return fromCard
      if (prev.trim()) return prev
      return resolveLocationFromSources(data, null)
    })
    setDueDate(data.dueDate ? toLocalInput(data.dueDate) : '')
    setDueDateEnabled(!!data.dueDate)
    setRecurring(String(data.recurring || 'never'))
    setDueReminder(String(data.dueReminder || '1_day'))
    return data
  }

  const applyPreinstallLocation = (data: any, cardData?: any) => {
    if (!data?.id) return
    setPreinstall(data)
    const shipping = shippingAddressFromPreinstall(data)
    const resolved = shipping || resolveLocationFromSources(cardData || card, data)
    if (resolved) setLocation(resolved)
  }

  //Load linked FMPreinstall
  const loadPreinstall = async (cardId: string, cardData?: any) => {
    try {
      const res = await api.get(`/fm-preinstall/by-card/${cardId}`)
      let data = res.data?.data ?? res.data
      if (!data?.id) data = null

      // Client fallback: Preinstall ID in card description
      if (!data?.id) {
        const desc = String(cardData?.description || card?.description || '')
        const idMatch = desc.match(/Preinstall ID:\s*([a-z0-9]+)/i)
        if (idMatch?.[1]) {
          try {
            const byId = await api.get(`/fm-preinstall/${idMatch[1]}`)
            data = byId.data?.data ?? byId.data
          } catch {
            /* ignore */
          }
        }
      }

      if (data?.id) {
        applyPreinstallLocation(data, cardData)
      } else {
        setPreinstall(null)
        await loadJobBookEntryLocation(cardData)
      }
    } catch {
      // Still try description fallback if by-card errors
      try {
        const desc = String(cardData?.description || card?.description || '')
        const idMatch = desc.match(/Preinstall ID:\s*([a-z0-9]+)/i)
        if (idMatch?.[1]) {
          const byId = await api.get(`/fm-preinstall/${idMatch[1]}`)
          const data = byId.data?.data ?? byId.data
          if (data?.id) {
            applyPreinstallLocation(data, cardData)
            return
          }
        }
      } catch {
        /* ignore */
      }
      setPreinstall(null)
      await loadJobBookEntryLocation(cardData)
    }
  }

  const loadJobBookEntryLocation = async (cardData?: any) => {
    const src = cardData || card
    if (!src?.sourceRefId) return
    if (String(src.sourceType || '') !== 'JOB_BOOK_ENTRY') return
    try {
      const res = await api.get(`/job-book-entries/${src.sourceRefId}`)
      const entry = res.data?.data ?? res.data
      const shipping = shippingAddressFromJobBookEntry(entry)
      if (shipping) setLocation(shipping)
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (!preinstall) return
    const shipping = shippingAddressFromPreinstall(preinstall)
    if (shipping) {
      setLocation(shipping)
      return
    }
    const resolved = resolveLocationFromSources(card, preinstall)
    if (!resolved) return
    setLocation((prev) => (prev.trim() ? prev : resolved))
  }, [
    preinstall?.id,
    preinstall?.shippingAddress1,
    preinstall?.shippingAddress2,
    preinstall?.shippingAddress3,
  ])

  useEffect(() => {
    if (!imagePreview) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setImagePreview(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [imagePreview])

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
      const target = event.target as HTMLElement | null
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        !target?.closest?.('[data-cover-trigger]')
      ) {
        setActivePanel(null)
        setCoverMenuPos(null)
        setActionsMenuPos(null)
      }
      if (attachmentMenuId && !target?.closest?.('[data-att-menu]')) {
        setAttachmentMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [attachmentMenuId])

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
        const cardData = await loadCard()
        await loadPreinstall(params.id as string, cardData)
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
        location,
        dueDate: dueDateEnabled && dueDate ? new Date(dueDate).toISOString() : null,
        recurring: dueDateEnabled ? recurring : null,
        dueReminder: dueDateEnabled ? dueReminder : null,
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

  const loadBoardsForMove = async () => {
    try {
      const res = await api.get('/job-boards')
      const list = res.data?.data ?? res.data
      setBoards(Array.isArray(list) ? list : [])
    } catch {
      setBoards([])
    }
  }

  const openMovePanel = async () => {
    setActionsMenuPos(null)
    setActivePanel('move')
    await loadBoardsForMove()
    const boardId = card?.list?.boardId || card?.list?.board?.id || ''
    setMoveBoardId(boardId)
    setMoveListId(card?.listId || card?.list?.id || '')
    setMovePosition(1)
  }

  const openCopyPanel = async () => {
    setActionsMenuPos(null)
    setActivePanel('copy')
    await loadBoardsForMove()
    const boardId = card?.list?.boardId || card?.list?.board?.id || ''
    setMoveBoardId(boardId)
    setMoveListId(card?.listId || card?.list?.id || '')
  }

  useEffect(() => {
    if (activePanel !== 'actions') setActionsMenuPos(null)
  }, [activePanel])

  useEffect(() => {
    if ((activePanel !== 'move' && activePanel !== 'copy') || !moveBoardId) {
      setBoardDetail(null)
      return
    }
    let cancelled = false
    api
      .get(`/job-boards/${moveBoardId}`)
      .then((res) => {
        if (cancelled) return
        const data = res.data?.data ?? res.data
        setBoardDetail(data)
        const lists = data?.lists || []
        if (!lists.some((l: any) => l.id === moveListId)) {
          setMoveListId(lists[0]?.id || '')
        }
      })
      .catch(() => {
        if (!cancelled) setBoardDetail(null)
      })
    return () => {
      cancelled = true
    }
  }, [activePanel, moveBoardId])

  useEffect(() => {
    if (activePanel !== 'move' || !boardDetail || !moveListId) return
    const list = (boardDetail.lists || []).find((l: any) => l.id === moveListId)
    const cardsInList = (list?.cards || []).filter((c: any) => c.id !== card?.id)
    const maxPos = cardsInList.length + 1
    setMovePosition((p) => Math.min(Math.max(p, 1), maxPos))
  }, [activePanel, boardDetail, moveListId, card?.id])

  const submitMoveCard = async () => {
    if (!card?.id || !moveListId || moveBusy) return
    setMoveBusy(true)
    try {
      await api.post(`/job-boards/cards/${card.id}/move`, {
        listId: moveListId,
        position: movePosition,
      })
      await loadCard()
      setActivePanel(null)
      showToast({ type: 'success', title: 'Card moved' })
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to move card'
      showToast({ type: 'error', title: typeof msg === 'string' ? msg : 'Failed to move card' })
    } finally {
      setMoveBusy(false)
    }
  }

  const submitCopyCard = async () => {
    if (!card?.id || !moveListId || moveBusy) return
    setMoveBusy(true)
    try {
      const res = await api.post(`/job-boards/cards/${card.id}/copy`, {
        listId: moveListId,
      })
      const created = res.data?.data ?? res.data
      setActivePanel(null)
      showToast({ type: 'success', title: 'Card copied' })
      if (created?.id) router.push(`/admin/job-boards/cards/${created.id}`)
      else await loadCard()
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to copy card'
      showToast({ type: 'error', title: typeof msg === 'string' ? msg : 'Failed to copy card' })
    } finally {
      setMoveBusy(false)
    }
  }

  const archiveCard = async () => {
    if (!card?.id || moveBusy) return
    if (!window.confirm('Archive this card? It will be removed from the board.')) return
    setMoveBusy(true)
    try {
      await api.delete(`/job-boards/cards/${card.id}`)
      showToast({ type: 'success', title: 'Card archived' })
      const boardId = card?.list?.boardId || card?.list?.board?.id
      router.push(boardId ? `/admin/job-boards/${boardId}` : '/admin/job-boards')
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to archive'
      showToast({ type: 'error', title: typeof msg === 'string' ? msg : 'Failed to archive' })
    } finally {
      setMoveBusy(false)
    }
  }

  const cardShareUrl = () => {
    if (typeof window === 'undefined' || !card?.id) return ''
    return `${window.location.origin}/admin/job-boards/cards/${card.id}`
  }

  const shareCard = async () => {
    const url = cardShareUrl()
    if (!url) return
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: title || card?.title || 'Job card',
          text: title || card?.title || 'Job card',
          url,
        })
        setActivePanel(null)
        return
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return
    }
    try {
      await navigator.clipboard.writeText(url)
      showToast({ type: 'success', title: 'Link copied', message: 'Card link copied to clipboard' })
      setActivePanel(null)
    } catch {
      showToast({ type: 'error', title: 'Could not copy link' })
    }
  }

  const joinOrLeaveCard = async () => {
    if (!card?.id || !user?.id) return
    const assigned = (card.members || []).some((m: any) => m.userId === user.id)
    try {
      if (assigned) {
        await api.delete(`/job-boards/cards/${card.id}/members/${user.id}`)
        showToast({ type: 'success', title: 'Left card' })
      } else {
        await api.post(`/job-boards/cards/${card.id}/members/${user.id}`)
        showToast({ type: 'success', title: 'Joined card' })
      }
      setActivePanel(null)
      await loadCard()
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to update membership'
      showToast({ type: 'error', title: typeof msg === 'string' ? msg : 'Failed to update membership' })
    }
  }

  const loadChecklistSources = async (q: string) => {
    setChecklistSourcesLoading(true)
    try {
      const res = await api.get('/job-boards/checklists/search', {
        params: { q: q || undefined },
      })
      let data = res.data?.data ?? res.data
      if (!Array.isArray(data)) data = []

      if (data.length === 0 || !data.some((r: any) => r.sourceType === 'TEMPLATE')) {
        try {
          const tRes = await api.get('/templates', { params: { search: q || undefined } })
          const raw = tRes.data?.data ?? tRes.data
          const list = Array.isArray(raw) ? raw : raw?.data || []
          const fromTemplates = (list || [])
            .map((t: any) => {
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
            .filter((t: any) => t.itemCount > 0)
          const existingKeys = new Set(
            data.map((r: any) => `${r.sourceType}:${r.id}`),
          )
          data = [
            ...fromTemplates.filter((t: any) => !existingKeys.has(`TEMPLATE:${t.id}`)),
            ...data,
          ]
        } catch {
          /* templates module may be permission-gated */
        }
      }

      const seen = new Set<string>()
      const unique = data.filter((r: any) => {
        const key = `${r.sourceType}:${r.id}`
        if (!r?.id || seen.has(key)) return false
        if (r.sourceType === 'CARD' && Number(r.itemCount ?? 0) === 0) return false
        seen.add(key)
        return true
      })

      setChecklistSources(unique)
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

  useEffect(() => {
    if (activePanel === 'labels' || card?.id) {
      void loadAllLabels()
    }
  }, [activePanel, card?.id])

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

  const loadAllLabels = async () => {
    setLabelsLoading(true)
    try {
      const res = await api.get('/job-boards/labels')
      const rows = res.data?.data ?? res.data ?? []
      setAllLabels(Array.isArray(rows) ? rows : [])
    } catch {
      setAllLabels([])
    } finally {
      setLabelsLoading(false)
    }
  }

  const cardHasLabel = (name: string) =>
    (card?.labels || []).some(
      (l: any) => String(l.name || '').toLowerCase() === String(name || '').toLowerCase(),
    )

  const toggleLibraryLabel = async (label: { name: string; color: string }) => {
    if (!card?.id) return
    const existing = (card.labels || []).find(
      (l: any) => String(l.name || '').toLowerCase() === String(label.name || '').toLowerCase(),
    )
    if (existing) {
      await api.delete(`/job-boards/cards/${card.id}/labels/${existing.id}`)
    } else {
      await api.post(`/job-boards/cards/${card.id}/labels`, {
        name: label.name,
        color: label.color,
      })
    }
    await loadCard()
    await loadAllLabels()
  }

  const applyLabelToCard = async (name: string, color: string) => {
    if (!card?.id || !name.trim()) return
    try {
      await api.post(`/job-boards/cards/${card.id}/labels`, {
        name: name.trim(),
        color: color || '#22c55e',
      })
      setNewLabelName('')
      setLabelSuggestOpen(false)
      await loadCard()
      await loadAllLabels()
      showToast({ type: 'success', title: 'Label added', replace: true })
    } catch (err: any) {
      showToast({
        type: 'error',
        title: err?.response?.data?.message || 'Failed to create label',
        replace: true,
      })
    }
  }

  const addLabel = async () => {
    const typed = newLabelName.trim()
    if (!typed) return
    const existing = allLabels.find(
      (l) => l.name.toLowerCase() === typed.toLowerCase(),
    )
    await applyLabelToCard(typed, existing?.color || newLabelColor)
  }

  const labelSuggestions = allLabels.filter((l) => {
    if (cardHasLabel(l.name)) return false
    const q = newLabelName.trim().toLowerCase()
    if (!q) return true
    return l.name.toLowerCase().includes(q)
  })

  const addComment = async () => {
    const text = comment.trim()
    const markers = pendingCommentAttachmentIds.map((id) => `[[attachment:${id}]]`)
    if (!text && markers.length === 0) return
    const message = [text, ...markers].filter(Boolean).join('\n')
    await api.post(`/job-boards/cards/${card.id}/comments`, { message })
    setComment('')
    setPendingCommentAttachmentIds([])
    await loadCard()
  }

  const submitAttachment = async () => {
    if (!card?.id || attachmentSubmitting) return
    if (!attachmentFile && !attachmentComment.trim()) {
      showToast({ type: 'error', title: 'Choose a file or add a comment', replace: true })
      return
    }
    setAttachmentSubmitting(true)
    try {
      let uploaded: any = null
      if (attachmentFile) {
        const formData = new FormData()
        formData.append('file', attachmentFile)
        const res = await api.post(`/job-boards/cards/${card.id}/attachments`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        uploaded = res.data?.data ?? res.data
      }

      const note = attachmentComment.trim()
      if (note || uploaded?.id) {
        const parts = [
          note || (uploaded ? `Attached ${uploaded.fileName || attachmentFile?.name || 'file'}` : ''),
          uploaded?.id ? `[[attachment:${uploaded.id}]]` : '',
        ].filter(Boolean)
        await api.post(`/job-boards/cards/${card.id}/comments`, {
          message: parts.join('\n'),
        })
      }

      setAttachmentFile(null)
      setAttachmentComment('')
      setActivePanel(null)
      showToast({ type: 'success', title: 'Attachment saved', replace: true })
      await loadCard()
    } catch (err: any) {
      showToast({
        type: 'error',
        title: err?.response?.data?.message || 'Failed to attach',
        replace: true,
      })
    } finally {
      setAttachmentSubmitting(false)
    }
  }

  const isImageFileName = (name?: string | null) =>
    /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(String(name || ''))

  const isColorCover = (url?: string | null) =>
    !!url && /^color:#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(url).trim())

  const coverColorValue = isColorCover(card?.coverImageUrl)
    ? String(card.coverImageUrl).replace(/^color:/i, '')
    : null

  const coverImageSrc =
    card?.coverImageUrl && !isColorCover(card.coverImageUrl)
      ? `${card.coverImageUrl}${card.coverImageUrl.includes('?') ? '&' : '?'}v=${coverRevision || card.updatedAt || ''}`
      : null

  const imageAttachments = (card?.attachments || []).filter((a: any) =>
    isImageFileName(a.fileName) || isImageFileName(a.fileUrl),
  )

  const openCoverPanel = (anchorEl?: HTMLElement | null) => {
    if (activePanel === 'cover') {
      setActivePanel(null)
      setCoverMenuPos(null)
      return
    }
    const el = anchorEl || coverBtnRef.current
    const rect = el?.getBoundingClientRect()
    if (rect) {
      setCoverMenuPos({
        top: rect.bottom + 8,
        right: Math.max(8, window.innerWidth - rect.right),
      })
    } else {
      setCoverMenuPos({ top: 120, right: 24 })
    }
    setActivePanel('cover')
  }

  const removeCover = async () => {
    if (!card?.id) return
    try {
      await api.patch(`/job-boards/cards/${card.id}`, { coverImageUrl: null })
      setCoverRevision((n) => n + 1)
      await loadCard()
      showToast({ type: 'success', title: 'Cover removed', replace: true })
    } catch {
      showToast({ type: 'error', title: 'Failed to remove cover', replace: true })
    }
  }

  const setColorCover = async (hex: string) => {
    if (!card?.id) return
    try {
      await api.patch(`/job-boards/cards/${card.id}`, {
        coverImageUrl: `color:${hex}`,
      })
      setCoverRevision((n) => n + 1)
      await loadCard()
      showToast({ type: 'success', title: 'Cover updated', replace: true })
    } catch {
      showToast({ type: 'error', title: 'Failed to set cover color', replace: true })
    }
  }

  const setAttachmentAsCover = async (attachmentId: string) => {
    try {
      await api.post(`/job-boards/attachments/${attachmentId}/cover`)
      setCoverRevision((n) => n + 1)
      await loadCard()
      showToast({ type: 'success', title: 'Cover updated', replace: true })
    } catch {
      showToast({ type: 'error', title: 'Could not set cover', replace: true })
    }
  }

  const uploadCoverFile = async (file: File) => {
    if (!card?.id) return
    setCoverUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await api.post(`/job-boards/cards/${card.id}/cover`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setCoverRevision((n) => n + 1)
      await loadCard()
      showToast({ type: 'success', title: 'Cover updated', replace: true })
    } catch {
      showToast({ type: 'error', title: 'Failed to upload cover', replace: true })
    } finally {
      setCoverUploading(false)
    }
  }

  const parseCommentAttachments = (message: string) => {
    const ids = Array.from(String(message || '').matchAll(/\[\[attachment:([^\]]+)\]\]/g)).map(
      (m) => m[1],
    )
    const legacyNames = Array.from(
      String(message || '').matchAll(/\(Attachment:\s*([^)]+)\)/gi),
    ).map((m) => m[1].trim())
    const text = String(message || '')
      .replace(/\[\[attachment:[^\]]+\]\]/g, '')
      .replace(/\(Attachment:\s*[^)]+\)/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    const attachments = card?.attachments || []
    const matched: any[] = []
    for (const id of ids) {
      const att = attachments.find((a: any) => a.id === id)
      if (att && !matched.some((m) => m.id === att.id)) matched.push(att)
    }
    for (const name of legacyNames) {
      const att = attachments.find(
        (a: any) => String(a.fileName || '').toLowerCase() === name.toLowerCase(),
      )
      if (att && !matched.some((m) => m.id === att.id)) matched.push(att)
    }
    return { text, attachments: matched }
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
      <div className="w-full max-w-none flex gap-4 lg:gap-6 py-4 h-[calc(100vh-160px)] overflow-hidden bg-gray-50 rounded-xl px-3 sm:px-4">

        {/*LEFT*/}
        <div className="flex-1 min-w-0 space-y-3 overflow-y-auto pr-2">

          {/* TOP BAR — Trello-style list + small circular icons */}
          <div
            className="group/cover rounded-lg shadow-sm relative overflow-hidden"
            style={{
              backgroundColor: coverColorValue || '#334155',
            }}
          >
            <div className="overflow-hidden rounded-lg">
              {coverImageSrc ? (
                <AuthenticatedPhoto
                  key={coverImageSrc}
                  src={coverImageSrc}
                  alt="Card cover"
                  className={`w-full object-cover ${coverSize === 'full' ? 'h-56' : 'h-36'}`}
                  openOnClick={false}
                  onOpen={(objectUrl) =>
                    setImagePreview({ src: objectUrl, alt: 'Card cover' })
                  }
                />
              ) : coverColorValue ? (
                <div className={`${coverSize === 'full' ? 'h-40' : 'h-24'} w-full`} />
              ) : (
                <div className="h-14 w-full bg-slate-700" />
              )}
            </div>

            {!!card.coverImageUrl && (
              <div className="absolute bottom-2 right-2 z-20 flex items-center gap-2 opacity-0 group-hover/cover:opacity-100 transition-opacity">
                <button
                  type="button"
                  data-cover-trigger
                  onClick={(e) => openCoverPanel(e.currentTarget)}
                  className="rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow hover:bg-slate-50"
                >
                  Change cover
                </button>
                <button
                  type="button"
                  onClick={() => void removeCover()}
                  className="rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow hover:bg-slate-50"
                >
                  Remove cover
                </button>
              </div>
            )}

            <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 px-2.5 py-2">
              <button
                type="button"
                onClick={() => { void openMovePanel() }}
                className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                title="Change list"
              >
                <span className="max-w-[10rem] truncate">{card.list?.name || 'List'}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  ref={coverBtnRef}
                  type="button"
                  data-cover-trigger
                  onClick={(e) => openCoverPanel(e.currentTarget)}
                  className={`h-7 w-7 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-700 hover:bg-slate-50 ${
                    activePanel === 'cover' ? 'ring-2 ring-blue-400' : ''
                  }`}
                  title={card.coverImageUrl ? 'Change cover' : 'Add cover'}
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                </button>
                <button
                  ref={actionsBtnRef}
                  type="button"
                  onClick={() => {
                    if (activePanel === 'actions') {
                      setActivePanel(null)
                      setActionsMenuPos(null)
                      return
                    }
                    const rect = actionsBtnRef.current?.getBoundingClientRect()
                    if (rect) {
                      setActionsMenuPos({
                        top: rect.bottom + 6,
                        right: Math.max(8, window.innerWidth - rect.right),
                      })
                    }
                    setActivePanel('actions')
                  }}
                  className={`h-7 w-7 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-700 hover:bg-slate-50 ${
                    activePanel === 'actions' ? 'ring-2 ring-blue-400' : ''
                  }`}
                  title="Actions"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    router.push(boardId ? `/admin/job-boards/${boardId}` : '/admin/job-boards')
                  }
                  className="h-7 w-7 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-700 hover:bg-slate-50"
                  title="Close"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {activePanel === 'actions' &&
            actionsMenuPos &&
            typeof document !== 'undefined' &&
            createPortal(
              <div
                ref={panelRef}
                className="fixed z-[300] bg-white shadow-xl border rounded-xl p-2 w-60"
                style={{ top: actionsMenuPos.top, right: actionsMenuPos.right }}
              >
                <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                  <h4 className="font-semibold text-sm">Actions</h4>
                  <button
                    type="button"
                    className="h-6 w-6 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center"
                    onClick={() => {
                      setActivePanel(null)
                      setActionsMenuPos(null)
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {user?.id && (
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 inline-flex items-center gap-2.5"
                    onClick={() => { void joinOrLeaveCard() }}
                  >
                    {(card.members || []).some((m: any) => m.userId === user.id) ? (
                      <UserMinus className="h-4 w-4 text-slate-500" />
                    ) : (
                      <UserPlus className="h-4 w-4 text-slate-500" />
                    )}
                    {(card.members || []).some((m: any) => m.userId === user.id) ? 'Leave' : 'Join'}
                  </button>
                )}
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 inline-flex items-center gap-2.5"
                  onClick={() => { void openMovePanel() }}
                >
                  <ArrowRight className="h-4 w-4 text-slate-500" />
                  Move
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 inline-flex items-center gap-2.5"
                  onClick={() => { void openCopyPanel() }}
                >
                  <Copy className="h-4 w-4 text-slate-500" />
                  Copy
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 inline-flex items-center gap-2.5"
                  onClick={() => { void shareCard() }}
                >
                  <Share2 className="h-4 w-4 text-slate-500" />
                  Share
                </button>
                <div className="border-t my-1" />
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-rose-50 text-rose-700 inline-flex items-center gap-2.5"
                  onClick={() => { void archiveCard() }}
                >
                  <Archive className="h-4 w-4" />
                  Archive
                </button>
              </div>,
              document.body,
            )}

          {/* HEADER */}
          <div className="bg-white p-4 rounded-lg shadow-sm relative">
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
                className="btn inline-flex items-center gap-1.5"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Add
              </button>
              <button
                onClick={() => setActivePanel(activePanel === 'checklist' ? null : 'checklist')}
                className="btn inline-flex items-center gap-1.5"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                Checklist
              </button>
              <button
                onClick={() => {
                  if (activePanel === 'attachment') {
                    setActivePanel(null)
                    return
                  }
                  setAttachmentFile(null)
                  setAttachmentComment('')
                  setActivePanel('attachment')
                }}
                className="btn inline-flex items-center gap-1.5"
              >
                <Paperclip className="h-3.5 w-3.5" />
                Attachment
              </button>
              <button
                data-cover-trigger
                onClick={(e) => openCoverPanel(e.currentTarget)}
                className={`btn inline-flex items-center gap-1.5 ${
                  activePanel === 'cover' ? 'ring-2 ring-blue-400' : ''
                }`}
              >
                <ImagePlus className="h-3.5 w-3.5" />
                Cover
              </button>
              <button
                onClick={() => setActivePanel(activePanel === 'dates' ? null : 'dates')}
                className="btn inline-flex items-center gap-1.5"
              >
                <Calendar className="h-3.5 w-3.5" />
                Dates
              </button>
              <button
                onClick={() => setActivePanel(activePanel === 'labels' ? null : 'labels')}
                className="btn inline-flex items-center gap-1.5"
              >
                <Tag className="h-3.5 w-3.5" />
                Labels
              </button>
              <button
                type="button"
                onClick={() => { void openMovePanel() }}
                className="btn inline-flex items-center gap-1.5"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                Move
              </button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file) return
                  await uploadCoverFile(file)
                }}
              />
            </div>

            {/* COVER PANEL — opens below the cover icon */}
            {activePanel === 'cover' &&
              coverMenuPos &&
              typeof document !== 'undefined' &&
              createPortal(
                <div
                  ref={panelRef}
                  className="fixed z-[300] bg-white shadow-xl border rounded-xl p-4 w-[320px] max-h-[min(80vh,560px)] overflow-y-auto space-y-4"
                  style={{ top: coverMenuPos.top, right: coverMenuPos.right }}
                >
                  <div className="relative flex items-center justify-center">
                    <h4 className="font-semibold text-sm">Cover</h4>
                    <button
                      type="button"
                      className="absolute right-0 top-0 text-slate-400 text-sm hover:text-slate-700"
                      onClick={() => {
                        setActivePanel(null)
                        setCoverMenuPos(null)
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 uppercase mb-2">Size</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCoverSize('normal')}
                        className={`rounded-lg border p-2 ${
                          coverSize === 'normal' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'
                        }`}
                        title="Normal"
                      >
                        <div className="h-8 rounded bg-slate-200 mb-1.5" />
                        <div className="space-y-1">
                          <div className="h-1.5 w-3/4 bg-slate-300 rounded" />
                          <div className="h-1.5 w-1/2 bg-slate-200 rounded" />
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCoverSize('full')}
                        className={`rounded-lg border p-2 ${
                          coverSize === 'full' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'
                        }`}
                        title="Full"
                      >
                        <div className="h-14 rounded bg-slate-300 relative overflow-hidden">
                          <div className="absolute bottom-1.5 left-1.5 right-1.5 space-y-1">
                            <div className="h-1.5 w-3/4 bg-white/80 rounded" />
                            <div className="h-1.5 w-1/2 bg-white/60 rounded" />
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={coverUploading}
                    onClick={() => coverInputRef.current?.click()}
                    className="w-full h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-medium text-slate-800 inline-flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <ImagePlus className="h-4 w-4" />
                    {coverUploading ? 'Uploading…' : 'Upload a cover image'}
                  </button>

                  {card.coverImageUrl && (
                    <button
                      type="button"
                      onClick={() => void removeCover()}
                      className="w-full h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-medium text-slate-700"
                    >
                      Remove cover
                    </button>
                  )}

                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 uppercase mb-2">Colors</div>
                    <div className="grid grid-cols-5 gap-2">
                      {COVER_COLORS.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          title={hex}
                          onClick={() => void setColorCover(hex)}
                          className={`h-8 rounded-md ${
                            coverColorValue?.toLowerCase() === hex.toLowerCase()
                              ? 'ring-2 ring-offset-1 ring-blue-500'
                              : ''
                          }`}
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  </div>

                  {imageAttachments.length > 0 && (
                    <div>
                      <div className="text-[11px] font-semibold text-slate-500 uppercase mb-2">
                        Attachments
                      </div>
                      <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                        {imageAttachments.map((a: any) => {
                          const url = a.fileUrl || `/job-boards/attachments/${a.id}/file`
                          const selected =
                            !!card.coverImageUrl &&
                            !isColorCover(card.coverImageUrl) &&
                            (card.coverImageUrl.includes(a.id) ||
                              String(a.fileUrl || '').includes(
                                String(card.coverImageUrl || '').split('?')[0],
                              ))
                          return (
                            <button
                              key={a.id}
                              type="button"
                              title={`Use ${a.fileName}`}
                              onClick={() => void setAttachmentAsCover(a.id)}
                              className={`rounded-md overflow-hidden border-2 h-16 bg-slate-50 ${
                                selected
                                  ? 'border-blue-500'
                                  : 'border-transparent hover:border-slate-300'
                              }`}
                            >
                              <AuthenticatedPhoto
                                src={url}
                                alt={a.fileName || 'Attachment'}
                                className="w-full h-full object-cover"
                                openOnClick={false}
                              />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>,
                document.body,
              )}

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
                          setNewChecklistTitle(s.title || 'Checklist')
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
                <div className="mb-3">
                  <label className="block text-sm text-slate-700 mb-1">Recurring</label>
                  <select
                    value={recurring}
                    disabled={!dueDateEnabled}
                    onChange={(e) => setRecurring(e.target.value)}
                    className="w-full border rounded-lg p-2 text-sm bg-white disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="never">Never</option>
                    <option value="daily">Daily</option>
                    <option value="weekdays">Weekdays</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Every 2 weeks</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="block text-sm text-slate-700 mb-1">Set due date reminder</label>
                  <select
                    value={dueReminder}
                    disabled={!dueDateEnabled}
                    onChange={(e) => setDueReminder(e.target.value)}
                    className="w-full border rounded-lg p-2 text-sm bg-white disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="none">None</option>
                    <option value="at_due">At time of due date</option>
                    <option value="5_min">5 Minutes before</option>
                    <option value="10_min">10 Minutes before</option>
                    <option value="15_min">15 Minutes before</option>
                    <option value="1_hour">1 Hour before</option>
                    <option value="2_hours">2 Hours before</option>
                    <option value="1_day">1 Day before</option>
                    <option value="2_days">2 Days before</option>
                  </select>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Reminders will be sent to all members and watchers of this card.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      const nextDue =
                        dueDateEnabled && dueDate ? new Date(dueDate).toISOString() : null
                      if (dueDateEnabled && dueDate && Number.isNaN(new Date(dueDate).getTime())) {
                        showToast({ type: 'error', title: 'Invalid due date', replace: true })
                        return
                      }
                      await api.patch(`/job-boards/cards/${card.id}`, {
                        dueDate: nextDue,
                        recurring: dueDateEnabled ? recurring : null,
                        dueReminder: dueDateEnabled ? dueReminder : null,
                      })
                      setCard((prev: any) =>
                        prev
                          ? {
                              ...prev,
                              dueDate: nextDue,
                              recurring: dueDateEnabled ? recurring : null,
                              dueReminder: dueDateEnabled ? dueReminder : null,
                            }
                          : prev,
                      )
                      setDueDateEnabled(!!nextDue)
                      setActivePanel(null)
                      showToast({ type: 'success', title: 'Due date saved', replace: true })
                      await loadCard()
                    } catch (err: any) {
                      showToast({
                        type: 'error',
                        title: err?.response?.data?.message || 'Failed to save due date',
                        replace: true,
                      })
                    }
                  }}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm mb-2"
                >Save</button>
                <button
                  onClick={async () => {
                    try {
                      await api.patch(`/job-boards/cards/${card.id}`, {
                        dueDate: null,
                        recurring: null,
                        dueReminder: null,
                      })
                      setDueDate('')
                      setDueDateEnabled(false)
                      setRecurring('never')
                      setDueReminder('1_day')
                      setCard((prev: any) =>
                        prev ? { ...prev, dueDate: null, recurring: null, dueReminder: null } : prev,
                      )
                      setActivePanel(null)
                      showToast({ type: 'success', title: 'Due date removed', replace: true })
                      await loadCard()
                    } catch (err: any) {
                      showToast({
                        type: 'error',
                        title: err?.response?.data?.message || 'Failed to remove due date',
                        replace: true,
                      })
                    }
                  }}
                  className="w-full bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm"
                >Remove</button>
              </div>
            )}

            {/* LABELS DROPDOWN — search picks from labels used on any board */}
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
                <div className="space-y-1 max-h-52 overflow-y-auto scrollbar-hover-thin">
                  {labelsLoading && (
                    <p className="text-xs text-slate-400 px-1 py-2">Loading labels…</p>
                  )}
                  {!labelsLoading &&
                    allLabels
                      .filter((l) =>
                        l.name?.toLowerCase().includes(labelSearch.toLowerCase()),
                      )
                      .map((l) => {
                        const checked = cardHasLabel(l.name)
                        return (
                          <label
                            key={`${l.id}-${l.name}`}
                            className="flex items-center gap-3 p-1.5 rounded hover:bg-gray-100 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => void toggleLibraryLabel(l)}
                              style={{ width: 14, height: 14 }}
                            />
                            <div
                              className="flex-1 text-white px-2 py-1 rounded text-sm truncate"
                              style={{ backgroundColor: l.color }}
                            >
                              {l.name}
                            </div>
                          </label>
                        )
                      })}
                  {!labelsLoading && allLabels.length === 0 && (
                    <p className="text-xs text-slate-400">No labels yet — create one below</p>
                  )}
                  {!labelsLoading &&
                    allLabels.length > 0 &&
                    allLabels.filter((l) =>
                      l.name?.toLowerCase().includes(labelSearch.toLowerCase()),
                    ).length === 0 && (
                      <p className="text-xs text-slate-400">No matching labels</p>
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
                    type="button"
                    onClick={async () => {
                      if (!popupLabelName.trim()) return
                      try {
                        await api.post(`/job-boards/cards/${card.id}/labels`, {
                          name: popupLabelName.trim(),
                          color: popupLabelColor,
                        })
                        setPopupLabelName('')
                        setPopupLabelColor('#22c55e')
                        await loadCard()
                        await loadAllLabels()
                        showToast({ type: 'success', title: 'Label added', replace: true })
                      } catch (err: any) {
                        showToast({
                          type: 'error',
                          title: err?.response?.data?.message || 'Failed to create label',
                          replace: true,
                        })
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 h-10 rounded-lg text-sm"
                  >+</button>
                </div>
              </div>
            )}

            {/* MOVE / COPY CARD */}
            {(activePanel === 'move' || activePanel === 'copy') && (
              <div ref={panelRef} className="absolute right-4 top-14 bg-white shadow-xl border rounded-xl p-4 w-[360px] z-50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold inline-flex items-center gap-2">
                    {activePanel === 'move' ? (
                      <ArrowRight className="h-4 w-4 text-slate-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-slate-500" />
                    )}
                    {activePanel === 'move' ? 'Move card' : 'Copy card'}
                  </h4>
                  <button
                    type="button"
                    className="h-6 w-6 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center"
                    onClick={() => setActivePanel(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mb-3">Select destination</p>

                <label className="text-xs font-medium text-slate-500">Board</label>
                <select
                  className="border rounded-lg p-2 w-full mb-3 text-sm mt-1"
                  value={moveBoardId}
                  onChange={(e) => setMoveBoardId(e.target.value)}
                >
                  <option value="">Select board</option>
                  {boards.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>

                <div className="grid grid-cols-5 gap-2 mb-3">
                  <div className="col-span-3">
                    <label className="text-xs font-medium text-slate-500">List</label>
                    <select
                      className="border rounded-lg p-2 w-full text-sm mt-1"
                      value={moveListId}
                      onChange={(e) => setMoveListId(e.target.value)}
                    >
                      <option value="">Select list</option>
                      {(boardDetail?.lists || []).map((l: any) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                  {activePanel === 'move' && (
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-slate-500">Position</label>
                      <select
                        className="border rounded-lg p-2 w-full text-sm mt-1"
                        value={movePosition}
                        onChange={(e) => setMovePosition(Number(e.target.value))}
                      >
                        {(() => {
                          const list = (boardDetail?.lists || []).find((l: any) => l.id === moveListId)
                          const count = (list?.cards || []).filter((c: any) => c.id !== card.id).length
                          const max = count + 1
                          return Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))
                        })()}
                      </select>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={moveBusy || !moveListId}
                  onClick={() => {
                    if (activePanel === 'move') void submitMoveCard()
                    else void submitCopyCard()
                  }}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {moveBusy
                    ? (activePanel === 'move' ? 'Moving…' : 'Copying…')
                    : (activePanel === 'move' ? 'Move' : 'Create copy')}
                </button>
              </div>
            )}

            {/* ATTACHMENT DROPDOWN */}
            {activePanel === 'attachment' && (
              <div ref={panelRef} className="absolute bg-white shadow-xl border rounded-xl p-5 mt-3 w-80 z-50 space-y-3">
                <h4 className="font-semibold">Attach File</h4>
                <input
                  type="file"
                  onChange={(e: any) => {
                    setAttachmentFile(e.target.files?.[0] || null)
                  }}
                  className="w-full text-sm"
                />
                <textarea
                  placeholder="Add a comment..."
                  value={attachmentComment}
                  onChange={(e) => setAttachmentComment(e.target.value)}
                  rows={3}
                  className="w-full border rounded-md px-2 py-1.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAttachmentFile(null)
                      setAttachmentComment('')
                      setActivePanel(null)
                    }}
                    className="text-sm text-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => { void submitAttachment() }}
                    disabled={attachmentSubmitting || (!attachmentFile && !attachmentComment.trim())}
                    className="btn-primary px-3 py-1.5 text-sm disabled:opacity-50"
                  >
                    {attachmentSubmitting ? 'Submitting…' : 'Submit'}
                  </button>
                </div>
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
                className="inline-flex items-center gap-2 text-sm bg-white border rounded-lg px-3 py-1.5 shadow-sm flex-wrap"
              >
                {new Date(card.dueDate).toLocaleString('en-AU', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
                {card.recurring && card.recurring !== 'never' && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 capitalize">
                    {String(card.recurring).replace(/_/g, ' ')}
                  </span>
                )}
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
                      await loadAllLabels()
                    }}
                    className="text-white text-xs ml-1 hover:opacity-70"
                  >✕</button>
                </div>
              ))}
            </div>
            <div className="relative flex gap-2 items-start">
              <div className="relative flex-1 min-w-0">
                <input
                  placeholder="Search or create label…"
                  value={newLabelName}
                  onChange={(e) => {
                    setNewLabelName(e.target.value)
                    setLabelSuggestOpen(true)
                  }}
                  onFocus={() => {
                    void loadAllLabels()
                    setLabelSuggestOpen(true)
                  }}
                  onBlur={() => {
                    setTimeout(() => setLabelSuggestOpen(false), 150)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void addLabel()
                    }
                    if (e.key === 'Escape') setLabelSuggestOpen(false)
                  }}
                  className="border p-2 text-sm w-full rounded"
                />
                {labelSuggestOpen && labelSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-30 max-h-40 overflow-y-auto rounded-lg border bg-white shadow-lg p-2 flex flex-wrap gap-1.5">
                    {labelSuggestions.map((l) => (
                      <button
                        key={`${l.id}-${l.name}`}
                        type="button"
                        className="px-3 py-1 text-[11px] font-medium text-white rounded max-w-full truncate"
                        style={{ backgroundColor: l.color }}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setNewLabelColor(l.color)
                          void applyLabelToCard(l.name, l.color)
                        }}
                      >
                        {l.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="color"
                value={newLabelColor}
                onChange={(e) => setNewLabelColor(e.target.value)}
                className="w-10 h-9 shrink-0 border rounded cursor-pointer"
                title="Color for new label"
              />
              <button type="button" onClick={() => void addLabel()} className="btn-primary shrink-0">
                +
              </button>
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
              {editingDescription ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDescription(card.description || '')
                      setEditingDescription(false)
                    }}
                    disabled={saving}
                    className="text-xs text-slate-500 hover:underline disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await saveCard()
                      setEditingDescription(false)
                    }}
                    disabled={saving}
                    className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingDescription(true)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Edit
                </button>
              )}
            </div>
            {editingDescription ? (
              <textarea
                rows={6}
                autoFocus
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-white rounded-md px-3 py-2 text-sm resize-y min-h-[120px] border border-blue-200 ring-1 ring-blue-500 leading-relaxed"
                placeholder="Add a more detailed description..."
              />
            ) : (
              <div className="w-full bg-gray-50 rounded-md px-3 py-2 text-sm min-h-[120px] leading-relaxed whitespace-pre-wrap text-slate-700">
                {description.trim() ? description : (
                  <span className="text-slate-400">No description</span>
                )}
              </div>
            )}
          </div>

          {/* LOCATION */}
          {(() => {
            const shownLocation = (location.trim() || resolveLocationFromSources(card, preinstall)).trim()
            return (
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-sm">Location</h4>
              {editingLocation ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setLocation(resolveLocationFromSources(card, preinstall))
                      setEditingLocation(false)
                    }}
                    disabled={saving}
                    className="text-xs text-slate-500 hover:underline disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await saveCard()
                      setEditingLocation(false)
                    }}
                    disabled={saving}
                    className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!location.trim() && shownLocation) setLocation(shownLocation)
                    setEditingLocation(true)
                  }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Edit
                </button>
              )}
            </div>

            {editingLocation ? (
              <textarea
                rows={3}
                autoFocus
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full bg-white rounded-md px-3 py-2 text-sm resize-y min-h-[72px] border border-blue-200 ring-1 ring-blue-500 leading-relaxed"
                placeholder="Street address or site name..."
              />
            ) : shownLocation ? (
              <div className="space-y-3">
                <div className="w-full overflow-hidden rounded-md border border-slate-200 bg-slate-100 aspect-[16/9] max-h-56">
                  <iframe
                    title="Location map"
                    className="w-full h-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(shownLocation)}&z=15&output=embed`}
                  />
                </div>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{shownLocation}</p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shownLocation)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline shrink-0"
                  >
                    Open in Maps
                  </a>
                </div>
              </div>
            ) : (
              <div className="w-full bg-gray-50 rounded-md px-3 py-2 text-sm min-h-[72px] text-slate-400">
                No location set — add install location / shipping on the FM Preinstall, or click Edit
              </div>
            )}
          </div>
            )
          })()}

          <input
            ref={replaceAttachmentInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              const id = replacingAttachmentId
              e.target.value = ''
              if (!file || !id) {
                setReplacingAttachmentId(null)
                return
              }
              try {
                const formData = new FormData()
                formData.append('file', file)
                await api.post(`/job-boards/attachments/${id}/replace`, formData, {
                  headers: { 'Content-Type': 'multipart/form-data' },
                })
                showToast({ type: 'success', title: 'Image updated' })
                await loadCard()
              } catch {
                showToast({ type: 'error', title: 'Failed to update image' })
              } finally {
                setReplacingAttachmentId(null)
              }
            }}
          />

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
            <div className="space-y-2">
              {card.attachments?.map((a: any) => {
                const isImage = /\.(png|jpe?g|gif|webp|bmp)$/i.test(a.fileName || a.fileUrl || '')
                const addedAt = a.createdAt
                  ? new Date(a.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : ''
                const menuOpen = attachmentMenuId === a.id

                const openAttachment = async () => {
                  try {
                    const blobUrl = await fetchAuthenticatedObjectUrl(a.fileUrl)
                    if (!blobUrl) throw new Error('empty')
                    if (isImage) {
                      setImagePreview({ src: blobUrl, alt: a.fileName || 'Attachment' })
                    } else {
                      window.open(blobUrl, '_blank', 'noopener,noreferrer')
                    }
                  } catch {
                    showToast({ type: 'error', title: 'Could not open attachment' })
                  }
                }

                const downloadAttachment = async () => {
                  try {
                    const blobUrl = await fetchAuthenticatedObjectUrl(a.fileUrl)
                    if (!blobUrl) throw new Error('empty')
                    const link = document.createElement('a')
                    link.href = blobUrl
                    link.download = a.fileName || 'attachment'
                    document.body.appendChild(link)
                    link.click()
                    link.remove()
                    if (blobUrl.startsWith('blob:')) {
                      setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000)
                    }
                  } catch {
                    showToast({ type: 'error', title: 'Download failed' })
                  } finally {
                    setAttachmentMenuId(null)
                  }
                }

                return (
                  <div
                    key={a.id}
                    className="relative flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-50 p-2"
                  >
                    <button
                      type="button"
                      className="h-14 w-16 shrink-0 rounded overflow-hidden border bg-white"
                      onClick={() => void openAttachment()}
                      title="Open"
                    >
                      {isImage ? (
                        <AuthenticatedPhoto
                          src={a.fileUrl}
                          alt={a.fileName}
                          className="h-full w-full object-cover"
                          openOnClick={false}
                          onOpen={(objectUrl) =>
                            setImagePreview({ src: objectUrl, alt: a.fileName || 'Attachment' })
                          }
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-400">
                          <Paperclip className="h-4 w-4" />
                        </div>
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        className="text-sm font-semibold text-slate-800 hover:underline truncate block text-left max-w-full"
                        onClick={() => void openAttachment()}
                      >
                        {a.fileName}
                      </button>
                      {addedAt && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Added {addedAt}
                        </div>
                      )}
                      {replacingAttachmentId === a.id && (
                        <div className="text-[11px] text-blue-600 mt-0.5">Replacing image…</div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        className="h-7 w-7 rounded hover:bg-slate-200 flex items-center justify-center text-slate-600"
                        title="Open"
                        onClick={() => void openAttachment()}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                      <div className="relative" data-att-menu>
                        <button
                          type="button"
                          className="h-7 w-7 rounded hover:bg-slate-200 flex items-center justify-center text-slate-600"
                          title="Attachment options"
                          onClick={(e) => {
                            e.stopPropagation()
                            setAttachmentMenuId(menuOpen ? null : a.id)
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {menuOpen && (
                          <div className="absolute right-0 top-8 z-30 w-44 rounded-lg border bg-white shadow-xl py-1 text-sm">
                            <button
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-slate-50"
                              onClick={() => {
                                setReplacingAttachmentId(a.id)
                                setAttachmentMenuId(null)
                                setTimeout(() => replaceAttachmentInputRef.current?.click(), 0)
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-slate-50"
                              onClick={() => {
                                setPendingCommentAttachmentIds((prev) =>
                                  prev.includes(a.id) ? prev : [...prev, a.id],
                                )
                                setAttachmentMenuId(null)
                                setTimeout(() => commentInputRef.current?.focus(), 50)
                              }}
                            >
                              Comment
                            </button>
                            <button
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-slate-50"
                              onClick={() => void downloadAttachment()}
                            >
                              Download
                            </button>
                            {isImage && (
                              <button
                                type="button"
                                className="w-full text-left px-3 py-2 hover:bg-slate-50"
                                onClick={async () => {
                                  setAttachmentMenuId(null)
                                  await setAttachmentAsCover(a.id)
                                }}
                              >
                                Make cover
                              </button>
                            )}
                            <button
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-rose-50 text-rose-600"
                              onClick={async () => {
                                if (!confirm(`Remove "${a.fileName}"?`)) return
                                try {
                                  await api.delete(`/job-boards/attachments/${a.id}`)
                                  showToast({ type: 'success', title: 'Attachment removed' })
                                  setAttachmentMenuId(null)
                                  await loadCard()
                                } catch {
                                  showToast({ type: 'error', title: 'Failed to remove attachment' })
                                }
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
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
                <div className="space-y-1">
                  {cl.items.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 group/item rounded-md px-2 py-1.5 -mx-1 transition-colors hover:bg-slate-100 has-[:focus]:bg-slate-100 [&:has(button:hover)]:bg-rose-50 [&:has(button:hover)]:ring-1 [&:has(button:hover)]:ring-rose-200"
                    >
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
                        title="Delete item"
                        className="text-[11px] text-slate-400 hover:text-red-600 opacity-0 group-hover/item:opacity-100 px-1.5 py-0.5 rounded hover:bg-rose-100"
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
            Checklist ticks and items save automatically. Use Save for title, description, location, and due date.
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
        <div className="w-[min(100%,36rem)] sm:w-[32rem] xl:w-[38rem] shrink-0 bg-white border rounded-xl shadow-sm p-4 flex flex-col h-full">
          <div className="flex items-center justify-between mb-3 gap-2">
            <h3 className="font-semibold text-sm sm:text-base">Comments and Activity</h3>
            <button
              type="button"
              className="text-xs text-blue-600 hover:underline"
              onClick={() => setShowActivityDetails(v => !v)}
            >
              {showActivityDetails ? 'Hide details' : 'Show details'}
            </button>
          </div>
          {pendingCommentAttachmentIds.length > 0 && (
            <div className="mb-2 space-y-2">
              {pendingCommentAttachmentIds.map((id) => {
                const att = (card.attachments || []).find((x: any) => x.id === id)
                if (!att) return null
                const url = att.fileUrl || `/job-boards/attachments/${att.id}/file`
                return (
                  <div key={id} className="relative rounded-md border border-blue-200 overflow-hidden bg-slate-50">
                    <button
                      type="button"
                      className="absolute top-1 right-1 z-10 h-6 w-6 rounded-full bg-white/95 border text-slate-600 text-xs shadow"
                      title="Remove from comment"
                      onClick={() =>
                        setPendingCommentAttachmentIds((prev) => prev.filter((x) => x !== id))
                      }
                    >
                      ✕
                    </button>
                    {isImageFileName(att.fileName) || isImageFileName(url) ? (
                      <AuthenticatedPhoto
                        src={url}
                        alt={att.fileName || 'Attachment'}
                        className="w-full h-44 object-cover cursor-zoom-in bg-slate-100"
                        openOnClick={false}
                        onOpen={(objectUrl) =>
                          setImagePreview({
                            src: objectUrl,
                            alt: att.fileName || 'Attachment',
                          })
                        }
                      />
                    ) : (
                      <div className="px-3 py-2 text-xs text-slate-600 flex items-center gap-1">
                        <Paperclip className="h-3.5 w-3.5" />
                        {att.fileName || 'Attachment'}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          <textarea
            ref={commentInputRef}
            placeholder="Write a comment..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            className="w-full border p-2 mb-2 text-sm rounded"
            rows={3}
          />
          <button
            onClick={addComment}
            disabled={!comment.trim() && pendingCommentAttachmentIds.length === 0}
            className="btn-primary w-full mb-4 disabled:opacity-50"
          >
            Comment
          </button>

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
                      <span className="font-semibold text-slate-800">{a.user?.displayName}</span>
                      <span className="text-[11px] text-blue-800 whitespace-nowrap">{formatDate(a.createdAt)}</span>
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
                              const markers = (String(a.message || '').match(/\[\[attachment:[^\]]+\]\]/g) || []).join('\n')
                              const next = [editingCommentText.trim(), markers].filter(Boolean).join('\n')
                              await api.patch(`/job-boards/comments/${a.id}`, { message: next })
                              setEditingCommentId(null)
                              await loadCard()
                            }}
                            className="bg-blue-600 text-white px-3 py-0.5 rounded text-xs"
                          >Save</button>
                          <button onClick={() => setEditingCommentId(null)} className="text-gray-500 text-xs">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      (() => {
                        const parsed = parseCommentAttachments(a.message)
                        return (
                          <div className="mt-0.5 bg-blue-50 border border-blue-200 rounded px-2 py-1.5 text-blue-900 text-[13px] space-y-2">
                            {parsed.text ? (
                              <div className="whitespace-pre-wrap">{parsed.text}</div>
                            ) : null}
                            {parsed.attachments.length > 0 && (
                              <div className="flex flex-col gap-2 w-full">
                                {parsed.attachments.map((att: any) => {
                                  const url = att.fileUrl || `/job-boards/attachments/${att.id}/file`
                                  if (isImageFileName(att.fileName) || isImageFileName(url)) {
                                    return (
                                      <div
                                        key={att.id}
                                        className="w-full overflow-hidden rounded-md border border-blue-200/80 bg-slate-100"
                                      >
                                        <AuthenticatedPhoto
                                          src={url}
                                          alt={att.fileName || 'Attachment'}
                                          className="w-full h-44 object-cover cursor-zoom-in"
                                          openOnClick={false}
                                          onOpen={(objectUrl) =>
                                            setImagePreview({
                                              src: objectUrl,
                                              alt: att.fileName || 'Attachment',
                                            })
                                          }
                                        />
                                      </div>
                                    )
                                  }
                                  return (
                                    <button
                                      key={att.id}
                                      type="button"
                                      className="inline-flex items-center gap-1 rounded border border-blue-200 bg-white px-2 py-1 text-xs text-blue-800 hover:underline"
                                      onClick={async () => {
                                        try {
                                          const blobUrl = await fetchAuthenticatedObjectUrl(url)
                                          if (blobUrl) window.open(blobUrl, '_blank', 'noopener,noreferrer')
                                        } catch {
                                          showToast({ type: 'error', title: 'Could not open file' })
                                        }
                                      }}
                                    >
                                      <Paperclip className="h-3 w-3" />
                                      {att.fileName || 'Attachment'}
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                            {!parsed.text && parsed.attachments.length === 0 ? (
                              <div className="whitespace-pre-wrap">{a.message}</div>
                            ) : null}
                          </div>
                        )
                      })()
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
                            onClick={() => {
                              setEditingCommentId(a.id)
                              setEditingCommentText(parseCommentAttachments(a.message).text || a.message)
                            }}
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
                        <div className="text-[11px] text-blue-800 mt-0.5">{formatDate(a.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </>
              )
            })()}
          </div>
        </div>

      </div>

      {imagePreview &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[400] bg-black/70 flex items-center justify-center p-4"
            onClick={() => setImagePreview(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Image preview"
          >
            <div
              className="relative max-w-[95vw] max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 px-3 py-2 border-b bg-slate-50">
                <span className="text-sm font-medium text-slate-800 truncate max-w-[70vw]">
                  {imagePreview.alt}
                </span>
                <button
                  type="button"
                  className="h-8 w-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-600"
                  onClick={() => setImagePreview(null)}
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview.src}
                alt={imagePreview.alt}
                className="w-full max-w-[min(92vw,1100px)] max-h-[calc(90vh-3.5rem)] h-auto object-contain bg-slate-900"
              />
            </div>
          </div>,
          document.body,
        )}
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