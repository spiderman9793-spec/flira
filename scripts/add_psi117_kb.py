import json

path = r"c:\Users\adars\Downloads\flame-in-freefall (1)\flame-in-freefall-v2\src\data\knowledge.json"
with open(path, "r", encoding="utf-8-sig") as f:
    chunks = json.load(f)

existing_ids = {c["id"] for c in chunks}

psi117_chunks = [
    {
        "id": "kb:psi117:overview",
        "text": "NASA PSI-117 Version 2: Effect of External Thermo-Convective Perturbation on Cool Flame Dynamics: A Multidimensional Multi-Physics CFD Analysis (PIs: Tanvir Farouk, Mike Hicks; NASA GRC; DOI: 10.60555/gz0q-b577). Utilizes flight data from NASA's Flame Extinguishment Experiment (FLEX) to quantify how externally imposed thermal and convective perturbations regulate the dynamics, stability windows, and ultimate fate of established droplet cool flames in microgravity. OpenFOAM 3-D multi-physics CFD models couple variable-density Navier-Stokes flow with low-temperature combustion chemistry, coupled heat/mass transfer, and radiation.",
        "source": "NASA PSI-117 v2 Investigation Overview",
        "page": 1,
        "kind": "psi_record"
    },
    {
        "id": "kb:psi117:dynamics",
        "text": "PSI-117 Droplet Cool Flame Perturbation Modes: Examined three forcing modes: (i) convection alone to mimic droplet drift, (ii) imposed heat flux, and (iii) combined convection plus heating for large (1-4 mm) and sub-millimeter (~0.5 mm) droplets of n-heptane, iso-octane, n-decane, n-dodecane (C12), and jet fuel surrogates. Yielded stability maps for cool-flame onset, persistence, oscillatory modes, and quenching, parameterized across forcing amplitude/frequency, ozone addition, and ambient pressure.",
        "source": "NASA PSI-117 v2 CFD Analysis & Observables",
        "page": 1,
        "kind": "psi_record"
    },
    {
        "id": "kb:psi117:safety",
        "text": "Spacecraft Fire Safety & Hazard Implications of PSI-117: In microgravity, where natural buoyancy is absent, low-temperature cool flames (~500-800 K) can persist invisibly without generating visible soot, eluding traditional optical smoke detectors. Unintentional air currents (2-5 cm/s ventilation drift or crew motion) cause oscillatory instabilities that can abruptly reignite into dangerous hot-flame burning. Validates the need for multi-criteria detection (CO, formaldehyde, and gas sensors) to catch low-temperature combustion before flame escalation.",
        "source": "NASA PSI-117 v2 Space Safety Takeaways",
        "page": 1,
        "kind": "safety_implication"
    }
]

added = 0
for ch in psi117_chunks:
    if ch["id"] not in existing_ids:
        chunks.append(ch)
        added += 1

with open(path, "w", encoding="utf-8") as f:
    json.dump(chunks, f, indent=2)

print(f"Added {added} chunks. Total knowledge chunks: {len(chunks)}")
