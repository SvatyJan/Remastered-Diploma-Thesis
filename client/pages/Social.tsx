import React, { useEffect, useMemo, useState } from 'react'
import GameLayout from '../components/GameLayout'
import { useRequireGameSession } from '../hooks/useRequireGameSession'
import { Link } from 'react-router-dom'

type Player = {
  id: number
  name: string
  level: number
  ancestry: string | null
  guild: string | null
}

const columns: Array<{ key: keyof Player | 'index' | 'action'; label: string }> = [
  { key: 'index', label: '#' },
  { key: 'name', label: 'Player' },
  { key: 'level', label: 'Level' },
  { key: 'ancestry', label: 'Ancestry' },
  { key: 'guild', label: 'Guild' },
  { key: 'action', label: 'Action' },
]

export default function SocialPage() {
  useRequireGameSession()

  const [players, setPlayers] = useState<Player[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [friendError, setFriendError] = useState<string | null>(null)
  const [friendSuccess, setFriendSuccess] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [requestedIds, setRequestedIds] = useState<number[]>([])

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

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 250)
    return () => clearTimeout(handle)
  }, [search])

  useEffect(() => {
    const fetchPlayers = async () => {
      setLoading(true)
      setError(null)
      setFriendError(null)
      setFriendSuccess(null)
      try {
        const token = localStorage.getItem('token')
        if (!token) throw new Error('Missing session token')
        const params = debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : ''
        const res = await fetch(`/api/social/players${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error ?? 'Failed to load players')
        }
        const data: { items: Player[] } = await res.json()
        setPlayers(data.items)
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load players')
        setPlayers([])
      } finally {
        setLoading(false)
      }
    }

    fetchPlayers()
  }, [debouncedSearch])

  const visiblePlayers = useMemo(() => players, [players])

  const handleAddFriend = async (targetId: number) => {
    if (pendingId === targetId || requestedIds.includes(targetId)) return
    if (!activeCharacter) {
      setFriendError('Select your character first to add friends.')
      setFriendSuccess(null)
      return
    }
    if (activeCharacter.id === targetId) {
      setFriendError('You cannot add yourself as a friend.')
      setFriendSuccess(null)
      return
    }
    try {
      setFriendError(null)
      setFriendSuccess(null)
      setPendingId(targetId)
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Missing session token')
      await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sourceCharacterId: activeCharacter.id, targetCharacterId: targetId }),
      }).then(assertOk)
      setRequestedIds((prev) => (prev.includes(targetId) ? prev : [...prev, targetId]))
      setFriendSuccess('Friend added!')
    } catch (err: any) {
      setFriendError(err?.message ?? 'Failed to add friend')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <GameLayout>
      <div style={pageShell}>
        <header style={header}>
          <div>
            <h1 style={title}>Social Hub</h1>
            <p style={subtitle}>Find friends, rivals, or guildmates.</p>
          </div>
          <input
            type="search"
            value={search}
            placeholder="Search by player name"
            onChange={(event) => setSearch(event.target.value)}
            style={searchInput}
          />
        </header>
        {error && <div style={errorBox}>{error}</div>}
        {friendSuccess && <div style={successBox}>{friendSuccess}</div>}
        {friendError && <div style={errorBox}>{friendError}</div>}
        <section style={tableSection}>
          <table style={table}>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key} style={th}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td style={loadingCell} colSpan={columns.length}>
                    Loading players...
                  </td>
                </tr>
              ) : visiblePlayers.length === 0 ? (
                <tr>
                  <td style={loadingCell} colSpan={columns.length}>
                    No players found.
                  </td>
                </tr>
              ) : (
                visiblePlayers.map((player, index) => {
                  const isSelf = activeCharacter?.id === player.id
                  const hasRequested = requestedIds.includes(player.id)
                  const isPending = pendingId === player.id
                  const disabled = isSelf || hasRequested || isPending
                  const label = !activeCharacter
                    ? 'Select a character'
                    : isSelf
                    ? 'This is you'
                    : hasRequested
                    ? 'Friend added'
                    : isPending
                    ? 'Adding...'
                    : 'Add friend'

                  return (
                    <tr key={player.id} style={row}>
                      <td style={td}>{index + 1}</td>
                      <td style={{ ...td, fontWeight: 600 }}><Link to={`/character/${player.id}`} style={playerLink}>{player.name}</Link></td>
                      <td style={td}>{player.level}</td>
                      <td style={td}>{player.ancestry ?? 'None'}</td>
                      <td style={td}>{player.guild ?? 'None'}</td>
                      <td style={actionCell}>
                        <button
                          type="button"
                          style={{ ...addFriendButton, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1 }}
                          onClick={() => handleAddFriend(player.id)}
                          disabled={disabled}
                        >
                          {label}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </section>
      </div>
    </GameLayout>
  )
}

async function assertOk(response: Response) {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data?.error ?? 'Request failed')
  }
}

const pageShell: React.CSSProperties = { display: 'grid', gap: 24, padding: 24, color: '#e5e7eb' }
const header: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }
const title: React.CSSProperties = { margin: 0, fontSize: 28, fontWeight: 600 }
const subtitle: React.CSSProperties = { margin: 0, color: '#94a3b8' }
const searchInput: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #475569',
  background: 'rgba(15,23,42,0.65)',
  color: '#f8fafc',
  minWidth: 240,
}
const errorBox: React.CSSProperties = {
  background: 'rgba(148, 33, 45, 0.35)',
  border: '1px solid rgba(248, 113, 113, 0.6)',
  borderRadius: 12,
  padding: '12px 16px',
  color: '#fecaca',
}
const tableSection: React.CSSProperties = {
  background: 'rgba(15,23,42,0.75)',
  borderRadius: 16,
  overflow: 'hidden',
  border: '1px solid rgba(71, 85, 105, 0.6)',
}
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 14 }
const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '14px 18px',
  background: 'rgba(30,41,59,0.85)',
  borderBottom: '1px solid rgba(71,85,105,0.6)',
  color: '#cbd5f5',
  textTransform: 'uppercase',
  letterSpacing: 0.4,
  fontSize: 12,
}
const td: React.CSSProperties = {
  padding: '12px 18px',
  borderBottom: '1px solid rgba(71,85,105,0.4)',
}
const row: React.CSSProperties = {
  transition: 'background 0.15s ease',
}
const loadingCell: React.CSSProperties = {
  padding: '20px 18px',
  textAlign: 'center',
  color: '#94a3b8',
}

const playerLink: React.CSSProperties = { color: '#cbd5f5', textDecoration: 'none' }
const actionCell: React.CSSProperties = { ...td, textAlign: 'right' }
const addFriendButton: React.CSSProperties = {
  padding: '6px 12px',
  background: '#334155',
  border: '1px solid #475569',
  borderRadius: 8,
  color: '#e2e8f0',
  cursor: 'pointer',
  fontSize: 12,
}
const successBox: React.CSSProperties = {
  background: 'rgba(34,197,94,0.25)',
  border: '1px solid rgba(34,197,94,0.45)',
  borderRadius: 12,
  padding: '12px 16px',
  color: '#bbf7d0',
}
