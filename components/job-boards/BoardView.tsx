'use client'

import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  DragEndEvent,
  DragOverlay,
  closestCorners,
  closestCenter,
  pointerWithin
} from '@dnd-kit/core'

import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'

import { useState, useRef } from 'react'
import SortableList from './SortableList'
import { api } from '../../lib/api-client'

export default function BoardView({ board, setBoard, reload }: any) {

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor)
  )

  //Use ref instead of state (no heavy re-render)
  const activeIdRef = useRef<string | null>(null)
  const [, forceUpdate] = useState({})

  const lists = board.lists || []

  const findListByCardId = (cardId: string) => {
    return lists.find((list: any) =>
      list.cards.some((card: any) => card.id === cardId)
    )
  }
  const originalListIdRef = useRef<string | null>(null)

  const handleDragOver = (event: any) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const sourceList = findListByCardId(activeId)
    if (!sourceList) return

    let targetList = lists.find((l: any) => l.id === overId)
    if (!targetList) {
      targetList = findListByCardId(overId)
    }

    if (!targetList) return

    const sourceCards = [...sourceList.cards]
    const targetCards =
      sourceList.id === targetList.id
        ? sourceCards
        : [...targetList.cards]

    const oldIndex = sourceCards.findIndex(
      (c: any) => c.id === activeId
    )

    let newIndex = targetCards.findIndex(
      (c: any) => c.id === overId
    )

    if (newIndex === -1) {
      newIndex = targetCards.length
    }

    const [moved] = sourceCards.splice(oldIndex, 1)
    targetCards.splice(newIndex, 0, moved)

    const newLists = lists.map((l: any) => {
      if (l.id === sourceList.id)
        return { ...l, cards: sourceCards }
      if (l.id === targetList.id)
        return { ...l, cards: targetCards }
      return l
    })

    setBoard((prev: any) => ({
      ...prev,
      lists: newLists,
    }))
  }


  // HANDLE DROP
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const isListDrag = lists.some((l: any) => l.id === activeId)

    //LIST REORDER
    if (isListDrag) {
      const oldIndex = lists.findIndex((l: any) => l.id === activeId)
      const newIndex = lists.findIndex((l: any) => l.id === overId)

      if (oldIndex === -1 || newIndex === -1) return

      const newLists = arrayMove(lists, oldIndex, newIndex)

      setBoard((prev: any) => ({
        ...prev,
        lists: newLists,
      }))

      try {
        await api.patch(`/job-boards/${board.id}/lists/reorder`, {
          orderedIds: newLists.map((l: any) => l.id),
        })
      } catch {
        reload()
      }

      return
    }

    // ---------- CARD SAVE ----------
    const latestLists = board.lists

    const destinationList = latestLists.find((list: any) =>
      list.cards.some((c: any) => c.id === activeId)
    )

    if (!destinationList) return

    const originalListId = originalListIdRef.current
    if (!originalListId) return

    try {
      await api.patch('/job-boards/cards/reorder', {
        cardId: activeId,
        sourceListId: originalListId,
        destinationListId: destinationList.id,
        orderedIds: destinationList.cards.map((c: any) => c.id),
      })
    } catch {
      reload()
    }
  }


  const [isAddingList, setIsAddingList] = useState(false)
  const [newListName, setNewListName] = useState('')

  const createList = async () => {
    if (!newListName.trim()) return

    await api.post(`/job-boards/${board.id}/lists`, {
      name: newListName,
    })

    setNewListName('')
    setIsAddingList(false)
    reload()
  }

  const removeCardFromState = (cardId: string) => {
    setBoard((prev: any) => ({
      ...prev,
      lists: prev.lists.map((list: any) => ({
        ...list,
        cards: list.cards.filter((c: any) => c.id !== cardId),
      })),
    }))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={(event) => {
        const activeId = event.active.id as string
        activeIdRef.current = activeId
        //Store original source list BEFORE any mutation
        const originalList = board.lists.find((list: any) =>
          list.cards.some((c: any) => c.id === activeId)
        )

        if (originalList) {
          originalListIdRef.current = originalList.id
        }

        forceUpdate({})
      }}
      onDragEnd={(event) => {
        handleDragEnd(event)
        activeIdRef.current = null
        forceUpdate({})
      }}
      onDragOver={handleDragOver}
      onDragCancel={() => {
        activeIdRef.current = null
        forceUpdate({})
      }}
    >
      <div className="flex gap-4 p-6 overflow-x-auto h-full">
        <SortableContext
          items={lists.map((l: any) => l.id)}
          strategy={horizontalListSortingStrategy}
        >
          {lists.map((list: any) => (
            <SortableList
              key={list.id}
              list={list}
              reload={removeCardFromState}
              setBoard={setBoard}
            />
          ))}

          {/* Drag Preview */}
          <DragOverlay dropAnimation={null}>
            {activeIdRef.current ? (
              lists.some((l: any) => l.id === activeIdRef.current) ? (
                <div className="min-w-[260px] bg-white rounded-lg shadow-lg">
                  <div className="p-3 font-semibold border-b bg-slate-50">
                    {
                      lists.find((l: any) => l.id === activeIdRef.current)?.name
                    }
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded shadow-md p-3 text-sm w-[240px]">
                  {(() => {
                    const list = lists.find((l: any) =>
                      l.cards.some((c: any) => c.id === activeIdRef.current)
                    )
                    const card = list?.cards.find(
                      (c: any) => c.id === activeIdRef.current
                    )
                    return card?.title || ''
                  })()}
                </div>
              )
            ) : null}
          </DragOverlay>
        </SortableContext>

        {/* Add List */}
        <div className="min-w-[260px]">
          {!isAddingList ? (
            <button
              onClick={() => setIsAddingList(true)}
              className="w-full bg-slate-200 hover:bg-slate-300 rounded p-2 text-sm"
            >
              + Add List
            </button>
          ) : (
            <div className="bg-white rounded shadow p-3 space-y-2">
              <input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Enter list title..."
                className="w-full border rounded px-2 py-1 text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={createList}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                >
                  Add List
                </button>

                <button
                  onClick={() => {
                    setIsAddingList(false)
                    setNewListName('')
                  }}
                  className="text-sm text-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DndContext>
  )
}