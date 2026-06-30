import { useState, useEffect } from "react"
import Catalogue from "./pages/Catalogue"
import Analytics from "./pages/Analytics"
import "./App.css"

const SITE_PASSWORD = "Karamell1234!"  // 👈 change this to your own password

export default function App() {
  const [page, setPage] = useState("catalogue")
  const [unlocked, setUnlocked] = useState(false)
  const [input, setInput] = useState("")
  const [error, setError] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem("unlocked") === "true") {
      setUnlocked(true)
    }
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
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#1a1a2e", fontFamily: "system-ui, sans-serif"
      }}>
        <form onSubmit={handleUnlock} style={{
          background: "#fff", padding: "40px", borderRadius: "12px", width: "320px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)", textAlign: "center"
        }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>🍷</div>
          <h2 style={{ margin: "0 0 20px", color: "#1a1a2e" }}>DryckesData</h2>
          <input
            type="password"
            placeholder="Enter password"
            value={input}
            onChange={e => setInput(e.target.value)}
            style={{
              width: "100%", padding: "12px", borderRadius: "8px",
              border: error ? "2px solid #e87e7e" : "1px solid #ddd",
              marginBottom: "12px", fontSize: "14px", boxSizing: "border-box"
            }}
          />
          {error && <p style={{ color: "#e87e7e", fontSize: "13px", margin: "0 0 12px" }}>Wrong password, try again</p>}
          <button type="submit" style={{
            width: "100%", padding: "12px", borderRadius: "8px", border: "none",
            background: "#e8c97e", color: "#1a1a2e", fontWeight: "700", cursor: "pointer", fontSize: "14px"
          }}>
            Unlock
          </button>
        </form>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", background: "#f9f7f4" }}>
      <nav style={{ background: "#1a1a2e", padding: "16px 32px", display: "flex", alignItems: "center", gap: "32px" }}>
        <span style={{ color: "#e8c97e", fontWeight: "700", fontSize: "20px" }}>🍷 DryckesData</span>
        <button onClick={() => setPage("catalogue")}
          style={{ background: page === "catalogue" ? "#e8c97e" : "transparent", color: page === "catalogue" ? "#1a1a2e" : "#fff", border: "1px solid #e8c97e", borderRadius: "6px", padding: "8px 20px", cursor: "pointer", fontWeight: "600" }}>
          Catalogue
        </button>
        <button onClick={() => setPage("analytics")}
          style={{ background: page === "analytics" ? "#e8c97e" : "transparent", color: page === "analytics" ? "#1a1a2e" : "#fff", border: "1px solid #e8c97e", borderRadius: "6px", padding: "8px 20px", cursor: "pointer", fontWeight: "600" }}>
          Analytics
        </button>
      </nav>
      <main style={{ padding: "32px" }}>
        {page === "catalogue" ? <Catalogue /> : <Analytics />}
      </main>
    </div>
  )
}
