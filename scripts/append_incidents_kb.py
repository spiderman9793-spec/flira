import json

path = r"c:\Users\adars\Downloads\flame-in-freefall (1)\flame-in-freefall-v2\src\data\knowledge.json"
with open(path, "r", encoding="utf-8-sig") as f:
    chunks = json.load(f)

existing_ids = {c["id"] for c in chunks}

new_chunks = [
    {
        "id": "kb:incident:apollo13",
        "text": "Apollo 13 Oxygen Tank Explosion (1970-04-13): During translunar coast, cryogenic supercritical oxygen tank 2 in the Service Module suffered catastrophic combustion. Thermostatic switches, upgraded to 65V DC ground power but not re-engineered, welded shut during ground detanking, baking the interior above 1,000 deg F and stripping Teflon (PTFE) wire insulation. When the crew initiated a cryo-stir fan in flight, an electrical arc ignited the Teflon in 100% supercritical oxygen at ~1,000 psia. The rapid pressure escalation blew out the Sector 4 outer panel and crippled Service Module oxygen, power, and water, forcing the crew to use the Lunar Module Aquarius as a lifeboat. Redesigns: complete removal of stir fans and electric motors from cryo tanks, stainless steel conduit sheathing, independent thermal cutoffs, addition of a third isolated O2 tank, and strict high-pressure oxygen materials flammability screening (NASA-STD-6001 Test 17).",
        "source": "NASA SMA Apollo 13 Case Study & Accident Review Board Report",
        "page": 1,
        "kind": "incident"
    },
    {
        "id": "kb:incident:apollo1",
        "text": "Apollo 1 Launch Pad Fire (1967-01-27, AS-204): During a pre-launch countdown test at Cape Kennedy Pad 34, a cabin fire ignited in Command Module 012. The cabin was pressurized to 16.7 psia (115 kPa) with 100% pure oxygen. An electrical arc from chafed Teflon insulation near the Environmental Control Unit ignited flammable materials, including over 34 square feet of Velcro hook-and-loop fasteners, nylon cargo netting, and polyurethane foam cushions. In pure high-pressure oxygen, materials burn with violent speed; cabin pressure spiked to 29-37 psia in 17 seconds, rupturing the inner pressure vessel. The inward-opening hatch required 90 seconds to unlatch, trapping astronauts Virgil Grissom, Edward White, and Roger Chaffee, who died of carbon monoxide asphyxiation. Redesigns: outward-opening quick-release hatch (7-second egress), mixed launch atmosphere (60% N2 / 40% O2 transitioning to 100% O2 at 5 psia in orbit), elimination of flammable nylon and Velcro, replacement with non-flammable Beta cloth and Polybenzimidazole (PBI) fabrics, and establishment of NASA-STD-6001 flammability testing.",
        "source": "NASA SMA Apollo 1 Memorial & Accident Investigation Board Report",
        "page": 1,
        "kind": "incident"
    },
    {
        "id": "kb:incident:mir1997",
        "text": "Mir Space Station Fire (1997-02-23): While operating in Low Earth Orbit aboard the Russian space station Mir, a Solid Fuel Oxygen Generator (SFOG, Vika / TGK canister containing lithium perchlorate) suffered a mechanical breach. Upon ignition, molten lithium metal and burning fuel broke through the steel canister, torching like an open blowtorch against the Kvant-1 module aluminum hull. In microgravity (0g), the absence of thermal buoyancy prevented smoke from rising or stratifying; toxic smoke and carbon monoxide filled the module from ceiling to floor, plunging crew into near-zero visibility. Extinguishing foam dispersed into floating spheres rather than blanketing the flame. The 6-person crew fought the fire for 14 minutes using multiple foam extinguishers while wearing industrial breathing masks. The fire blocked access to one of two docked Soyuz escape vehicles. Redesigns: isolation compartments for oxygen generators, unobstructed egress pathways to escape vehicles, enhanced smoke masks with CO catalysis, and specialized microgravity foam suppression techniques.",
        "source": "NASA History 25 Years Ago: Fire Aboard Space Station Mir",
        "page": 1,
        "kind": "incident"
    },
    {
        "id": "kb:spinoff:airtanks",
        "text": "Firefighter Lightweight Air Tanks & SCBA (NASA Spinoff Node 9582): NASA Johnson Space Center, in collaboration with Scott Aviation and the National Bureau of Standards, adapted the composite pressure vessel technology originally developed for Apollo and Skylab Portable Life Support System (PLSS) astronaut backpacks. Heavy, unwieldy 33-lb forged steel air tanks were replaced with seamless aluminum liners overwrapped with high-strength resin-impregnated fiberglass and Kevlar composites, operating at 4,500 psi. This cut cylinder weight by 40% to 50% down to 20 lbs for a 30-minute air supply, dramatically reducing firefighter cardiac strain, exhaustion, and injuries, standardizing modern municipal Self-Contained Breathing Apparatus (SCBA) worldwide.",
        "source": "NASA Spinoff 1976 / Node 9582",
        "page": 1,
        "kind": "spinoff"
    },
    {
        "id": "kb:spinoff:firedetector",
        "text": "Space Shuttle Discriminating Incipient Fire Detector (NASA Spinoff Node 9407): Developed by Brunswick for the Space Shuttle orbiter cabin, this advanced particulate sensor samples ambient air to detect combustion aerosols. Unlike conventional home smoke detectors that trigger false alarms on non-hazardous dust or airborne moisture, the Shuttle detector discriminates between true sub-micron combustion particles and extraneous matter like dust motes. It detects incipient fire conditions before visible flame or heavy smoke appears. This technology was spun off into industrial fire safety systems, protecting hazardous underground coal mines, metallurgical mills, and server cleanrooms.",
        "source": "NASA Spinoff 1978 / Node 9407",
        "page": 1,
        "kind": "spinoff"
    },
    {
        "id": "kb:spinoff:fireattire",
        "text": "Project FIRES & Advanced Firefighter Turnout Attire (NASA Spinoff Node 9918): Sponsored jointly by NASA Marshall Space Flight Center and FEMA's U.S. Fire Administration, Project FIRES (Firefighter's Integrated Response Equipment System) adapted Apollo astronaut spacesuit materials and thermal protection systems for civilian firefighters. Central to the program was Polybenzimidazole (PBI) synthetic fiber, commercialized with Celanese following the Apollo 1 post-fire materials initiative. PBI does not ignite, melt, or drip in air even at temperatures exceeding 1,000 deg F (540 deg C). Today, PBI/Kevlar blend fabrics serve as the gold-standard outer shell for structural firefighter turnout coats and trousers globally.",
        "source": "NASA Spinoff 1982 / Node 9918",
        "page": 1,
        "kind": "spinoff"
    },
    {
        "id": "kb:ranking:formula",
        "text": "Habitat Flammability Evidence Ranking Formula: S = sum_{i=1}^5 w_i * r_i. The multi-axis composite relevance score S is calculated as the weighted sum of normalized dimensional match ratings r_i across the 5 primary environmental and operational axes: 1) Gravity regime r_g (microgravity 0g vs partial g vs 1g), 2) Oxygen concentration r_O2 (hypoxic vs ambient 21% vs elevated 34% EVA), 3) Atmospheric pressure r_P (14.7 psia sea level down to 8.2 psia exploration atmosphere), 4) Ventilation airflow velocity r_u (quiescent 0 cm/s vs low flow 5-20 cm/s), and 5) Material fuel phase r_mat (solid polymers, textiles, droplets, or gases). Each weight w_i allows mission engineers to emphasize the operational constraints of their specific spacecraft or lunar habitat architecture.",
        "source": "NASA Space App FLIRA Scoring Specification",
        "page": 1,
        "kind": "theory"
    }
]

added = 0
for ch in new_chunks:
    if ch["id"] not in existing_ids:
        chunks.append(ch)
        added += 1

with open(path, "w", encoding="utf-8") as f:
    json.dump(chunks, f, indent=2)

print(f"Added {added} new knowledge chunks to knowledge.json. Total chunks: {len(chunks)}")
