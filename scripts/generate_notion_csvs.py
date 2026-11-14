import json
import csv
import os

base_dir = r"c:\Users\adars\Downloads\flame-in-freefall (1)\flame-in-freefall-v2\src\data"
out_dir = r"c:\Users\adars\Downloads\flame-in-freefall (1)\flame-in-freefall-v2\public\notion_exports"
os.makedirs(out_dir, exist_ok=True)

with open(os.path.join(base_dir, "investigations.json"), "r", encoding="utf-8-sig") as f:
    inv_data = json.load(f)

with open(os.path.join(base_dir, "psi_registry.json"), "r", encoding="utf-8-sig") as f:
    psi_raw = json.load(f)
    psi_items = psi_raw.get("investigations", [])

with open(os.path.join(base_dir, "psi_runs.json"), "r", encoding="utf-8-sig") as f:
    runs_data = json.load(f)

# 1. Notion Investigations Export CSV
inv_csv_path = os.path.join(out_dir, "notion_investigations.csv")
with open(inv_csv_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow([
        "Investigation Name",
        "Short Code",
        "Primary Facility",
        "Flight Hardware",
        "Pillars",
        "Fuels Tested",
        "Gravity Regimes",
        "Test Conditions Count",
        "PSI Accession",
        "DOI",
        "Key Safety Implication"
    ])
    for inv in inv_data.get("investigations", []):
        writer.writerow([
            inv.get("name", ""),
            inv.get("id", ""),
            inv.get("facility", ""),
            inv.get("hardware", ""),
            ", ".join(inv.get("pillars", [])),
            ", ".join(inv.get("fuels", [])),
            ", ".join(str(g) for g in inv.get("gravity_g", [])),
            len(inv.get("conditions", [])),
            inv.get("psi_accession", ""),
            inv.get("doi", ""),
            inv.get("safety_implication", "")
        ])

# 2. Notion PSI Registry Export CSV
psi_csv_path = os.path.join(out_dir, "notion_psi_registry.csv")
with open(psi_csv_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow([
        "PSI Accession",
        "Study Title",
        "Acronym",
        "Sub Research Area",
        "Research Area",
        "DOI",
        "Files Count",
        "Experimental Tables Count",
        "Total Runs Recorded",
        "Archive Status",
        "Dataset URL",
        "Research Objective"
    ])
    runs_by_accession = {s["accession"]: s.get("rowCount", 0) for s in runs_data.get("studies", [])}
    for item in psi_items:
        acc = item.get("accession", "")
        writer.writerow([
            acc,
            item.get("title", ""),
            item.get("acronym", ""),
            item.get("sub_research_area", ""),
            item.get("research_area", ""),
            item.get("doi", ""),
            item.get("file_count", 0),
            item.get("experimental_table_count", 0),
            runs_by_accession.get(acc, 0),
            item.get("archive_status", "available"),
            item.get("psi_url", item.get("doi_url", "")),
            item.get("objective", "").replace("\n", " ")[:300]
        ])

# 3. Notion Test Conditions Export CSV
cond_csv_path = os.path.join(out_dir, "notion_test_conditions.csv")
with open(cond_csv_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow([
        "Condition Code",
        "Investigation Code",
        "Investigation Name",
        "Condition Label",
        "Oxygen %",
        "Pressure (psia)",
        "Forced Flow (cm/s)",
        "Gravity (g)",
        "Basis",
        "Atmosphere Category",
        "Suppression / Extinction Observed"
    ])
    for inv in inv_data.get("investigations", []):
        inv_id = inv.get("id", "")
        inv_name = inv.get("name", "")
        for idx, cond in enumerate(inv.get("conditions", [])):
            o2 = cond.get("o2_pct", 21.0)
            p = cond.get("pressure_psi", 14.7)
            flow = cond.get("flow_cm_s", 0.0)
            grav = cond.get("gravity_g", 0.0)
            cat = "Standard Sea Level (21% O2, 14.7 psia)"
            if p < 10.0 and o2 >= 30.0:
                cat = "Exploration EVA (8.2 psia, 34% O2)"
            elif o2 < 21.0:
                cat = "Hypoxic / Extinction Testing"
            elif o2 > 25.0:
                cat = "Enriched Oxygen Hazard"

            writer.writerow([
                f"{inv_id}-C{idx+1:02d}",
                inv_id,
                inv_name,
                cond.get("label", ""),
                o2,
                p,
                flow,
                grav,
                cond.get("basis", "nominal"),
                cat,
                cond.get("extinguished", "Unknown / Not recorded")
            ])

print("CSVs generated successfully:")
print(" -", inv_csv_path)
print(" -", psi_csv_path)
print(" -", cond_csv_path)
