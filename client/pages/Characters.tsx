import React from 'react'
import { Link } from 'react-router-dom'

export default function CharactersPage() {
  return (
    <div style={container}>
      <h1>Character Selection / Creation</h1>
      <p>TBD: list existing characters and create new ones.</p>
      <Link to="/login">Log out</Link>
    </div>
  )
}

const container: React.CSSProperties = { display: 'grid', placeItems: 'center', height: '100vh', gap: 8, fontFamily: 'system-ui, sans-serif' }

