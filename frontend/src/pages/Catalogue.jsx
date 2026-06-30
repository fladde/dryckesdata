import { useState, useEffect } from "react"
import axios from "axios"

const API = "http://127.0.0.1:8000"

export default function Catalogue() {
  const [results, setResults] = useState([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [varugrupp, setVarugrupp] = useState("")
  const [land, setLand] = useState("")
  const [year, setYear] = useState("")
  const [page, setPage] = useState(1)
  const [categories, setCategories] = useState([])
  const [countries, setCountries] = useState([])
  const [years, setYears] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    axios.get(`${API}/filters/categories`).then(r => setCategories(r.data))
    axios.get(`${API}/filters/countries`).then(r => setCountries(r.data))
    axios.get(`${API}/filters/years`).then(r => setYears(r.data))
  }, [])

  useEffect(() => { fetchProducts() }, [search, varugrupp, land, year, page])

  function fetchProducts() {
    setLoading(true)
    const params = { page, limit: 50 }
    if (search) params.search = search
    if (varugrupp) params.varugrupp = varugrupp
    if (land) params.land = land
    if (year) params.year = year
    axios.get(`${API}/products`, { params }).then(r => {
      setResults(r.data.results)
      setTotal(r.data.total)
      setLoading(false)
    })
  }

  function selectProduct(artnr) {
    axios.get(`${API}/products/${artnr}`).then(r => setSelected(r.data))
  }

  const cardStyle = { background: "#fff", borderRadius: "10px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }
  const inputStyle = { padding: "10px 14px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", width: "100%" }
  const labelStyle = { fontSize: "12px", fontWeight: "600", color: "#666", marginBottom: "4px", display: "block" }

  return (
    <div>
      {/* Filters */}
      <div style={{ ...cardStyle, marginBottom: "24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "16px" }}>
          <div>
            <label style={labelStyle}>Search</label>
            <input style={inputStyle} placeholder="Product name or producer..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <select style={inputStyle} value={varugrupp} onChange={e => { setVarugrupp(e.target.value); setPage(1) }}>
              <option value="">All categories</option>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Country</label>
            <select style={inputStyle} value={land} onChange={e => { setLand(e.target.value); setPage(1) }}>
              <option value="">All countries</option>
              {countries.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Year</label>
            <select style={inputStyle} value={year} onChange={e => { setYear(e.target.value); setPage(1) }}>
              <option value="">All years</option>
              {years.map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 380px" : "1fr", gap: "24px" }}>
        {/* Results table */}
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span style={{ fontWeight: "700", fontSize: "16px" }}>{loading ? "Loading..." : `${total.toLocaleString()} products`}</span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: "6px 14px", borderRadius: "6px", border: "1px solid #ddd", cursor: "pointer", background: "#fff" }}>← Prev</button>
              <span style={{ padding: "6px 14px", fontSize: "14px" }}>Page {page}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page * 50 >= total}
                style={{ padding: "6px 14px", borderRadius: "6px", border: "1px solid #ddd", cursor: "pointer", background: "#fff" }}>Next →</button>
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #eee", textAlign: "left" }}>
                {["Product", "Producer", "Category", "Country", "Vol ml", "Price", "Sales (L)"].map(h =>
                  <th key={h} style={{ padding: "10px 12px", color: "#666", fontWeight: "600" }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {results.map(r => (
                <tr key={r.artnr} onClick={() => selectProduct(r.artnr)}
                  style={{ borderBottom: "1px solid #f0f0f0", cursor: "pointer", background: selected?.artnr === r.artnr ? "#fff8ec" : "transparent" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                  onMouseLeave={e => e.currentTarget.style.background = selected?.artnr === r.artnr ? "#fff8ec" : "transparent"}>
                  <td style={{ padding: "10px 12px", fontWeight: "500", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.namn}</td>
                  <td style={{ padding: "10px 12px", color: "#555" }}>{r.producentnamn}</td>
                  <td style={{ padding: "10px 12px" }}><span style={{ background: "#f0f0f0", borderRadius: "4px", padding: "2px 8px", fontSize: "12px" }}>{r.varugrupp}</span></td>
                  <td style={{ padding: "10px 12px", color: "#555" }}>{r.land}</td>
                  <td style={{ padding: "10px 12px", color: "#555" }}>{r.volym_ml}</td>
                  <td style={{ padding: "10px 12px", fontWeight: "500" }}>{r.pris ? `${r.pris} kr` : "—"}</td>
                  <td style={{ padding: "10px 12px", color: "#555" }}>{r.forsaljning_liter ? r.forsaljning_liter.toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Product detail drawer */}
        {selected && (
          <div style={{ ...cardStyle, position: "sticky", top: "24px", alignSelf: "start" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <span style={{ fontWeight: "700", fontSize: "16px" }}>Product Detail</span>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#999" }}>✕</button>
            </div>
            <h3 style={{ margin: "0 0 4px", fontSize: "15px" }}>{selected.namn}</h3>
            <p style={{ margin: "0 0 16px", color: "#888", fontSize: "13px" }}>{selected.producentnamn}</p>
            {[
              ["Category", selected.varugrupp],
              ["Subcategory", selected.varugrupp_detalj],
              ["Country", selected.land],
              ["Region", selected.region],
              ["Origin", selected.ursprung],
              ["Volume", selected.volym_ml ? `${selected.volym_ml} ml` : null],
              ["Packaging", selected.buteljtyp],
              ["Organic", selected.ekologisk || "No"],
              ["Ethical", selected.etiskt || "No"],
            ].map(([label, value]) => value ? (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f5f5f5", fontSize: "14px" }}>
                <span style={{ color: "#888" }}>{label}</span>
                <span style={{ fontWeight: "500" }}>{value}</span>
              </div>
            ) : null)}
            <div style={{ marginTop: "20px" }}>
              <p style={{ fontWeight: "600", fontSize: "13px", marginBottom: "10px", color: "#666" }}>SALES HISTORY</p>
              {selected.history?.map(h => (
                <div key={h.year} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", fontSize: "13px" }}>
                  <span style={{ color: "#888" }}>{h.year}</span>
                  <span>{h.pris ? `${h.pris} kr` : "—"}</span>
                  <span style={{ fontWeight: "500" }}>{h.forsaljning_liter ? `${h.forsaljning_liter.toLocaleString()} L` : "—"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
