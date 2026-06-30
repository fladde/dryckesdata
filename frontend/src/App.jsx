import { useState } from "react"
import Catalogue from "./pages/Catalogue"
import Analytics from "./pages/Analytics"
import "./App.css"

export default function App() {
  const [page, setPage] = useState("catalogue")

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
