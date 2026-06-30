import { useState, useEffect } from "react"
import axios from "axios"
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

const API = "http://127.0.0.1:8000"
const COLORS = ["#e8c97e", "#7eb8e8", "#7ee8a2", "#e87e7e", "#c97ee8", "#7ee8e8"]

export default function Analytics() {
  const [salesByYear, setSalesByYear] = useState([])
  const [categoryTrends, setCategoryTrends] = useState([])
  const [topCountries, setTopCountries] = useState([])
  const [organicTrend, setOrganicTrend] = useState([])
  const [priceByCategory, setPriceByCategory] = useState([])

  useEffect(() => {
    axios.get(`${API}/analytics/sales-by-year`).then(r => setSalesByYear(r.data))
    axios.get(`${API}/analytics/category-trends`).then(r => {
      const years = [...new Set(r.data.map(d => d.year))]
      const cats = [...new Set(r.data.map(d => d.varugrupp))]
      const pivoted = years.map(year => {
        const row = { year }
        cats.forEach(cat => {
          const match = r.data.find(d => d.year === year && d.varugrupp === cat)
          row[cat] = match ? Math.round(match.total_liter / 1_000_000) : 0
        })
        return row
      })
      setCategoryTrends({ data: pivoted, cats })
    })
    axios.get(`${API}/analytics/top-countries`).then(r => setTopCountries(r.data))
    axios.get(`${API}/analytics/organic-trend`).then(r => {
      setOrganicTrend(r.data.map(d => ({
        year: d.year,
        organic_pct: d.total_liter > 0 ? +((d.organic_liter / d.total_liter) * 100).toFixed(1) : 0
      })))
    })
    axios.get(`${API}/analytics/price-by-category`).then(r => setPriceByCategory(r.data))
  }, [])

  const cardStyle = { background: "#fff", borderRadius: "10px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }
  const titleStyle = { fontWeight: "700", fontSize: "15px", marginBottom: "20px", color: "#1a1a2e" }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>

      {/* Total sales by year */}
      <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
        <p style={titleStyle}>Total Sales Volume by Year (million litres)</p>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={salesByYear.map(d => ({ ...d, total_liter: Math.round(d.total_liter / 1_000_000) }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="year" />
            <YAxis />
            <Tooltip formatter={v => `${v}M L`} />
            <Area type="monotone" dataKey="total_liter" stroke="#e8c97e" fill="#fff8ec" strokeWidth={2} name="Million litres" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Category trends */}
      <div style={cardStyle}>
        <p style={titleStyle}>Sales by Category Over Time (million litres)</p>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={categoryTrends.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="year" />
            <YAxis />
            <Tooltip />
            <Legend />
            {categoryTrends.cats?.map((cat, i) => (
              <Area key={cat} type="monotone" dataKey={cat} stackId="1" stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.6} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Top countries */}
      <div style={cardStyle}>
        <p style={titleStyle}>Top 10 Countries by Sales Volume</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={topCountries.map(d => ({ ...d, total_liter: Math.round(d.total_liter / 1_000_000) }))} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" />
            <YAxis dataKey="land" type="category" width={90} tick={{ fontSize: 12 }} />
            <Tooltip formatter={v => `${v}M L`} />
            <Bar dataKey="total_liter" fill="#7eb8e8" name="Million litres" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Organic trend */}
      <div style={cardStyle}>
        <p style={titleStyle}>Organic Products — Share of Total Sales (%)</p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={organicTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="year" />
            <YAxis unit="%" />
            <Tooltip formatter={v => `${v}%`} />
            <Line type="monotone" dataKey="organic_pct" stroke="#7ee8a2" strokeWidth={2} dot={{ r: 4 }} name="Organic %" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Price by category */}
      <div style={cardStyle}>
        <p style={titleStyle}>Average Price by Category (SEK)</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={priceByCategory}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="varugrupp" tick={{ fontSize: 11 }} />
            <YAxis />
            <Tooltip formatter={v => `${v} kr`} />
            <Bar dataKey="avg_price" fill="#c97ee8" name="Avg price" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  )
}
