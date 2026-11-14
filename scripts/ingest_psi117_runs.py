import json
import csv
import os

psi_runs_path = r"c:\Users\adars\Downloads\flame-in-freefall (1)\flame-in-freefall-v2\src\data\psi_runs.json"
csv_dir = r"c:\Users\adars\Downloads\flame-in-freefall (1)\flame-in-freefall-v2\src\data\psi_117_data"

with open(psi_runs_path, "r", encoding="utf-8-sig") as f:
    runs_data = json.load(f)

# Filter out any existing PSI-117 tables first
existing_tables = [t for t in runs_data.get("tables", []) if t.get("accession") != "PSI-117"]

new_psi117_tables = []
total_psi117_rows = 0

for fn in sorted(os.listdir(csv_dir)):
    if not fn.endswith(".csv"):
        continue
    fpath = os.path.join(csv_dir, fn)
    with open(fpath, "r", encoding="utf-8-sig", errors="ignore") as f_csv:
        reader = csv.reader(f_csv)
        rows_raw = list(reader)
        if not rows_raw:
            continue
        
        # Clean headers
        raw_headers = rows_raw[0]
        headers = [h.strip() if h.strip() else f"Col_{i+1}" for i, h in enumerate(raw_headers)]
        
        table_rows = []
        for r in rows_raw[1:]:
            if not any(c.strip() for c in r):
                continue
            row_dict = {}
            for i, h in enumerate(headers):
                val = r[i].strip() if i < len(r) else ""
                row_dict[h] = val
            table_rows.append(row_dict)
            
        total_psi117_rows += len(table_rows)
        new_psi117_tables.append({
            "accession": "PSI-117",
            "file_name": fn,
            "row_count": len(table_rows),
            "columns": headers,
            "rows": table_rows
        })
        print(f"Ingested {fn}: {len(table_rows)} rows")

all_tables = existing_tables + new_psi117_tables
runs_data["tables"] = all_tables
runs_data["table_count"] = len(all_tables)
runs_data["total_run_rows"] = sum(t["row_count"] for t in all_tables)

with open(psi_runs_path, "w", encoding="utf-8") as f:
    json.dump(runs_data, f)

print(f"\nSuccessfully integrated all 9 PSI-117 tables into psi_runs.json:")
print(f"Total Tables in App: {runs_data['table_count']}")
print(f"Total Run Rows in App: {runs_data['total_run_rows']} (added {total_psi117_rows} PSI-117 rows)")
