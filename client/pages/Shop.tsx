import React, { useCallback, useEffect, useMemo, useState } from 'react'
import GameLayout from '../components/GameLayout'
import { useRequireGameSession } from '../hooks/useRequireGameSession'

type Modifier = { name: string; value: number }

type ShopPlayerItem = {
  inventoryId: number
  templateId: number
  name: string
  slug: string
  description: string | null
  slotCode: string | null
  amount: number
  valueGold: number
  modifiers: Modifier[]
}

type ShopVendorItem = {
  templateId: number
  name: string
  slug: string
  description: string | null
  slotCode: string | null
  valueGold: number
  modifiers: Modifier[]
}

type ShopState = {
  coins: number
  playerItems: ShopPlayerItem[]
  vendorItems: ShopVendorItem[]
}

type TradeEntry =
  | { id: string; kind: 'sell'; inventoryId: number; templateId: number; amount: number }
  | { id: string; kind: 'buy'; templateId: number; amount: number }

type DragData =
  | { kind: 'player'; inventoryId: number }
  | { kind: 'vendor'; templateId: number }
  | { kind: 'trade'; entryId: string }

type TooltipState = {
  title: string
  description: string | null
  valueGold: number
  modifiers: Modifier[]
  amount?: number
  position: { x: number; y: number }
}

const MAX_BUY_STACK = 99

