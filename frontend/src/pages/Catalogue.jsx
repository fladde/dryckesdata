import { useState, useEffect } from "react"
import axios from "axios"

const API = "https://web-production-c4a6cc.up.railway.app"

export default function Catalogue() {
  const [results, setResults] = useState([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState(null)

  const [search, setSearch] = useState("")
  const [varugrupp, setVarugrupp] = useState("")
  const [land, setLand] = useState("")
  const [year, setYear] = useState("")
  const [buteljtyp, setButeljtyp] = useState("")
  const [ekologisk, setEkologisk] = useState("")
  const [priceMax, setPriceMax] = useState("")

  const [page, setPage] = useState(1)
  const [categories, setCategories] = useState([])
  const [countries, setCountries] = useState([])
  const [years, setYears] = useState([])
  const [packagings, setPackagings] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    axios.get(`${API}/filters/categories`).then(r => setCategories(r.data))
    axios.get(`${API}/filters/countries`).then(r => setCountries(r.data))
    axios.get(`${API}/filters/years`).then(r => setYears(r.data))
    // packaging types aren't a dedicated endpoint yet — derive from a broad product fetch
    axios.get(`${API}/products`, { params: { limit: 1 } }).catch(() => {})
  }, [])

  useEffect(() => { fetchProducts() }, [search, varugrupp, land, year, buteljtyp, ekologisk, priceMax, page])

  function fetchProducts() {
    setLoading(true)
    const params = { page, limit: 50 }
    if (search) params.search = search
    if (varugrupp) params.varugrupp = varugrupp
    if (land) params.land = land
    if (year) params.year = year
    if (ekologisk) params.ekologisk = ekologisk
    axios.get(`${API}/products`, { params }).then(r => {
      let rows = r.data.results
      // client-side filters for fields the API doesn't support natively yet
      if (buteljtyp) rows = rows.filter(p => p.buteljtyp === buteljtyp)
      if (priceMax) rows = rows.filter(p => p.pris != null && p.pris <= Number(priceMax))
      setResults(rows)
      setTotal(r.data.total)
      setLoading(false)

      // quick stats from current page (illustrative, not a full aggregate query)
      const prices = rows.map(p => p.pris).filter(Boolean)
      const avgPrice = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null
      setStats({
        total: r.data.total,
        avgPrice,
        countries: new Set(rows.map(p => p.land).filter(Boolean)).size,
        categories: new Set(rows.map(p => p.varugrupp).filter(Boolean)).size,
      })

      const types = [...new Set(r.data.results.map(p => p.buteljtyp).filter(Boolean))]
      setPackagings(prev => [...new Set([...prev, ...types])].sort())
    })
  }

  function selectProduct(artnr) {
    axios.get(`${API}/products/${artnr}`).then(r => setSelected(r.data))
  }

  function resetFilters() {
    setSearch(""); setVarugrupp(""); setLand(""); setYear("")
    setButeljtyp(""); setEkologisk(""); setPriceMax(""); setPage(1)
  }

  return (
    <div>
      {/* Stat cards */}
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-label">Matching products</div>
          <div className="stat-value">{total.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg price (this page)</div>
          <div className="stat-value">{stats?.avgPrice ? `${stats.avgPrice} kr` : "—"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Countries (this page)</div>
          <div className="stat-value">{stats?.countries ?? "—"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Categories (this page)</div>
          <div className="stat-value">{stats?.categories ?? "—"}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="filter-grid">
          <div>
            <label className="field-label">Search</label>
            <input className="field-input" placeholder="Product name or producer..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <div>
            <label className="field-label">Category</label>
            <select className="field-select" value={varugrupp} onChange={e => { setVarugrupp(e.target.value); setPage(1) }}>
              <option value="">All</option>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Country</label>
            <select className="field-select" value={land} onChange={e => { setLand(e.target.value); setPage(1) }}>
              <option value="">All</option>
              {countries.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Year</label>
            <select className="field-select" value={year} onChange={e => { setYear(e.target.value); setPage(1) }}>
              <option value="">All</option>
              {years.map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Packaging</label>
            <select className="field-select" value={buteljtyp} onChange={e => { setButeljtyp(e.target.value); setPage(1) }}>
              <option value="">All</option>
              {packagings.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Organic / Ethical</label>
            <select className="field-select" value={ekologisk} onChange={e => { setEkologisk(e.target.value); setPage(1) }}>
              <option value="">All</option>
              <option value="Ekologiskt">Organic only</option>
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-end" }}>
          <div style={{ width: 220 }}>
            <label className="field-label">Max price (kr)</label>
            <input type="number" className="field-input" placeholder="e.g. 150"
              value={priceMax} onChange={e => { setPriceMax(e.target.value); setPage(1) }} />
          </div>
          <button onClick={resetFilters}
            style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid #ece6e8", background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#837a8a" }}>
            Reset filters
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 360px" : "1fr", gap: 24 }}>
        {/* Results table */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{loading ? "Loading..." : `${total.toLocaleString()} products`}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={navBtn}>← Prev</button>
              <span style={{ padding: "6px 10px", fontSize: 13, color: "#837a8a" }}>Page {page}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page * 50 >= total}
                style={navBtn}>Next →</button>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  {["Product", "Producer", "Category", "Country", "Vol ml", "Price", "Sales (L)"].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.artnr} onClick={() => selectProduct(r.artnr)} className={selected?.artnr === r.artnr ? "selected" : ""}>
                    <td style={{ fontWeight: 500, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.namn}</td>
                    <td style={{ color: "#555" }}>{r.producentnamn}</td>
                    <td><span className="pill">{r.varugrupp}</span></td>
                    <td style={{ color: "#555" }}>{r.land}</td>
                    <td style={{ color: "#555" }}>{r.volym_ml}</td>
                    <td style={{ fontWeight: 500 }}>{r.pris ? `${r.pris} kr` : "—"}</td>
                    <td style={{ color: "#555" }}>{r.forsaljning_liter ? r.forsaljning_liter.toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Product detail drawer */}
        {selected && (
          <div className="card" style={{ position: "sticky", top: 24, alignSelf: "start" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Product detail</span>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#999" }}>✕</button>
            </div>
            <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>{selected.namn}</h3>
            <p style={{ margin: "0 0 16px", color: "#888", fontSize: 13 }}>{selected.producentnamn}</p>
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
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f5f5f5", fontSize: 14 }}>
                <span style={{ color: "#888" }}>{label}</span>
                <span style={{ fontWeight: 500 }}>{value}</span>
              </div>
            ) : null)}
            <div style={{ marginTop: 20 }}>
              <p style={{ fontWeight: 600, fontSize: 12, marginBottom: 10, color: "#837a8a", textTransform: "uppercase", letterSpacing: "0.04em" }}>Sales history</p>
              {selected.history?.map(h => (
                <div key={h.year} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", fontSize: 13 }}>
                  <span style={{ color: "#888" }}>{h.year}</span>
                  <span>{h.pris ? `${h.pris} kr` : "—"}</span>
                  <span style={{ fontWeight: 500 }}>{h.forsaljning_liter ? `${h.forsaljning_liter.toLocaleString()} L` : "—"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const navBtn = {
  padding: "6px 14px", borderRadius: 8, border: "1px solid #ece6e8",
  cursor: "pointer", background: "#fff", fontSize: 13,
}
