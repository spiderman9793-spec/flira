import json

inv_path = r"c:\Users\adars\Downloads\flame-in-freefall (1)\flame-in-freefall-v2\src\data\investigations.json"
with open(inv_path, "r", encoding="utf-8-sig") as f:
    data = json.load(f)

psi117_entry = {
    "id": "PSI-117",
    "name": "Cool Flame Dynamics & Thermo-Convective Perturbations (PSI-117 v2)",
    "short": "OpenFOAM 3D multi-physics CFD of n-alkane droplet cool flames under thermal and convective perturbations in microgravity.",
    "pillars": [
        "prevention",
        "detection"
    ],
    "facility": "Ground Investigation / OpenFOAM CFD (NASA GRC & Univ. South Carolina)",
    "hardware": "OpenFOAM Multidimensional Multi-Physics CFD Solver + FLEX flight data",
    "phase": [
        "liquid"
    ],
    "fuels": [
        "n-heptane",
        "iso-octane",
        "n-decane",
        "n-dodecane (C12)",
        "jet fuel surrogate"
    ],
    "gravity_g": [
        0.0
    ],
    "conditions": [
        {
            "label": "quiescent isolated droplet cool flame baseline",
            "o2_pct": 21.0,
            "pressure_psi": 14.7,
            "flow_cm_s": 0.0,
            "basis": "nominal",
            "atmosphere_category": "Standard Sea Level (21% O2, 14.7 psia)",
            "notes": "1-4 mm n-alkane droplet cool flame burning regime with radiative heat balance."
        },
        {
            "label": "drift-induced convective perturbation (mimicking droplet drift)",
            "o2_pct": 21.0,
            "pressure_psi": 14.7,
            "flow_cm_s": 3.0,
            "basis": "published",
            "atmosphere_category": "Standard Sea Level (21% O2, 14.7 psia)",
            "notes": "Sub-millimeter (0.5 mm) droplet subject to 2-5 cm/s unintentional drift causing oscillatory cool flame modes."
        },
        {
            "label": "imposed oscillatory heat flux perturbation",
            "o2_pct": 21.0,
            "pressure_psi": 14.7,
            "flow_cm_s": 0.0,
            "basis": "published",
            "atmosphere_category": "Standard Sea Level (21% O2, 14.7 psia)",
            "notes": "External thermal oscillation forcing transition between stable cool flame and warm-flame extinction."
        },
        {
            "label": "ozone-assisted low-temperature chemistry boundary",
            "o2_pct": 21.0,
            "pressure_psi": 14.7,
            "flow_cm_s": 0.0,
            "basis": "nominal",
            "atmosphere_category": "Standard Sea Level (21% O2, 14.7 psia)",
            "notes": "Ozone seeding to probe radical pool and low-temperature ignition delay boundaries."
        }
    ],
    "measurements": [
        "cool flame stand-off diameter",
        "extinction diameter (Dext)",
        "burning rate constant (Kavg)",
        "oscillation frequency and amplitude",
        "flame radiance",
        "transition to warm/hot ignition"
    ],
    "finding": "External thermo-convective perturbations shift residence time and scalar dissipation in microgravity, governing whether a cool flame self-quenches or transitions back into hot burning. Droplet drift as low as 2-5 cm/s triggers oscillatory instability.",
    "finding_basis": "published",
    "partial_g_note": "In 0g, buoyancy is suppressed, making weak convective drift and radiation the dominant transport modes. In lunar gravity (0.166g), buoyant convection overwhelms these delicate low-temperature stabilization windows.",
    "earth_spinoff": "Advances low-temperature combustion chemistry understanding relevant to internal combustion engine knock, aviation gas-turbine efficiency, and industrial CFD spray combustion modeling.",
    "sources": [
        {
            "label": "NASA PSI-117 v2 (Farouk & Hicks 2024/2026, DOI: 10.60555/gz0q-b577)",
            "page": 1
        }
    ],
    "psi_accession": "PSI-117",
    "doi": "10.60555/gz0q-b577",
    "safety_implication": "Identifies conditions where invisible, low-temperature cool flames can quietly smolder on fuel droplets or surfaces without triggering optical smoke detectors, and reignite if ventilation fluctuates."
}

# Check if already present
existing_ids = [inv["id"] for inv in data["investigations"]]
if "PSI-117" not in existing_ids:
    data["investigations"].append(psi117_entry)
    print("Added PSI-117 to investigations.json!")
else:
    for i, inv in enumerate(data["investigations"]):
        if inv["id"] == "PSI-117":
            data["investigations"][i] = psi117_entry
            print("Updated PSI-117 in investigations.json!")

with open(inv_path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print(f"Total investigations count: {len(data['investigations'])}")
