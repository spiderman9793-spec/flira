import json

path = r"c:\Users\adars\Downloads\flame-in-freefall (1)\flame-in-freefall-v2\src\data\investigations.json"
with open(path, "r", encoding="utf-8-sig") as f:
    data = json.load(f)

new_conditions_map = {
    "BASS": [
        {
            "label": "Artemis EVA exploration atmosphere",
            "o2_pct": 34.0,
            "pressure_psi": 8.2,
            "flow_cm_s": 10.0,
            "basis": "nominal",
            "atmosphere_category": "Exploration EVA (8.2 psia, 34% O2)",
            "notes": "NASA Exploration Atmosphere for Artemis/Lunar lander pre-breathe mitigation."
        },
        {
            "label": "Lunar surface analog (0.166g predicted)",
            "o2_pct": 21.0,
            "pressure_psi": 14.7,
            "flow_cm_s": 10.0,
            "gravity_g": 0.166,
            "basis": "nominal",
            "atmosphere_category": "Lunar Surface Habitat Analog",
            "notes": "CFD/drop-tower analog condition for PMMA rod under Moon gravity."
        }
    ],
    "BASS-II": [
        {
            "label": "Hypoxic cabin extinction limit",
            "o2_pct": 14.8,
            "pressure_psi": 14.7,
            "flow_cm_s": 5.0,
            "basis": "published",
            "atmosphere_category": "Hypoxic / Extinction Testing",
            "notes": "Near-extinction limit under microgravity forced airflow."
        },
        {
            "label": "Artemis EVA pre-breathe PMMA ignition boundary",
            "o2_pct": 34.0,
            "pressure_psi": 8.2,
            "flow_cm_s": 15.0,
            "basis": "nominal",
            "atmosphere_category": "Exploration EVA (8.2 psia, 34% O2)",
            "notes": "Evaluate whether reduced pressure balances oxygen enrichment for solid plastics."
        }
    ],
    "Saffire-I": [
        {
            "label": "Exploration 8.2 psia pre-breathe flow",
            "o2_pct": 34.0,
            "pressure_psi": 8.2,
            "flow_cm_s": 20.0,
            "basis": "nominal",
            "atmosphere_category": "Exploration EVA (8.2 psia, 34% O2)",
            "notes": "Large-scale cotton/fiberglass fabric flame spread under Artemis cabin environment."
        },
        {
            "label": "Quiescent post-shutdown decay",
            "o2_pct": 21.0,
            "pressure_psi": 14.7,
            "flow_cm_s": 0.0,
            "basis": "published",
            "atmosphere_category": "Standard Sea Level (21% O2, 14.7 psia)",
            "notes": "Self-extinguishment observation following fan shutdown in Cygnus vehicle."
        }
    ],
    "Saffire-II": [
        {
            "label": "Low-pressure hypoxic venting",
            "o2_pct": 15.0,
            "pressure_psi": 10.0,
            "flow_cm_s": 5.0,
            "basis": "nominal",
            "atmosphere_category": "Hypoxic / Extinction Testing",
            "notes": "Emergency cabin depressurization flame extinction scenario."
        }
    ],
    "SoFIE": [
        {
            "label": "Lunar surface habitat night cycle analog",
            "o2_pct": 30.0,
            "pressure_psi": 9.5,
            "flow_cm_s": 5.0,
            "gravity_g": 0.166,
            "basis": "nominal",
            "atmosphere_category": "Lunar Surface Habitat Analog",
            "notes": "Surface habitat reduced-ventilation condition under lunar gravity."
        },
        {
            "label": "Gateway habitat nominal airflow",
            "o2_pct": 21.5,
            "pressure_psi": 14.7,
            "flow_cm_s": 8.0,
            "basis": "nominal",
            "atmosphere_category": "Standard Sea Level (21% O2, 14.7 psia)",
            "notes": "Nominal ventilation duct conditions aboard Lunar Gateway modules."
        }
    ],
    "FLEX-2": [
        {
            "label": "Elevated oxygen droplet combustion",
            "o2_pct": 30.0,
            "pressure_psi": 14.7,
            "flow_cm_s": 0.0,
            "basis": "nominal",
            "atmosphere_category": "Enriched Oxygen Hazard",
            "notes": "Investigate radiative soot loss and extinction diameter in oxygen-enriched atmosphere."
        },
        {
            "label": "Martian atmospheric pressure analog",
            "o2_pct": 21.0,
            "pressure_psi": 7.0,
            "flow_cm_s": 2.0,
            "gravity_g": 0.38,
            "basis": "nominal",
            "atmosphere_category": "Martian Habitat Analog",
            "notes": "Simulated low pressure droplet evaporation and burning under 0.38g."
        }
    ],
    "ACME": [
        {
            "label": "Low-strain extinction limit",
            "o2_pct": 18.0,
            "pressure_psi": 14.7,
            "flow_cm_s": 2.0,
            "basis": "nominal",
            "atmosphere_category": "Hypoxic / Extinction Testing",
            "notes": "Co-flow gaseous diffusion flame extinction under weak convection."
        }
    ]
}

added_count = 0
for inv in data.get("investigations", []):
    inv_id = inv.get("id")
    if inv_id in new_conditions_map:
        existing_labels = {c.get("label") for c in inv.get("conditions", [])}
        for cond in new_conditions_map[inv_id]:
            if cond["label"] not in existing_labels:
                inv["conditions"].append(cond)
                added_count += 1

with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print(f"Added {added_count} new test conditions to investigations.json.")
