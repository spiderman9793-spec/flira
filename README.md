# 🔥 FLIRA — Flame in Freefall (NASA PSI Intelligence)

> **Super-Intelligence Spacecraft Fire Safety Dashboard for Habitable Lunar & Martian Environments**  
> Grounded in 24 official NASA Physical Sciences Informatics (PSI) combustion investigations, 2,009 experimental flight runs, and Apollo/Mir spaceflight lessons.

---

## 🚀 Overview

**FLIRA** (Flame in Freefall) is an aerospace engineering intelligence platform built for the NASA Space Apps Challenge and future Artemis lunar base architectures. It interprets complex microgravity combustion datasets to deliver auditable, evidence-backed fire safety decisions for spacecraft and planetary habitats.

### Key Capabilities:
* **🔥 Physics-Grounded Flame Simulator:** Real-time 0 $g$ vs. 1 $g$ diffusion flame physics reacting dynamically to gravity, oxygen concentration, atmospheric pressure, forced ventilation, and electric fields with 400-draw Monte Carlo uncertainty envelopes.
* **📐 5-Axis Habitat Ranking ($S = \sum_{i=1}^5 w_i r_i$):** Multidimensional evidence ranking scoring investigations across Gravity ($g$), Oxygen ($\text{O}_2$), Pressure ($P$), Ventilation ($u$), and Fuel Phase ($mat$).
* **🌌 3D Universe Parameter Cube:** Three.js interactive parameter space mapping NASA flight data and highlighting the critical Lunar/Martian partial-gravity empirical data gap.
* **🤖 Dual Source-Firewalled AI Copilot:** Multi-turn conversational assistant powered by OpenRouter Free & Google Gemini, strictly firewalled by regex citation validation (`[inv:ID]`, `[psi:PSI-XX:rN]`, `[kb:...]`) to prevent hallucinated spread rates.
* **🚨 Flight Incidents & Earth Spinoffs:** Technical deep dives into the Apollo 13 oxygen tank explosion, Apollo 1 pad fire, and Mir 1997 fire, paired with NASA spinoffs (lightweight composite firefighter air tanks, Shuttle incipient fire detectors, and PBI protective turnout gear).
* **🗃️ Turnkey Notion Relational Exports:** 1-click downloadable CSVs and relational database architecture linking all 24 NASA PSI accessions, 25 investigations, and 50 exploration test conditions.

---

## 🧮 Mathematical Scoring Formulation

The composite habitat relevance score $S \in [0, 100]$ is computed as:

$$S = \sum_{i=1}^5 w_i r_i = w_g r_g + w_{\text{O}_2} r_{\text{O}_2} + w_P r_P + w_u r_u + w_{\text{mat}} r_{\text{mat}}$$

Where:
* $r_g$: Gravity regime match ($0\,g$ microgravity, $0.166\,g$ Moon analog, $0.38\,g$ Mars analog)
* $r_{\text{O}_2}$: Oxygen concentration match (ambient 21% vs. exploration 34% EVA pre-breathe)
* $r_P$: Atmospheric pressure match ($14.7\text{ psia}$ down to $8.2\text{ psia}$)
* $r_u$: Forced flow velocity ($0\text{ to }25\text{ cm/s}$)
* $r_{\text{mat}}$: Fuel phase & material classification (solids, fabrics, droplets, gaseous flames)
* $w_i$: User-tunable mission weights

---

## 🛠️ Tech Stack

* **Frontend:** React 18, TypeScript, Vite
* **Styling:** Custom Aerospace Dark Editorial CSS with amber/orange telemetry accents
* **3D & Visuals:** Three.js, Canvas, SVG particle physics
* **Icons:** Lucide React
* **Testing:** Vitest (8 unit tests covering physics engine, ranking, and citation firewall)
* **AI Providers:** OpenRouter Free API (`openrouter/free`) & Google Gemini API (`gemini-3-flash-preview`)

---

## ⚡ Quickstart

### 1. Clone the repository
```bash
git clone https://github.com/<YOUR_USERNAME>/flira.git
cd flira
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables (optional)
```bash
cp .env.example .env.local
```
Add your free OpenRouter or Gemini API keys to `.env.local` to enable live cloud AI streaming:
```env
VITE_OPENROUTER_API_KEY=your_key_here
VITE_GEMINI_API_KEY=your_key_here
```
*(If no keys are provided, FLIRA seamlessly defaults to its deterministic local keyword & BM25 offline engine).*

### 4. Run tests
```bash
npm test
```

### 5. Launch development server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 6. Build for production
```bash
npm run build
```
Creates a static bundle in `dist/` ready to deploy to Vercel, Netlify, or GitHub Pages.

---

## 📊 Dataset Provenance

* **24 NASA PSI Combustion Investigations:** All official Combustion Science records mapped to NASA accession numbers (`PSI-10` to `PSI-159`) and DOIs.
* **2,009 Experimental Runs:** Scraped directly from official `experimentalTable` CSVs hosted at `psi.nasa.gov`.
* **NASA Spinoff References:** Node 9582 (Air Tanks), Node 9407 (Fire Detector), Node 9918 (Project FIRES / Attire).
* **Safety Lessons:** Official NASA Safety & Mission Assurance (SMA) Case Studies for Apollo 1, Apollo 13, and Space Station Mir.

---

## 📜 License & Disclaimers

NASA does not endorse any non-U.S. Government entity and is not responsible for information contained on non-U.S. Government websites. Data used is publicly available through the NASA Physical Sciences Informatics (PSI) repository and NASA Spinoff program.
