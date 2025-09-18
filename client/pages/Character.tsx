import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import GameLayout from '../components/GameLayout'
import { useRequireGameSession } from '../hooks/useRequireGameSession'

type AttributeMap = Record<string, number>

type ApiAttribute = { name: string; value: number }

type ApiInventoryItem = {
  id: number
  amount: number
  name: string
  slug: string
  description: string | null
  slotCode: string | null
  allowedSlots: string[]
  equippedSlot: string | null
  modifiers: Array<{ name: string; value: number }>
}

type Item = {
  inventoryId: number
  name: string
  description: string | null
  amount: number
  allowedSlots: string[]
  modifiers: AttributeMap
  slot: string | null
  position: { x: number; y: number } | null
  icon: string
}

type CharacterSummary = { id: number; name: string; level: number; ancestry: { id: number; name: string; description: string | null } | null; isSelf: boolean }

type DragPayload = { inventoryId: number }

const INVENTORY_COLS = 8
const INVENTORY_ROWS = 6
const CELL_SIZE = 64

const EQUIPMENT_SLOTS: Array<{ code: string; label: string; top: number; left: number }> = [
  { code: 'head', label: 'Head', top: 16, left: 170 },
  { code: 'neck', label: 'Neck', top: 86, left: 170 },
  { code: 'shoulder', label: 'Shoulder', top: 86, left: 60 },
  { code: 'back', label: 'Back', top: 156, left: 60 },
  { code: 'chest', label: 'Chest', top: 156, left: 170 },
  { code: 'wrist', label: 'Wrist', top: 226, left: 290 },
  { code: 'hands', label: 'Hands', top: 296, left: 290 },
  { code: 'waist', label: 'Waist', top: 236, left: 170 },
  { code: 'legs', label: 'Legs', top: 306, left: 170 },
  { code: 'feet', label: 'Feet', top: 376, left: 170 },
  { code: 'ring', label: 'Ring', top: 206, left: 290 },
  { code: 'trinket', label: 'Trinket', top: 136, left: 290 },
  { code: 'mainhand', label: 'Main-hand', top: 246, left: 60 },
  { code: 'offhand', label: 'Off-hand', top: 316, left: 60 },
  { code: 'twohand', label: 'Two-hand', top: 386, left: 290 },
]

