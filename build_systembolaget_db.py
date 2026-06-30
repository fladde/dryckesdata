"""
Systembolaget ETL — Excel → SQLite
Reads all 14 annual sheets + quarterly summary, normalises columns,
and loads into a clean 3-table SQLite database.
"""

import sqlite3
import pandas as pd
from pathlib import Path

EXCEL_PATH = "/mnt/user-data/uploads/systembolaget_data_alla_artiklar_2009-2021.xlsx"
DB_PATH = "/mnt/user-data/outputs/systembolaget.db"

YEARS = list(range(2009, 2023))

# ------------------------------------------------------------------
# Column renaming maps — normalise the messy naming across years
# ------------------------------------------------------------------
RENAME = {
    # article number
    "Artnr": "artnr",
    # receipt / short name (not in 2009-2012)
    "Kvittonamn": "kvittonamn",
    # full name
    "Namn": "namn",
    # brand (only 2009-2012; same as name usually)
    "Märke": "marke",
    # producer
    "Producentnamn": "producentnamn",
    # main category
    "Varugrupp_huvud": "varugrupp",
    "Varugrupp_huvud ": "varugrupp",   # trailing space in 2013
    "Varugrupp": "varugrupp",
    # sub-category
    "Varugrupp_detalj": "varugrupp_detalj",
    "Varugrupp detalj": "varugrupp_detalj",
    # style label
    "Rubrik": "rubrik",
    # price
    "Aktuellt pris": "pris",
    "AktuelltPris": "pris",
    # volume ml
    "Volym ml": "volym_ml",
    "VolymImml": "volym_ml",
    "Volym i ml": "volym_ml",
    # packaging
    "Förpackning": "buteljtyp",
    "Buteljtypid": "buteljtyp",
    "Buteljtyp": "buteljtyp",
    # origin
    "Land": "land",
    "Region": "region",
    "Ursprungsbeteckning": "ursprung",
    "Ursprung": "ursprung",
    # flags
    "Ekologisk": "ekologisk",
    "Etiskt": "etiskt",
    # sales
    "Försäljning i liter helår": "forsaljning_liter",
    "Försäljning i liter": "forsaljning_liter",
    # article id (internal Systembolaget id, differs from artnr)
    "Artikelid": "artikel_id",
    "Artikel ID": "artikel_id",
}

SALES_COLS   = ["artnr", "year", "pris", "forsaljning_liter", "ekologisk", "etiskt"]
PRODUCT_COLS = ["artnr", "namn", "kvittonamn", "marke", "producentnamn",
                "varugrupp", "varugrupp_detalj", "rubrik",
                "volym_ml", "buteljtyp", "land", "region", "ursprung"]


def load_year(sheet: str) -> pd.DataFrame:
    df = pd.read_excel(EXCEL_PATH, sheet_name=sheet)
    df = df.rename(columns=RENAME)
    df["year"] = int(sheet)
    # ensure all expected cols exist
    for col in PRODUCT_COLS + ["forsaljning_liter", "pris", "ekologisk", "etiskt"]:
        if col not in df.columns:
            df[col] = None
    # clean up flag columns — treat empty string as NULL
    for flag in ["ekologisk", "etiskt"]:
        df[flag] = df[flag].replace("", None)
    return df


def load_quarterly() -> pd.DataFrame:
    df = pd.read_excel(EXCEL_PATH, sheet_name="Varurupp Kvartal")
    df = df.rename(columns={
        "År": "year",
        "Kvartal": "kvartal",
        "Varugrupp": "varugrupp",
        "Subgrupp": "subgrupp",
        "Försäljning i liter": "forsaljning_liter",
    })
    return df


