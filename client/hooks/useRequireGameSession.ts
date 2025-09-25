import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export function useRequireGameSession() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }

    const active = localStorage.getItem('activeCharacter')
    if (!active) {
      navigate('/characters')
      return
    }

    const combatId = localStorage.getItem('activeCombatId')
    if (combatId && !location.pathname.startsWith('/combat')) {
      navigate(`/combat/${combatId}`)
    }
  }, [navigate, location.pathname])
}
