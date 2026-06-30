"""
Add new year(s) of Systembolaget data into the existing database.

USAGE:
1. Put this script in the same folder as your systembolaget.db
2. Put your new Excel file(s) in that same folder
3. Edit the NEW_FILES list below to match your filenames
4. Run: python3 add_new_years.py
"""

import sqlite3
import pandas as pd
from pathlib import Path

DB_PATH = "systembolaget.db"

# Map: filename -> the year it represents
NEW_FILES = {
    "Artikellistan_2023.xlsx": 2023,
    "Artikellistan_2024.xlsx": 2024,
    "Artikellistan_2025.xlsx": 2025,
}

# Same renaming logic as the original build script, in case of column naming differences
RENAME = {
    "Artnr": "artnr",
    "Kvittonamn": "kvittonamn",
    "Namn": "namn",
    "Märke": "marke",
    "Producentnamn": "producentnamn",
    "Varugrupp": "varugrupp",
    "Varugrupp detalj": "varugrupp_detalj",
    "Rubrik": "rubrik",
    "Aktuellt pris": "pris",
    "Volym i ml": "volym_ml",
    "Buteljtyp": "buteljtyp",
    "Land": "land",
    "Region": "region",
    "Ursprung": "ursprung",
    "Ekologisk": "ekologisk",
    "Etiskt": "etiskt",
    "Försäljning i liter": "forsaljning_liter",
    "Artikel ID": "artikel_id",
}

PRODUCT_COLS = ["artnr", "namn", "kvittonamn", "marke", "producentnamn",
                "varugrupp", "varugrupp_detalj", "rubrik",
                "volym_ml", "buteljtyp", "land", "region", "ursprung"]
SALES_COLS = ["artnr", "year", "pris", "forsaljning_liter", "ekologisk", "etiskt"]


def find_header_row(path: str, sheet: str) -> int:
    """Auto-detect which row has the real column headers (looks for 'Artnr')."""
    preview = pd.read_excel(path, sheet_name=sheet, header=None, nrows=15)
    for i, row in preview.iterrows():
        if row.astype(str).str.contains("Artnr", case=False, na=False).any():
            return i
    raise ValueError(f"Could not find header row in {path}")


def load_file(path: str, year: int) -> pd.DataFrame:
    # detect sheet name automatically (first sheet)
    xl = pd.ExcelFile(path)
    sheet = xl.sheet_names[0]
    header_row = find_header_row(path, sheet)
    df = pd.read_excel(path, sheet_name=sheet, header=header_row)
    df = df.rename(columns=RENAME)
    df["year"] = year
    for col in PRODUCT_COLS + ["forsaljning_liter", "pris", "ekologisk", "etiskt"]:
        if col not in df.columns:
            df[col] = None
    for flag in ["ekologisk", "etiskt"]:
        df[flag] = df[flag].replace("", None)
    df = df.dropna(subset=["artnr"])
    df["artnr"] = df["artnr"].astype(int)
    return df


def main():
    if not Path(DB_PATH).exists():
        raise SystemExit(f"Database not found at {DB_PATH} — run this script in the same folder as systembolaget.db")

    conn = sqlite3.connect(DB_PATH)

    existing_years = {r[0] for r in conn.execute("SELECT DISTINCT year FROM sales").fetchall()}
    print(f"Existing years in database: {sorted(existing_years)}")

    all_new = []
    for filename, year in NEW_FILES.items():
        if not Path(filename).exists():
            print(f"⚠️  Skipping {filename} — file not found in this folder")
            continue
        if year in existing_years:
            print(f"⚠️  Year {year} already exists in the database — it will be REPLACED with this file's data")
            conn.execute("DELETE FROM sales WHERE year = ?", [year])

        print(f"Loading {filename} as year {year} …", end=" ", flush=True)
        df = load_file(filename, year)
        print(f"{len(df):,} rows")
        all_new.append(df)

    if not all_new:
        print("No new files were loaded. Check your filenames in NEW_FILES match exactly.")
        return

    combined = pd.concat(all_new, ignore_index=True)

    # --- update / insert products (some products may be new, some already exist) ---
    # No reliable UNIQUE constraint on artnr in older databases, so we do this safely:
    # delete any existing rows for these artnr values, then insert fresh ones.
    print("\nUpdating products table …")
    new_products = combined.drop_duplicates(subset=["artnr"], keep="last")[PRODUCT_COLS]
    artnr_list = new_products["artnr"].tolist()

    # delete in batches to avoid SQLite's variable limit
    BATCH = 500
    for i in range(0, len(artnr_list), BATCH):
        chunk = artnr_list[i:i + BATCH]
        placeholders = ",".join("?" * len(chunk))
        conn.execute(f"DELETE FROM products WHERE artnr IN ({placeholders})", chunk)

    new_products.to_sql("products", conn, if_exists="append", index=False)
    print(f"  {len(new_products):,} products inserted/updated")

    # --- insert sales rows ---
    print("Inserting sales rows …")
    sales = combined[SALES_COLS]
    sales.to_sql("sales", conn, if_exists="append", index=False)
    print(f"  {len(sales):,} sales rows added")

    conn.commit()

    # --- sanity check ---
    print("\n── Updated totals ──────────────────────────────")
    for query, label in [
        ("SELECT COUNT(*) FROM products", "products"),
        ("SELECT COUNT(*) FROM sales", "sales rows"),
        ("SELECT COUNT(DISTINCT year) FROM sales", "years in sales"),
    ]:
        val = conn.execute(query).fetchone()[0]
        print(f"  {label:20s}: {val:,}")

    years = [r[0] for r in conn.execute("SELECT DISTINCT year FROM sales ORDER BY year").fetchall()]
    print(f"  years present       : {years}")

    conn.close()
    print("\n✓ Database updated successfully!")


if __name__ == "__main__":
    main()
