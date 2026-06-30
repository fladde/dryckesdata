from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
from typing import Optional

app = FastAPI(title="Systembolaget API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "systembolaget.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.get("/products")
def search_products(
    search: Optional[str] = None,
    varugrupp: Optional[str] = None,
    land: Optional[str] = None,
    year: Optional[int] = None,
    page: int = 1,
    limit: int = 50,
):
    conn = get_db()
    conditions = []
    params = []
    if search:
        conditions.append("(p.namn LIKE ? OR p.producentnamn LIKE ?)")
        params += [f"%{search}%", f"%{search}%"]
    if varugrupp:
        conditions.append("p.varugrupp = ?")
        params.append(varugrupp)
    if land:
        conditions.append("p.land = ?")
        params.append(land)
    if year:
        conditions.append("s.year = ?")
        params.append(year)
    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    offset = (page - 1) * limit
    query = f"""
        SELECT p.artnr, p.namn, p.producentnamn, p.varugrupp,
               p.varugrupp_detalj, p.land, p.region, p.volym_ml,
               p.buteljtyp, p.ursprung,
               s.pris, s.year, s.ekologisk, s.etiskt,
               s.forsaljning_liter
        FROM products p
        LEFT JOIN (
            SELECT artnr, MAX(year) as year, pris, ekologisk, etiskt, forsaljning_liter
            FROM sales GROUP BY artnr
        ) s ON p.artnr = s.artnr
        {where}
        ORDER BY COALESCE(s.forsaljning_liter, 0) DESC
        LIMIT ? OFFSET ?
    """
    params += [limit, offset]
    rows = conn.execute(query, params).fetchall()
    count_query = f"""
        SELECT COUNT(*) FROM products p
        LEFT JOIN (
            SELECT artnr, MAX(year) as year, pris, ekologisk, etiskt, forsaljning_liter
            FROM sales GROUP BY artnr
        ) s ON p.artnr = s.artnr
        {where}
    """
    total = conn.execute(count_query, params[:-2]).fetchone()[0]
    conn.close()
    return {"total": total, "page": page, "limit": limit, "results": [dict(r) for r in rows]}

@app.get("/products/{artnr}")
def get_product(artnr: int):
    conn = get_db()
    product = conn.execute("SELECT * FROM products WHERE artnr = ?", [artnr]).fetchone()
    if not product:
        return {"error": "Product not found"}
    history = conn.execute(
        "SELECT year, pris, forsaljning_liter, ekologisk, etiskt FROM sales WHERE artnr = ? ORDER BY year",
        [artnr]
    ).fetchall()
    conn.close()
    return {**dict(product), "history": [dict(r) for r in history]}

@app.get("/filters/categories")
def get_categories():
    conn = get_db()
    rows = conn.execute("SELECT DISTINCT varugrupp FROM products WHERE varugrupp IS NOT NULL ORDER BY varugrupp").fetchall()
    conn.close()
    return [r["varugrupp"] for r in rows]

@app.get("/filters/countries")
def get_countries():
    conn = get_db()
    rows = conn.execute("""
        SELECT p.land, SUM(s.forsaljning_liter) as total
        FROM products p JOIN sales s ON p.artnr = s.artnr
        WHERE p.land IS NOT NULL
        GROUP BY p.land ORDER BY total DESC
    """).fetchall()
    conn.close()
    return [r["land"] for r in rows]

@app.get("/filters/years")
def get_years():
    conn = get_db()
    rows = conn.execute("SELECT DISTINCT year FROM sales ORDER BY year DESC").fetchall()
    conn.close()
    return [r["year"] for r in rows]

@app.get("/analytics/sales-by-year")
def sales_by_year():
    conn = get_db()
    rows = conn.execute("SELECT year, SUM(forsaljning_liter) as total_liter FROM sales GROUP BY year ORDER BY year").fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/analytics/category-trends")
def category_trends():
    conn = get_db()
    rows = conn.execute("""
        SELECT s.year, p.varugrupp, SUM(s.forsaljning_liter) as total_liter
        FROM sales s JOIN products p ON s.artnr = p.artnr
        WHERE p.varugrupp IS NOT NULL
        GROUP BY s.year, p.varugrupp ORDER BY s.year
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/analytics/top-countries")
def top_countries(year: Optional[int] = None, limit: int = 10):
    conn = get_db()
    params = []
    year_filter = ""
    if year:
        year_filter = "AND s.year = ?"
        params.append(year)
    rows = conn.execute(f"""
        SELECT p.land, SUM(s.forsaljning_liter) as total_liter
        FROM sales s JOIN products p ON s.artnr = p.artnr
        WHERE p.land IS NOT NULL {year_filter}
        GROUP BY p.land ORDER BY total_liter DESC LIMIT ?
    """, params + [limit]).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/analytics/organic-trend")
def organic_trend():
    conn = get_db()
    rows = conn.execute("""
        SELECT year,
               SUM(CASE WHEN ekologisk IS NOT NULL AND ekologisk != '' THEN forsaljning_liter ELSE 0 END) as organic_liter,
               SUM(forsaljning_liter) as total_liter
        FROM sales GROUP BY year ORDER BY year
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/analytics/price-by-category")
def price_by_category(year: Optional[int] = None):
    conn = get_db()
    params = []
    year_filter = ""
    if year:
        year_filter = "AND s.year = ?"
        params.append(year)
    rows = conn.execute(f"""
        SELECT p.varugrupp,
               ROUND(AVG(s.pris), 2) as avg_price,
               ROUND(MIN(s.pris), 2) as min_price,
               ROUND(MAX(s.pris), 2) as max_price
        FROM sales s JOIN products p ON s.artnr = p.artnr
        WHERE p.varugrupp IS NOT NULL AND s.pris IS NOT NULL {year_filter}
        GROUP BY p.varugrupp ORDER BY avg_price DESC
    """, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]