export default function ShopPage() {
  useRequireGameSession()
  const [shop, setShop] = useState<ShopState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tradeEntries, setTradeEntries] = useState<TradeEntry[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [tradeDropping, setTradeDropping] = useState(false)

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

  const characterId = activeCharacter?.id ?? null

  const playerMap = useMemo(() => {
    if (!shop) return new Map<number, ShopPlayerItem>()
    return new Map(shop.playerItems.map((item) => [item.inventoryId, item]))
  }, [shop])

  const vendorMap = useMemo(() => {
    if (!shop) return new Map<number, ShopVendorItem>()
    return new Map(shop.vendorItems.map((item) => [item.templateId, item]))
  }, [shop])

  const sellTotal = useMemo(() => {
    if (!shop) return 0
    return tradeEntries.reduce((sum, entry) => {
      if (entry.kind !== 'sell') return sum
      const item = playerMap.get(entry.inventoryId)
      if (!item) return sum
      return sum + item.valueGold * entry.amount
    }, 0)
  }, [playerMap, shop, tradeEntries])

  const buyTotal = useMemo(() => {
    if (!shop) return 0
    return tradeEntries.reduce((sum, entry) => {
      if (entry.kind !== 'buy') return sum
      const item = vendorMap.get(entry.templateId)
      if (!item) return sum
      return sum + item.valueGold * entry.amount
    }, 0)
  }, [vendorMap, shop, tradeEntries])

  const insufficientGold = useMemo(() => {
    if (!shop) return false
    return buyTotal > shop.coins + sellTotal
  }, [shop, buyTotal, sellTotal])

  const netGoldChange = sellTotal - buyTotal

  const formattedSellTotal = sellTotal > 0 ? `+${sellTotal}` : '0'
  const formattedBuyTotal = buyTotal > 0 ? `-${buyTotal}` : '0'
  const sellTotalColor = sellTotal > 0 ? '#86efac' : '#9ca3af'
  const buyTotalColor = buyTotal > 0 ? '#fca5a5' : '#9ca3af'

  const parseDragData = useCallback((event: React.DragEvent): DragData | null => {
    const raw = event.dataTransfer.getData('application/json')
    if (!raw) return null
    try {
      const data = JSON.parse(raw) as DragData
      if (data && typeof data.kind === 'string') return data
    } catch (err) {
      console.warn('Failed to parse drag payload', err)
    }
    return null
  }, [])

  const hideTooltip = useCallback(() => setTooltip(null), [])

  const updateTooltipPosition = useCallback((event: React.MouseEvent) => {
    setTooltip((prev) => (prev ? { ...prev, position: { x: event.clientX, y: event.clientY } } : prev))
  }, [])

  const showTooltip = useCallback((payload: Omit<TooltipState, 'position'>, event: React.MouseEvent) => {
    setTooltip({ ...payload, position: { x: event.clientX, y: event.clientY } })
  }, [])

  useEffect(() => {
    let aborted = false
    const fetchState = async () => {
      if (!characterId) {
        setShop(null)
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const token = localStorage.getItem('token')
        if (!token) throw new Error('Missing session token')
        const res = await fetch(`/api/shop/${characterId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error ?? 'Failed to load shop data')
        }
        if (aborted) return
        const data = (await res.json()) as ShopState
        setShop(data)
        setTradeEntries([])
      } catch (err: any) {
        if (aborted) return
        setError(err?.message ?? 'Failed to load shop data')
        setShop(null)
      } finally {
        if (!aborted) setLoading(false)
      }
    }

    fetchState()
    return () => {
      aborted = true
    }
  }, [characterId])

  const addPlayerItemToTrade = useCallback(
    (inventoryId: number) => {
      const item = playerMap.get(inventoryId)
      if (!item) return
      setTradeEntries((prev) => {
        const existing = prev.find((entry) => entry.kind === 'sell' && entry.inventoryId === inventoryId)
        if (existing) {
          if (existing.amount >= item.amount) return prev
          return prev.map((entry) =>
            entry === existing ? { ...existing, amount: existing.amount + 1 } : entry,
          )
        }
        return [...prev, { id: `sell-${inventoryId}`, kind: 'sell', inventoryId, templateId: item.templateId, amount: 1 }]
      })
    },
    [playerMap],
  )

  const addVendorItemToTrade = useCallback(
    (templateId: number) => {
      const item = vendorMap.get(templateId)
      if (!item) return
      setTradeEntries((prev) => {
        const existing = prev.find((entry) => entry.kind === 'buy' && entry.templateId === templateId)
        if (existing) {
          if (existing.amount >= MAX_BUY_STACK) return prev
          return prev.map((entry) =>
            entry === existing ? { ...existing, amount: existing.amount + 1 } : entry,
          )
        }
        return [...prev, { id: `buy-${templateId}`, kind: 'buy', templateId, amount: 1 }]
      })
    },
    [vendorMap],
  )

  const removeTradeEntry = useCallback((entryId: string) => {
    setTradeEntries((prev) => prev.filter((entry) => entry.id !== entryId))
  }, [])

  const adjustTradeAmount = useCallback(
    (entryId: string, delta: number) => {
      setTradeEntries((prev) =>
        prev
          .map((entry) => {
            if (entry.id !== entryId) return entry
            const nextAmount = entry.amount + delta
            if (nextAmount <= 0) return null
            if (entry.kind === 'sell') {
              const item = playerMap.get(entry.inventoryId)
              const maxAmount = item?.amount ?? entry.amount
              return { ...entry, amount: Math.min(nextAmount, maxAmount) }
            }
            const capped = Math.min(nextAmount, MAX_BUY_STACK)
            return { ...entry, amount: capped }
          })
          .filter((entry): entry is TradeEntry => Boolean(entry)),
      )
    },
    [playerMap],
  )

  const handleTradeDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      setTradeDropping(false)
      const data = parseDragData(event)
      if (!data) return
      if (data.kind === 'player') addPlayerItemToTrade(data.inventoryId)
      if (data.kind === 'vendor') addVendorItemToTrade(data.templateId)
    },
    [addPlayerItemToTrade, addVendorItemToTrade, parseDragData],
  )

  const handlePlayerDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const data = parseDragData(event)
      if (!data || data.kind !== 'trade') return
      const entry = tradeEntries.find((item) => item.id === data.entryId)
      if (entry?.kind === 'sell') removeTradeEntry(entry.id)
    },
    [parseDragData, removeTradeEntry, tradeEntries],
  )

  const handleVendorDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const data = parseDragData(event)
      if (!data || data.kind !== 'trade') return
      const entry = tradeEntries.find((item) => item.id === data.entryId)
      if (entry?.kind === 'buy') removeTradeEntry(entry.id)
    },
    [parseDragData, removeTradeEntry, tradeEntries],
  )

  const handleTradeSubmit = useCallback(async () => {
    if (!shop || !characterId || tradeEntries.length === 0) return
    const token = localStorage.getItem('token')
    if (!token) {
      setError('Missing session token')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const sellItems = tradeEntries
        .filter((entry): entry is Extract<TradeEntry, { kind: 'sell' }> => entry.kind === 'sell')
        .map((entry) => ({ inventoryId: entry.inventoryId, amount: entry.amount }))
      const buyItems = tradeEntries
        .filter((entry): entry is Extract<TradeEntry, { kind: 'buy' }> => entry.kind === 'buy')
        .map((entry) => ({ templateId: entry.templateId, amount: entry.amount }))

      const res = await fetch(`/api/shop/${characterId}/trade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sellItems, buyItems }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Trade failed')
      }
      const data = (await res.json()) as ShopState
      setShop(data)
      setTradeEntries([])
    } catch (err: any) {
      setError(err?.message ?? 'Trade failed')
    } finally {
      setSubmitting(false)
    }
  }, [shop, characterId, tradeEntries])

  if (!characterId)
    return (
      <GameLayout>
        <div style={pageWrapper}>
          <div style={infoBox}>Select or create a character to enter the shop.</div>
        </div>
      </GameLayout>
    )

  return (
    <GameLayout>
      <div style={pageWrapper}>
        {error ? <div style={errorBox}>{error}</div> : null}
        {loading ? (
          <div style={infoBox}>Loading shop...</div>
        ) : !shop ? (
          <div style={infoBox}>Shop data is unavailable.</div>
        ) : (
          <>
            <div style={headerRow}>
              <div>
                <h1 style={title}>Shop</h1>
                <p style={subtitle}>Drag items to the trade area to buy or sell.</p>
              </div>
              <div style={walletBox}>
                <span>Current gold:</span>
                <strong>{shop.coins}</strong>
              </div>
            </div>
            <div style={shopLayout}>
              <section
                style={column}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handlePlayerDrop}
              >
                <h2 style={sectionTitle}>Your Inventory</h2>
                <div style={inventoryGrid}>
                  {shop.playerItems.length === 0 ? (
                    <div style={emptyNotice}>Inventory is empty.</div>
                  ) : (
                    shop.playerItems.map((item) => (
                      <div
                        key={item.inventoryId}
                        style={inventoryItem}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = 'move'
                          event.dataTransfer.setData(
                            'application/json',
                            JSON.stringify({ kind: 'player', inventoryId: item.inventoryId }),
                          )
                        }}
                        onMouseEnter={(event) =>
                          showTooltip(
                            {
                              title: item.name,
                              description: item.description,
                              valueGold: item.valueGold,
                              modifiers: item.modifiers,
                              amount: item.amount,
                            },
                            event,
                          )
                        }
                        onMouseMove={updateTooltipPosition}
                        onMouseLeave={hideTooltip}
                        onDoubleClick={() => addPlayerItemToTrade(item.inventoryId)}
                      >
                        <span style={itemName}>{item.name}</span>
                        <span style={itemValue}>{item.valueGold}g</span>
                        {item.amount > 1 ? <span style={itemAmount}>x{item.amount}</span> : null}
                      </div>
                    ))
                  )}
                </div>
                <p style={hint}>Drag or double-click an item to move it to the trade. Drag back here to cancel selling.</p>
              </section>

              <section
                style={{ ...column, border: tradeDropping ? '2px solid #60a5fa' : column.border }}
                onDragOver={(event) => {
                  event.preventDefault()
                  event.dataTransfer.dropEffect = 'move'
                  if (!tradeDropping) setTradeDropping(true)
                }}
                onDragLeave={(event) => {
                  const nextTarget = event.relatedTarget as Node | null
                  if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
                    setTradeDropping(false)
                  }
                }}
                onDrop={handleTradeDrop}
              >
                <h2 style={sectionTitle}>Trade Area</h2>
                {tradeEntries.length === 0 ? (
                  <div style={emptyNotice}>Drag items here to prepare a trade.</div>
                ) : (
                  <div style={tradeList}>
                    {tradeEntries.map((entry) => {
                      const reference =
                        entry.kind === 'sell'
                          ? playerMap.get(entry.inventoryId)
                          : vendorMap.get(entry.templateId)
                      if (!reference) return null

                      const totalValue = reference.valueGold * entry.amount
                      const signedValue = entry.kind === 'sell' ? `+${totalValue}` : `-${totalValue}`
                      const valueColor = entry.kind === 'sell' ? '#86efac' : '#fca5a5'
                      const tradeLabel = entry.kind === 'sell' ? 'Sell' : 'Buy'
                      const tagStyle =
                        entry.kind === 'sell'
                          ? { background: 'rgba(34,197,94,0.15)', color: '#bbf7d0', border: '1px solid rgba(34,197,94,0.4)' }
                          : { background: 'rgba(239,68,68,0.18)', color: '#fecaca', border: '1px solid rgba(239,68,68,0.35)' }

                      return (
                        <div
                          key={entry.id}
                          style={tradeItem}
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = 'move'
                            event.dataTransfer.setData(
                              'application/json',
                              JSON.stringify({ kind: 'trade', entryId: entry.id }),
                            )
                          }}
                          onMouseEnter={(event) =>
                            showTooltip(
                              {
                                title: reference.name,
                                description: reference.description,
                                valueGold: reference.valueGold,
                                modifiers: reference.modifiers,
                                amount:
                                  entry.kind === 'sell'
                                    ? playerMap.get(entry.inventoryId)?.amount
                                    : entry.amount,
                              },
                              event,
                            )
                          }
                          onMouseMove={updateTooltipPosition}
                          onMouseLeave={hideTooltip}
                          onDoubleClick={() => removeTradeEntry(entry.id)}
                        >
                          <div>
                            <strong>{reference.name}</strong>
                            <span style={{ ...tradeTag, ...tagStyle }}>{tradeLabel}</span>
                          </div>
                          <div style={tradeControls}>
                            <button
                              type="button"
                              style={controlButton}
                              onMouseDown={(event) => event.stopPropagation()}
                              onClick={(event) => {
                                event.stopPropagation()
                                adjustTradeAmount(entry.id, -1)
                              }}
                            >
                              -
                            </button>
                            <span>{entry.amount}</span>
                            <button
                              type="button"
                              style={controlButton}
                              onMouseDown={(event) => event.stopPropagation()}
                              onClick={(event) => {
                                event.stopPropagation()
                                adjustTradeAmount(entry.id, 1)
                              }}
                            >
                              +
                            </button>
                          </div>
                          <div style={tradeFooter}>
                            <span style={{ color: valueColor }}>{signedValue}g</span>
                            <button
                              type="button"
                              style={removeButton}
                              onMouseDown={(event) => event.stopPropagation()}
                              onClick={(event) => {
                                event.stopPropagation()
                                removeTradeEntry(entry.id)
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                <div style={summaryBox}>
                  <div>Sell total: <strong style={{ color: sellTotalColor }}>{formattedSellTotal}g</strong></div>
                  <div>Buy total: <strong style={{ color: buyTotalColor }}>{formattedBuyTotal}g</strong></div>
                  <div>
                    Result:{' '}
                    <strong style={{ color: netGoldChange >= 0 ? '#86efac' : '#fca5a5' }}>
                      {netGoldChange >= 0 ? '+' : ''}
                      {netGoldChange}g
                    </strong>
                  </div>
                  {insufficientGold ? <div style={warning}>Not enough gold.</div> : null}
                  {tradeEntries.length > 0 ? (
                    <button
                      type="button"
                      style={{ ...tradeButton, opacity: submitting || insufficientGold ? 0.6 : 1 }}
                      disabled={submitting || insufficientGold}
                      onClick={handleTradeSubmit}
                    >
                      {submitting ? 'Processing...' : 'Trade'}
                    </button>
                  ) : null}
                </div>
              </section>

              <section
                style={column}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleVendorDrop}
              >
                <h2 style={sectionTitle}>Merchant Stock</h2>
                <div style={inventoryGrid}>
                  {shop.vendorItems.length === 0 ? (
                    <div style={emptyNotice}>The merchant has no items.</div>
                  ) : (
                    shop.vendorItems.map((item) => (
                      <div
                        key={item.templateId}
                        style={inventoryItem}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = 'move'
                          event.dataTransfer.setData(
                            'application/json',
                            JSON.stringify({ kind: 'vendor', templateId: item.templateId }),
                          )
                        }}
                        onMouseEnter={(event) =>
                          showTooltip(
                            {
                              title: item.name,
                              description: item.description,
                              valueGold: item.valueGold,
                              modifiers: item.modifiers,
                            },
                            event,
                          )
                        }
                        onMouseMove={updateTooltipPosition}
                        onMouseLeave={hideTooltip}
                        onDoubleClick={() => addVendorItemToTrade(item.templateId)}
                      >
                        <span style={itemName}>{item.name}</span>
                        <span style={itemValue}>{item.valueGold}g</span>
                      </div>
                    ))
                  )}
                </div>
                <p style={hint}>Drag or double-click an item to move it to the trade. Drag back here to cancel buying.</p>
              </section>
            </div>
          </>
        )}
        {tooltip ? (
          <div
            style={{
              ...tooltipBox,
              top: tooltip.position.y + 12,
              left: tooltip.position.x + 12,
            }}
          >
            <strong style={tooltipTitle}>{tooltip.title}</strong>
            {tooltip.description ? <p style={tooltipText}>{tooltip.description}</p> : null}
            <div style={tooltipLine}>Value: {tooltip.valueGold}g</div>
            {typeof tooltip.amount === 'number' ? (
              <div style={tooltipLine}>Available: {tooltip.amount}</div>
            ) : null}
            {tooltip.modifiers.length > 0 ? (
              <ul style={tooltipList}>
                {tooltip.modifiers.map((mod) => (
                  <li key={mod.name}>
                    {mod.name}: {mod.value >= 0 ? '+' : ''}
                    {mod.value}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </GameLayout>
  )
}

const pageWrapper: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 24 }
const headerRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
const title: React.CSSProperties = { margin: 0, fontSize: 28 }
const subtitle: React.CSSProperties = { margin: '8px 0 0', color: '#9ca3af', fontSize: 14 }
const walletBox: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, background: 'rgba(37,99,235,0.15)', color: '#bfdbfe', fontWeight: 600 }
const infoBox: React.CSSProperties = { padding: '18px 20px', borderRadius: 12, background: 'rgba(59,130,246,0.15)', color: '#e0f2fe' }
const shopLayout: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1.1fr 1fr', gap: 24 }
const column: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  background: 'rgba(16,20,28,0.88)',
  borderRadius: 18,
  padding: 20,
  boxShadow: '0 18px 38px rgba(0,0,0,0.35)',
  border: '1px solid rgba(148,163,184,0.12)'
}
const sectionTitle: React.CSSProperties = { margin: 0, fontSize: 20, fontWeight: 600 }
const inventoryGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }
const inventoryItem: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 14px', borderRadius: 12, background: 'rgba(31,41,55,0.85)', border: '1px solid rgba(148,163,184,0.3)', cursor: 'grab', boxShadow: '0 8px 20px rgba(0,0,0,0.3)' }
const itemName: React.CSSProperties = { fontWeight: 600, fontSize: 14 }
const itemValue: React.CSSProperties = { color: '#fbbf24', fontSize: 13 }
const itemAmount: React.CSSProperties = { alignSelf: 'flex-end', fontSize: 12, background: 'rgba(0,0,0,0.35)', padding: '2px 6px', borderRadius: 8 }
const emptyNotice: React.CSSProperties = { gridColumn: '1 / -1', textAlign: 'center', padding: '20px 12px', borderRadius: 12, background: 'rgba(12,18,28,0.6)', color: '#9ca3af' }
const hint: React.CSSProperties = { margin: 0, fontSize: 12, color: '#6b7280' }
const tradeList: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 }
const tradeItem: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 14, background: 'rgba(30,58,138,0.25)', border: '1px solid rgba(96,165,250,0.25)', cursor: 'grab' }
const tradeControls: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 }
const controlButton: React.CSSProperties = { width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(148,163,184,0.4)', background: 'rgba(30,41,59,0.8)', color: '#e2e8f0', cursor: 'pointer' }
const tradeFooter: React.CSSProperties = { gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, color: '#bfdbfe' }
const tradeTag: React.CSSProperties = { marginLeft: 8, padding: '2px 6px', borderRadius: 6, fontSize: 12, fontWeight: 600 }
const removeButton: React.CSSProperties = { border: 'none', background: 'transparent', color: '#fca5a5', cursor: 'pointer', fontSize: 13 }
const summaryBox: React.CSSProperties = { marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px', borderRadius: 12, background: 'rgba(17,24,39,0.9)', border: '1px solid rgba(148,163,184,0.2)' }
const tradeButton: React.CSSProperties = { marginTop: 8, padding: '10px 14px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #2563eb, #38bdf8)', color: '#f8fafc', cursor: 'pointer', fontWeight: 600 }
const warning: React.CSSProperties = { fontSize: 13, color: '#fca5a5' }
const errorBox: React.CSSProperties = { padding: '14px 16px', borderRadius: 12, background: 'rgba(220,38,38,0.18)', border: '1px solid rgba(239,68,68,0.35)', color: '#fecaca' }
const tooltipBox: React.CSSProperties = { position: 'fixed', pointerEvents: 'none', zIndex: 20, minWidth: 220, background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(148,163,184,0.3)', borderRadius: 12, padding: '12px 14px', color: '#f8fafc', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }
const tooltipTitle: React.CSSProperties = { display: 'block', marginBottom: 6 }
const tooltipText: React.CSSProperties = { margin: '0 0 6px', fontSize: 13, color: '#cbd5f5' }
const tooltipLine: React.CSSProperties = { fontSize: 12, color: '#e2e8f0' }
const tooltipList: React.CSSProperties = { margin: '8px 0 0', padding: '0 0 0 16px', fontSize: 12, color: '#a5b4fc' }
