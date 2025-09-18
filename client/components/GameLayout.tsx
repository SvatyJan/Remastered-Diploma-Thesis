import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

type Props = { children: React.ReactNode }

export default function GameLayout({ children }: Props) {
  const navigate = useNavigate()
  const location = useLocation()

  const links = [
    { to: '/world', label: 'World' },
    { to: '/character', label: 'Character' },
    { to: '/social', label: 'Social' },
    { to: '/shop', label: 'Shop' },
  ]

  const onLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('activeCharacter')
    navigate('/login')
  }

  return (
    <div style={layout}>
      <nav style={navBar}>
        <div style={navLinks}>
          {links.map(({ to, label }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                style={{
                  ...navLink,
                  ...(active ? navLinkActive : {}),
                }}
              >
                {label}
              </Link>
            )
          })}
        </div>
        <button type="button" onClick={onLogout} style={logoutButton}>
          Logout
        </button>
      </nav>
      <main style={main}>{children}</main>
    </div>
  )
}

const layout: React.CSSProperties = { display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', background: '#101218', color: '#f5f5f5' }
const navBar: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }
const navLinks: React.CSSProperties = { display: 'flex', gap: 16 }
const navLink: React.CSSProperties = { color: '#f5f5f5', textDecoration: 'none', fontWeight: 500 }
const navLinkActive: React.CSSProperties = { textDecoration: 'underline' }
const logoutButton: React.CSSProperties = { background: '#d43c3c', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6, cursor: 'pointer' }
const main: React.CSSProperties = { flex: 1, padding: '24px', display: 'flex', flexDirection: 'column' }
