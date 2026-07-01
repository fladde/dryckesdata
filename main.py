from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
from typing import Optional
import os

app = FastAPI(title="Systembolaget API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres.kargildrfpsctsmwokgm:wR6e6IJAPC1kXJH0@aws-1-eu-north-1.pooler.supabase.com:6543/postgres"
)
engine = create_engine(DATABASE_URL, pool_pre_ping=True)


def run(query, params={}):
    with engine.connect() as conn:
        result = conn.execute(text(query), params)
        return result.mappings().all()


def run_count(query, params={}):
    with engine.connect() as conn:
        result = conn.execute(text(query), params)
        return result.scalar()


@app.get("/products")
def search_products(
    search: Optional[str] = None,
    varugrupp: Optional[str] = None,
    land: Optional[str] = None,
    year: Optional[int] = None,
    ekologisk: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
):
    conditions = []
    params = {}

    if search:
        conditions.append("(p.namn ILIKE :search OR p.producentnamn ILIKE :search)")
        params["search"] = f"%{search}%"
    if varugrupp:
        conditions.append("p.varugrupp = :varugrupp")
        params["varugrupp"] = varugrupp
    if land:
        conditions.append("p.land = :land")
        params["land"] = land
    if ekologisk:
        conditions.append("s.ekologisk = :ekologisk")
        params["ekologisk"] = ekologisk
    if year:
        conditions.append("s.year = :year")
        params["year"] = year

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    year_join = """LEFT JOIN (
        SELECT DISTINCT ON (artnr) artnr, year, pris, ekologisk, etiskt, forsaljning_liter
        FROM sales ORDER BY artnr, year DESC
    ) s ON p.artnr = s.artnr"""

    offset = (page - 1) * limit
    params["limit"] = limit
    params["offset"] = offset

    query = f"""
        SELECT p.artnr, p.namn, p.producentnamn, p.varugrupp,
               p.varugrupp_detalj, p.land, p.region, p.volym_ml,
               p.buteljtyp, p.ursprung,
               s.pris, s.year, s.ekologisk, s.etiskt, s.forsaljning_liter
        FROM products p
        {year_join}
        {where}
        ORDER BY COALESCE(s.forsaljning_liter, 0) DESC
        LIMIT :limit OFFSET :offset
    """

    count_params = {k: v for k, v in params.items() if k not in ("limit", "offset")}
    count_query = f"SELECT COUNT(*) FROM products p {year_join} {where}"

    rows = run(query, params)
    total = run_count(count_query, count_params)

    return {"total": total, "page": page, "limit": limit, "results": [dict(r) for r in rows]}


@app.get("/products/{artnr}")
def get_product(artnr: int):
    rows = run("SELECT * FROM products WHERE artnr = :artnr", {"artnr": artnr})
    if not rows:
        return {"error": "Product not found"}
    history = run(
        "SELECT year, pris, forsaljning_liter, ekologisk, etiskt FROM sales WHERE artnr = :artnr ORDER BY year",
        {"artnr": artnr}
    )
    return {**dict(rows[0]), "history": [dict(r) for r in history]}


@app.get("/filters/categories")
def get_categories():
    rows = run("SELECT DISTINCT varugrupp FROM products WHERE varugrupp IS NOT NULL ORDER BY varugrupp")
    return [r["varugrupp"] for r in rows]


@app.get("/filters/countries")
def get_countries():
    rows = run("""
        SELECT p.land, SUM(s.forsaljning_liter) as total
        FROM products p JOIN sales s ON p.artnr = s.artnr
        WHERE p.land IS NOT NULL
        GROUP BY p.land ORDER BY total DESC
    """)
    return [r["land"] for r in rows]


@app.get("/filters/years")
def get_years():
    rows = run("SELECT DISTINCT year FROM sales ORDER BY year DESC")
    return [r["year"] for r in rows]


@app.get("/analytics/sales-by-year")
def sales_by_year():
    rows = run("SELECT year, SUM(forsaljning_liter) as total_liter FROM sales GROUP BY year ORDER BY year")
    return [dict(r) for r in rows]


@app.get("/analytics/category-trends")
def category_trends():
    rows = run("""
        SELECT s.year, p.varugrupp, SUM(s.forsaljning_liter) as total_liter
        FROM sales s JOIN products p ON s.artnr = p.artnr
        WHERE p.varugrupp IS NOT NULL
        GROUP BY s.year, p.varugrupp ORDER BY s.year
    """)
    return [dict(r) for r in rows]


@app.get("/analytics/top-countries")
def top_countries(year: Optional[int] = None, limit: int = 10):
    params = {"limit": limit}
    year_filter = ""
    if year:
        year_filter = "AND s.year = :year"
        params["year"] = year
    rows = run(f"""
        SELECT p.land, SUM(s.forsaljning_liter) as total_liter
        FROM sales s JOIN products p ON s.artnr = p.artnr
        WHERE p.land IS NOT NULL {year_filter}
        GROUP BY p.land ORDER BY total_liter DESC LIMIT :limit
    """, params)
    return [dict(r) for r in rows]


@app.get("/analytics/organic-trend")
def organic_trend():
    rows = run("""
        SELECT year,
               SUM(CASE WHEN ekologisk IS NOT NULL AND ekologisk != '' THEN forsaljning_liter ELSE 0 END) as organic_liter,
               SUM(forsaljning_liter) as total_liter
        FROM sales GROUP BY year ORDER BY year
    """)
    return [dict(r) for r in rows]


@app.get("/analytics/price-by-category")
def price_by_category(year: Optional[int] = None):
    params = {}
    year_filter = ""
    if year:
        year_filter = "AND s.year = :year"
        params["year"] = year
    rows = run(f"""
        SELECT p.varugrupp,
               ROUND(AVG(s.pris)::numeric, 2) as avg_price,
               ROUND(MIN(s.pris)::numeric, 2) as min_price,
               ROUND(MAX(s.pris)::numeric, 2) as max_price
        FROM sales s JOIN products p ON s.artnr = p.artnr
        WHERE p.varugrupp IS NOT NULL AND s.pris IS NOT NULL {year_filter}
        GROUP BY p.varugrupp ORDER BY avg_price DESC
    """, params)
    return [dict(r) for r in rows]
