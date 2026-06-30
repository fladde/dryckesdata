import { useState, useEffect } from "react"
import Catalogue from "./pages/Catalogue"
import Analytics from "./pages/Analytics"
import "./App.css"

const SITE_PASSWORD = "changeme123"  // 👈 keep your existing password here

const NAV_ITEMS = [
  { key: "catalogue", label: "Catalogue", icon: "🍷" },
  { key: "analytics", label: "Analytics", icon: "📊" },
]

export default function App() {
  const [page, setPage] = useState("catalogue")
  const [unlocked, setUnlocked] = useState(false)
  const [input, setInput] = useState("")
  const [error, setError] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem("unlocked") === "true") setUnlocked(true)
  }, [])

  function handleUnlock(e) {
    e.preventDefault()
    if (input === SITE_PASSWORD) {
      sessionStorage.setItem("unlocked", "true")
      setUnlocked(true)
      setError(false)
    } else {
      setError(true)
    }
  }

  if (!unlocked) {
    return (
      <div className="lock-screen">
        <form onSubmit={handleUnlock} className="lock-card">
          <div className="lock-emoji">🍷</div>
          <h2>DryckesData</h2>
          <input
            type="password"
            placeholder="Enter password"
            value={input}
            onChange={e => setInput(e.target.value)}
            className={error ? "lock-input error" : "lock-input"}
            autoFocus
          />
          {error && <p className="lock-error">Wrong password, try again</p>}
          <button type="submit" className="lock-button">Unlock</button>
        </form>
      </div>
    )
  }

  return (
    <div className="app-shell">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <span className="brand-mark">🍷</span>
          <span className="brand-name">DryckesData</span>
        </div>

        <div className="sidebar-section-label">Main menu</div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              className={`sidebar-link ${page === item.key ? "active" : ""}`}
              onClick={() => { setPage(item.key); setSidebarOpen(false) }}
            >
              <span className="sidebar-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-source">
            <span className="source-dot" />
            Systembolaget data, 2009–2025
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open menu">☰</button>
          <h1 className="topbar-title">{page === "catalogue" ? "Catalogue" : "Analytics"}</h1>
        </header>
        <main className="content">
          {page === "catalogue" ? <Catalogue /> : <Analytics />}
        </main>
      </div>
    </div>
  )
}
