import { useState, useEffect } from "react"
import axios from "axios"
import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

const API = "https://web-production-c4a6cc.up.railway.app"
const COLORS = ["#d4a857", "#6f9ed1", "#7fb89a", "#d98a8a", "#a888c9", "#e0b768"]

export default function Analytics() {
  const [salesByYear, setSalesByYear] = useState([])
  const [categoryTrends, setCategoryTrends] = useState({ data: [], cats: [] })
  const [topCountries, setTopCountries] = useState([])
  const [organicTrend, setOrganicTrend] = useState([])
  const [priceByCategory, setPriceByCategory] = useState([])
  const [categoryShare, setCategoryShare] = useState([])

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

      // pie: latest year share by category
      const latestYear = Math.max(...years)
      const latest = r.data.filter(d => d.year === latestYear)
      setCategoryShare(latest.map(d => ({ name: d.varugrupp, value: Math.round(d.total_liter / 1_000_000) })))
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

  return (
    <div className="analytics-grid">

      <div className="card full">
        <p className="chart-card-title">Total sales volume by year (million litres)</p>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={salesByYear.map(d => ({ ...d, total_liter: Math.round(d.total_liter / 1_000_000) }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ece6e8" />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={v => `${v}M L`} />
            <Area type="monotone" dataKey="total_liter" stroke="#d4a857" fill="#f3e4c5" strokeWidth={2} name="Million litres" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <p className="chart-card-title">Sales by category over time (million litres)</p>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={categoryTrends.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ece6e8" />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            {categoryTrends.cats.map((cat, i) => (
              <Area key={cat} type="monotone" dataKey={cat} stackId="1" stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.6} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <p className="chart-card-title">Category share, latest year</p>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={categoryShare} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} label={({ name }) => name}>
              {categoryShare.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={v => `${v}M L`} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <p className="chart-card-title">Top 10 countries by sales volume</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={topCountries.map(d => ({ ...d, total_liter: Math.round(d.total_liter / 1_000_000) }))} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#ece6e8" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis dataKey="land" type="category" width={90} tick={{ fontSize: 12 }} />
            <Tooltip formatter={v => `${v}M L`} />
            <Bar dataKey="total_liter" fill="#6f9ed1" name="Million litres" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <p className="chart-card-title">Organic products — share of total sales (%)</p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={organicTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ece6e8" />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis unit="%" tick={{ fontSize: 12 }} />
            <Tooltip formatter={v => `${v}%`} />
            <Line type="monotone" dataKey="organic_pct" stroke="#7fb89a" strokeWidth={2} dot={{ r: 4 }} name="Organic %" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card full">
        <p className="chart-card-title">Average price by category (SEK)</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={priceByCategory}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ece6e8" />
            <XAxis dataKey="varugrupp" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={v => `${v} kr`} />
            <Bar dataKey="avg_price" fill="#a888c9" name="Avg price" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  )
}
