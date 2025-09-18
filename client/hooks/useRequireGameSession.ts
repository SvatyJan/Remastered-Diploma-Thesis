import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function useRequireGameSession() {
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }

    const active = localStorage.getItem('activeCharacter')
    if (!active) navigate('/characters')
  }, [navigate])
}