export default function CharacterPage() {
  useRequireGameSession()
  const [character, setCharacter] = useState<CharacterSummary | null>(null)
  const [baseAttributes, setBaseAttributes] = useState<AttributeMap>({})
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [tooltip, setTooltip] = useState<{ id: number; x: number; y: number } | null>(null)
  const [friendStatus, setFriendStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [friendError, setFriendError] = useState<string | null>(null)

  const params = useParams<{ id?: string }>()
  const rawParamId = params.id
  const parsedParamId = rawParamId ? Number(rawParamId) : null
  const invalidCharacterParam = Boolean(
    rawParamId &&
      (Number.isNaN(parsedParamId ?? Number.NaN) ||
        !Number.isFinite(parsedParamId ?? Number.NaN) ||
        !Number.isInteger(parsedParamId ?? Number.NaN) ||
        (parsedParamId ?? 0) <= 0),
  )

  const activeCharacter = useMemo(() => {
    const stored = localStorage.getItem('activeCharacter')
    if (!stored) return null
    try {
      return JSON.parse(stored) as { id: number; name: string }
    } catch (err) {
      console.warn('Failed to parse activeCharacter', err)
      return null
    }
  }, [])

  const characterId = useMemo(() => {
    if (invalidCharacterParam) return null
    if (parsedParamId) return parsedParamId
    return activeCharacter?.id ?? null
  }, [invalidCharacterParam, parsedParamId, activeCharacter])

  const fetchData = useCallback(async () => {
    if (!characterId) return
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Missing session token')
      const res = await fetch(`/api/characters/${characterId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? 'Failed to load character')
      }
      const data: {
        character: CharacterSummary
        attributes: ApiAttribute[]
        inventory: ApiInventoryItem[]
      } = await res.json()

      setCharacter(data.character)
      setBaseAttributes(mapAttributeList(data.attributes))
      setItems(buildItems(data.inventory))
      setFriendStatus('idle')
      setFriendError(null)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load character')
    } finally {
      setLoading(false)
    }
  }, [characterId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    setFriendStatus('idle')
    setFriendError(null)
  }, [characterId])

  const equippedAttributes = useMemo(() => computeAttributes(baseAttributes, items), [baseAttributes, items])

  const equippedBySlot = useMemo(() => {
    const map: Record<string, Item | undefined> = {}
    for (const slot of EQUIPMENT_SLOTS) {
      map[slot.code] = items.find((item) => item.slot === slot.code)
    }
    return map
  }, [items])

  const allowInteraction = Boolean(character && activeCharacter && character.id === activeCharacter.id)
  const itemsInInventory = useMemo(() => (allowInteraction ? items.filter((item) => !item.slot && item.position) : []), [items, allowInteraction])

  const tooltipItem = tooltip ? items.find((item) => item.inventoryId === tooltip.id) : undefined

  const handleDragStart = (item: Item) => (event: React.DragEvent) => {
    if (!item.position && !item.slot) return
    const payload: DragPayload = { inventoryId: item.inventoryId }
    event.dataTransfer.setData('application/json', JSON.stringify(payload))
    event.dataTransfer.effectAllowed = 'move'
    setDraggingId(item.inventoryId)
  }

  const handleDragEnd = () => setDraggingId(null)

  const handleSlotDrop = (slotCode: string) => async (event: React.DragEvent) => {
    event.preventDefault()
    if (!allowInteraction || !characterId) return
    const payload = parsePayload(event.dataTransfer)
    if (!payload) return
    const item = items.find((candidate) => candidate.inventoryId === payload.inventoryId)
    if (!item) return
    if (!item.allowedSlots.includes(slotCode)) return

    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Missing session token')
      await fetch(`/api/characters/${characterId}/equipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ inventoryId: payload.inventoryId, slotCode }),
      }).then(assertOk)
      setItems((prev) => equipLocally(prev, payload.inventoryId, slotCode))
    } catch (err: any) {
      setError(err?.message ?? 'Failed to equip item')
      await fetchData()
    } finally {
      setDraggingId(null)
    }
  }

  const handleSlotDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  const handleInventoryDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!allowInteraction) return
    const payload = parsePayload(event.dataTransfer)
    if (!payload) return
    const item = items.find((candidate) => candidate.inventoryId === payload.inventoryId)
    if (!item) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = clamp(Math.floor((event.clientX - rect.left) / CELL_SIZE), 0, INVENTORY_COLS - 1)
    const y = clamp(Math.floor((event.clientY - rect.top) / CELL_SIZE), 0, INVENTORY_ROWS - 1)

    try {
      if (item.slot && characterId) {
        const token = localStorage.getItem('token')
        if (!token) throw new Error('Missing session token')
        await fetch(`/api/characters/${characterId}/equipment/${item.slot}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }).then(assertOk)
      }
      setItems((prev) => placeInInventory(prev, payload.inventoryId, x, y))
    } catch (err: any) {
      setError(err?.message ?? 'Failed to move item')
      await fetchData()
    } finally {
      setDraggingId(null)
    }
  }

  const handleInventoryDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }


  const onHover = (item: Item) => (event: React.MouseEvent<HTMLDivElement>) => {
    setTooltip({ id: item.inventoryId, x: event.clientX + 16, y: event.clientY + 16 })
  }

  const onLeave = () => setTooltip(null)

  const handleAddFriend = async () => {
    if (!character || character.isSelf) return
    if (!activeCharacter) {
      setFriendError('Select your character first to add friends.')
      return
    }
    try {
      setFriendError(null)
      setFriendStatus('loading')
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Missing session token')
      await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sourceCharacterId: activeCharacter.id, targetCharacterId: character.id }),
      }).then(assertOk)
      setFriendStatus('success')
    } catch (err: any) {
      setFriendStatus('error')
      setFriendError(err?.message ?? 'Failed to add friend')
    }
  }


if (invalidCharacterParam) {
  return (
    <GameLayout>
      <div style={centerMessage}>Invalid character reference.</div>
    </GameLayout>
  )
}

if (!characterId) {
  return (
    <GameLayout>
      <div style={centerMessage}>Open the Characters page to select a hero.</div>
    </GameLayout>
  )
}

  const friendButtonDisabled = !character || !activeCharacter || friendStatus === 'loading' || friendStatus === 'success'
  const friendButtonLabel = !activeCharacter
    ? 'Select a character'
    : friendStatus === 'success'
    ? 'Friend added'
    : friendStatus === 'loading'
    ? 'Adding...'
    : 'Add friend'

  return (
    <GameLayout>
      <div style={pageShell}>
        <div style={leftColumn}>
          <header style={header}>
            <div>
              <h1 style={title}>{character?.name ?? activeCharacter?.name ?? 'Character'}</h1>
              <p style={subtitle}>
                {loading
                  ? 'Loading...'
                  : allowInteraction
                  ? 'Drag items between equipment and inventory.'
                  : 'Review equipped items and attributes.'}
              </p>
            </div>
            {!allowInteraction && character && (
              <div style={friendActions}>
                <button
                  type="button"
                  style={friendButton}
                  onClick={handleAddFriend}
                  disabled={friendButtonDisabled}
                >
                  {friendButtonLabel}
                </button>
                {friendStatus === 'success' && <span style={friendSuccess}>{'Friend added'}</span>}
                {friendError && <span style={friendErrorText}>{friendError}</span>}
              </div>
            )}
          </header>
          <section style={equipmentSection}>
            {allowInteraction ? (
              <div style={equipmentBoard}>
                <div style={silhouette} />
                {EQUIPMENT_SLOTS.map((slot) => {
                  const equipped = equippedBySlot[slot.code]
                  return (
                    <div
                      key={slot.code}
                      onDrop={handleSlotDrop(slot.code)}
                      onDragOver={handleSlotDragOver}
                      style={{
                        ...slotBase,
                        top: slot.top,
                        left: slot.left,
                        borderColor: equipped ? '#3fc380' : draggingId ? '#3f7ac3' : '#555',
                      }}
                    >
                      {equipped ? (
                        <div
                          draggable={allowInteraction}
                          onDragStart={allowInteraction ? handleDragStart(equipped) : undefined}
                          onDragEnd={allowInteraction ? handleDragEnd : undefined}
                          onMouseMove={onHover(equipped)}
                          onMouseLeave={onLeave}
                          style={{
                            ...equippedItem,
                            cursor: allowInteraction ? 'grab' : 'default',
                            opacity: allowInteraction ? 1 : 0.95,
                          }}
                        >
                          <span style={itemIcon}>{equipped.icon}</span>
                        </div>
                      ) : (
                        <span style={slotLabel}>{slot.label}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={equipmentPlaceholder}>Equipment is private.</div>
            )}
          </section>
          <section style={attributesSection}>
            <h2 style={sectionTitle}>Attributes</h2>
            {loading ? (
              <p>Loading attributes...</p>
            ) : (
              <ul style={attributeList}>
                {Object.entries(equippedAttributes).map(([key, value]) => (
                  <li key={key} style={attributeRow}>
                    <span>{key}</span>
                    <span>{value}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {error && <div style={errorBox}>{error}</div>}
        </div>
        {allowInteraction ? (
          <aside style={inventorySection}>
            <h2 style={sectionTitle}>Inventory</h2>
            <div
              style={inventoryBoard}
              onDrop={handleInventoryDrop}
              onDragOver={handleInventoryDragOver}
            >
              {itemsInInventory.map((item) => (
                <div
                  key={item.inventoryId}
                  draggable={allowInteraction}
                  onDragStart={allowInteraction ? handleDragStart(item) : undefined}
                  onDragEnd={allowInteraction ? handleDragEnd : undefined}
                  onMouseMove={onHover(item)}
                  onMouseLeave={onLeave}
                  style={{
                    ...inventoryItem,
                    left: (item.position!.x || 0) * CELL_SIZE,
                    top: (item.position!.y || 0) * CELL_SIZE,
                    borderColor: draggingId === item.inventoryId ? '#3f7ac3' : '#444',
                    cursor: allowInteraction ? 'grab' : 'default',
                  }}
                >
                  <span style={itemIcon}>{item.icon}</span>
                  {item.amount > 1 && <span style={stackBadge}>{item.amount}</span>}
                </div>
              ))}
            </div>
          </aside>
        ) : (
          <aside style={inventorySection}>
            <h2 style={sectionTitle}>Inventory</h2>
            <div style={inventoryPlaceholder}>Inventory is private.</div>
          </aside>
        )}
      </div>
      {tooltipItem && tooltip && (
        <div style={{ ...tooltipBox, transform: `translate(${tooltip.x}px, ${tooltip.y}px)` }}>
          <strong style={{ display: 'block', marginBottom: 4 }}>{tooltipItem.name}</strong>
          {tooltipItem.description && <span style={{ display: 'block', marginBottom: 8 }}>{tooltipItem.description}</span>}
          {Object.entries(tooltipItem.modifiers).map(([key, value]) => (
            <div key={key}>{`+${value} ${key}`}</div>
          ))}
          {tooltipItem.amount > 1 && <div>{`Amount: ${tooltipItem.amount}`}</div>}
        </div>
      )}
    </GameLayout>
  )
}

function mapAttributeList(apiAttributes: ApiAttribute[]): AttributeMap {
  const result: AttributeMap = {}
  for (const attr of apiAttributes) {
    result[attr.name] = attr.value
  }
  return result
}

function buildItems(apiItems: ApiInventoryItem[]): Item[] {
  const inventoryItems: Item[] = []
  let cursorX = 0
  let cursorY = 0

  const advanceCursor = () => {
    cursorX += 1
    if (cursorX >= INVENTORY_COLS) {
      cursorX = 0
      cursorY += 1
    }
  }

  for (const apiItem of apiItems) {
    const base: Item = {
      inventoryId: apiItem.id,
      name: apiItem.name,
      description: apiItem.description,
      amount: apiItem.amount,
      allowedSlots: apiItem.allowedSlots,
      modifiers: mapModifierPairs(apiItem.modifiers),
      slot: apiItem.equippedSlot,
      position: null,
      icon: createIconFromName(apiItem.name),
    }

    if (!apiItem.equippedSlot) {
      if (cursorY >= INVENTORY_ROWS) {
        // inventory full, drop item at last cell
        base.position = { x: INVENTORY_COLS - 1, y: INVENTORY_ROWS - 1 }
      } else {
        base.position = { x: cursorX, y: cursorY }
        advanceCursor()
      }
    }

    inventoryItems.push(base)
  }

  return inventoryItems
}

function computeAttributes(base: AttributeMap, items: Item[]): AttributeMap {
  const total: AttributeMap = { ...base }
  for (const item of items) {
    if (!item.slot) continue
    for (const [key, value] of Object.entries(item.modifiers)) {
      total[key] = (total[key] ?? 0) + value
    }
  }
  return total
}

function equipLocally(items: Item[], inventoryId: number, slotCode: string): Item[] {
  return items.map((item) => {
    if (item.inventoryId === inventoryId) {
      return { ...item, slot: slotCode, position: null }
    }
    if (item.slot === slotCode) {
      // slot was occupied, move previous occupant into inventory at first free cell later
      return { ...item, slot: null }
    }
    return item
  }).map((item, _, all) => {
    if (!item.position && !item.slot) {
      const pos = findFirstFreeCell(all, item.inventoryId)
      return { ...item, position: pos }
    }
    return item
  })
}

function placeInInventory(items: Item[], inventoryId: number, x: number, y: number): Item[] {
  const occupied = new Set(items.filter((i) => i.inventoryId !== inventoryId && i.position).map((i) => `${i.position!.x},${i.position!.y}`))
  let targetX = x
  let targetY = y
  while (occupied.has(`${targetX},${targetY}`)) {
    targetX += 1
    if (targetX >= INVENTORY_COLS) {
      targetX = 0
      targetY += 1
    }
    if (targetY >= INVENTORY_ROWS) {
      targetX = INVENTORY_COLS - 1
      targetY = INVENTORY_ROWS - 1
      break
    }
  }

  return items.map((item) =>
    item.inventoryId === inventoryId ? { ...item, slot: null, position: { x: targetX, y: targetY } } : item,
  )
}

function findFirstFreeCell(items: Item[], ignoreId: number): { x: number; y: number } {
  const occupied = new Set(items.filter((i) => i.inventoryId !== ignoreId && i.position).map((i) => `${i.position!.x},${i.position!.y}`))
  for (let y = 0; y < INVENTORY_ROWS; y += 1) {
    for (let x = 0; x < INVENTORY_COLS; x += 1) {
      if (!occupied.has(`${x},${y}`)) return { x, y }
    }
  }
  return { x: INVENTORY_COLS - 1, y: INVENTORY_ROWS - 1 }
}

function parsePayload(transfer: DataTransfer): DragPayload | null {
  const raw = transfer.getData('application/json')
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed?.inventoryId === 'number') return parsed
  } catch (err) {
    console.warn('Invalid drag payload', err)
  }
  return null
}

function createIconFromName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '•'
  return trimmed[0]?.toUpperCase() ?? '•'
}

function mapModifierPairs(pairs: Array<{ name: string; value: number }>): AttributeMap {
  const result: AttributeMap = {}
  for (const { name, value } of pairs) {
    result[name] = value
  }
  return result
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

async function assertOk(response: Response) {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data?.error ?? 'Request failed')
  }
}

const pageShell: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(640px, 1fr) 320px',
  gap: 32,
  padding: '16px 0',
  color: '#e5e7eb',
}

const centerMessage: React.CSSProperties = {
  minHeight: '80vh',
  display: 'grid',
  placeItems: 'center',
  fontSize: 18,
}

const leftColumn: React.CSSProperties = { display: 'grid', gap: 24 }
const header: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
const title: React.CSSProperties = { margin: 0, fontSize: 28, fontWeight: 600 }
const subtitle: React.CSSProperties = { margin: 0, color: '#9ca3af', fontSize: 14 }

const equipmentSection: React.CSSProperties = {
  background: 'rgba(24,28,36,0.9)',
  borderRadius: 20,
  padding: 24,
  position: 'relative',
  boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
}

const equipmentBoard: React.CSSProperties = { position: 'relative', width: 360, height: 440, margin: '0 auto' }
const equipmentPlaceholder: React.CSSProperties = { textAlign: 'center', color: '#9ca3af', padding: '32px 0' }
const silhouette: React.CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: 40,
  width: 140,
  height: 320,
  background: '#16181f',
  borderRadius: '70px 70px 40px 40px',
  transform: 'translateX(-50%)',
  boxShadow: '0 0 0 2px rgba(79,79,90,0.4) inset',
}

const slotBase: React.CSSProperties = {
  position: 'absolute',
  width: 80,
  height: 80,
  border: '2px dashed #555',
  borderRadius: 16,
  display: 'grid',
  placeItems: 'center',
  background: 'rgba(12,14,18,0.75)',
  color: '#9ca3af',
  textAlign: 'center',
  fontSize: 12,
  padding: 6,
}

const slotLabel: React.CSSProperties = { lineHeight: 1.2 }
const equippedItem: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'grid',
  placeItems: 'center',
  borderRadius: 14,
  background: 'rgba(44,92,60,0.55)',
  border: '1px solid rgba(63,195,128,0.45)',
  cursor: 'grab',
}

const itemIcon: React.CSSProperties = { fontSize: 28 }

const attributesSection: React.CSSProperties = {
  background: 'rgba(24,28,36,0.9)',
  borderRadius: 20,
  padding: 24,
  boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
}

const sectionTitle: React.CSSProperties = { margin: '0 0 16px', fontSize: 18, fontWeight: 600 }
const attributeList: React.CSSProperties = { listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }
const attributeRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', background: 'rgba(12,14,18,0.5)', borderRadius: 12, padding: '8px 12px', fontSize: 14 }

const inventorySection: React.CSSProperties = {
  background: 'rgba(24,28,36,0.9)',
  borderRadius: 20,
  padding: 24,
  boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
  display: 'grid',
  gap: 16,
  height: 'fit-content',
}

const inventoryBoard: React.CSSProperties = {
  position: 'relative',
  width: INVENTORY_COLS * CELL_SIZE,
  height: INVENTORY_ROWS * CELL_SIZE,
  backgroundColor: '#0f1218',
  backgroundImage: 'linear-gradient(#323744 1px, transparent 1px), linear-gradient(90deg, #323744 1px, transparent 1px)',
  backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
  borderRadius: 12,
  border: '1px solid #3b4253',
}

const inventoryItem: React.CSSProperties = {
  position: 'absolute',
  width: CELL_SIZE,
  height: CELL_SIZE,
  display: 'grid',
  placeItems: 'center',
  background: 'rgba(40,46,58,0.85)',
  borderRadius: 12,
  border: '2px solid #444',
  cursor: 'grab',
  boxShadow: '0 8px 18px rgba(0,0,0,0.35)',
}

const stackBadge: React.CSSProperties = {
  position: 'absolute',
  bottom: 6,
  right: 6,
  background: 'rgba(12,14,18,0.85)',
  borderRadius: 6,
  padding: '2px 6px',
  fontSize: 12,
}

const inventoryPlaceholder: React.CSSProperties = {
  padding: '20px 0',
  textAlign: 'center',
  color: '#9ca3af',
}

const tooltipBox: React.CSSProperties = {
  position: 'fixed',
  zIndex: 1000,
  pointerEvents: 'none',
  background: 'rgba(17,20,27,0.95)',
  border: '1px solid #3b4253',
  borderRadius: 12,
  padding: '12px 16px',
  color: '#f1f5f9',
  boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
  minWidth: 180,
  transform: 'translate(-50%, -50%)',
}

const errorBox: React.CSSProperties = {
  background: 'rgba(133, 15, 32, 0.4)',
  border: '1px solid rgba(248, 113, 113, 0.6)',
  borderRadius: 12,
  padding: '12px 16px',
  color: '#fecaca',
}

const friendActions: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12 }
const friendButton: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 10,
  border: '1px solid rgba(59,130,246,0.6)',
  background: 'rgba(37,99,235,0.2)',
  color: '#bfdbfe',
  cursor: 'pointer',
  fontSize: 14,
}
const friendSuccess: React.CSSProperties = { color: '#86efac', fontSize: 12 }
const friendErrorText: React.CSSProperties = { color: '#fca5a5', fontSize: 12 }