def create_schema(conn: sqlite3.Connection):
    conn.executescript("""
    PRAGMA journal_mode=WAL;

    CREATE TABLE IF NOT EXISTS products (
        artnr           INTEGER,
        namn            TEXT,
        kvittonamn      TEXT,
        marke           TEXT,
        producentnamn   TEXT,
        varugrupp       TEXT,
        varugrupp_detalj TEXT,
        rubrik          TEXT,
        volym_ml        REAL,
        buteljtyp       TEXT,
        land            TEXT,
        region          TEXT,
        ursprung        TEXT,
        PRIMARY KEY (artnr)
    );

    CREATE TABLE IF NOT EXISTS sales (
        artnr               INTEGER,
        year                INTEGER,
        pris                REAL,
        forsaljning_liter   REAL,
        ekologisk           TEXT,
        etiskt              TEXT,
        PRIMARY KEY (artnr, year),
        FOREIGN KEY (artnr) REFERENCES products(artnr)
    );

    CREATE TABLE IF NOT EXISTS quarterly_sales (
        year                INTEGER,
        kvartal             INTEGER,
        varugrupp           TEXT,
        subgrupp            TEXT,
        forsaljning_liter   REAL,
        PRIMARY KEY (year, kvartal, varugrupp, subgrupp)
    );

    -- Indexes for common query patterns
    CREATE INDEX IF NOT EXISTS idx_sales_year        ON sales(year);
    CREATE INDEX IF NOT EXISTS idx_sales_artnr       ON sales(artnr);
    CREATE INDEX IF NOT EXISTS idx_products_varugrupp ON products(varugrupp);
    CREATE INDEX IF NOT EXISTS idx_products_land      ON products(land);
    CREATE INDEX IF NOT EXISTS idx_products_rubrik    ON products(rubrik);
    """)
    conn.commit()


def main():
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    Path(DB_PATH).unlink(missing_ok=True)   # fresh build each run

    print("Opening database …")
    conn = sqlite3.connect(DB_PATH)
    create_schema(conn)

    all_frames = []
    for year in YEARS:
        print(f"  Loading {year} …", end=" ", flush=True)
        df = load_year(str(year))
        print(f"{len(df):,} rows")
        all_frames.append(df)

    combined = pd.concat(all_frames, ignore_index=True)
    print(f"\nTotal rows loaded: {len(combined):,}")

    # --- products table: one row per artnr (latest year wins for metadata) ---
    print("Building products table …")
    products = (
        combined.sort_values("year")
        .drop_duplicates(subset=["artnr"], keep="last")
        [PRODUCT_COLS]
        .dropna(subset=["artnr"])
    )
    products["artnr"] = products["artnr"].astype(int)
    products.to_sql("products", conn, if_exists="replace", index=False)
    print(f"  {len(products):,} unique products")

    # --- sales table ---
    print("Building sales table …")
    sales = combined[SALES_COLS].dropna(subset=["artnr"])
    sales = sales.copy()
    sales["artnr"] = sales["artnr"].astype(int)
    sales.to_sql("sales", conn, if_exists="replace", index=False)
    print(f"  {len(sales):,} sales rows")

    # --- quarterly_sales ---
    print("Building quarterly_sales table …")
    quarterly = load_quarterly()
    quarterly.to_sql("quarterly_sales", conn, if_exists="replace", index=False)
    print(f"  {len(quarterly):,} quarterly rows")

    conn.commit()

    # --- quick sanity check ---
    print("\n── Sanity checks ──────────────────────────────")
    for query, label in [
        ("SELECT COUNT(*) FROM products", "products"),
        ("SELECT COUNT(*) FROM sales", "sales rows"),
        ("SELECT COUNT(DISTINCT year) FROM sales", "years in sales"),
        ("SELECT COUNT(*) FROM quarterly_sales", "quarterly rows"),
        ("SELECT COUNT(DISTINCT varugrupp) FROM products", "product categories"),
        ("SELECT COUNT(DISTINCT land) FROM products", "countries of origin"),
    ]:
        val = conn.execute(query).fetchone()[0]
        print(f"  {label:30s}: {val:,}")

    conn.close()
    print(f"\n✓ Database written to: {DB_PATH}")


if __name__ == "__main__":
    main()
