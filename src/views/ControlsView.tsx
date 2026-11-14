import { useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  ExternalLink,
  Flame,
  Globe,
  LifeBuoy,
  ShieldAlert,
  ShieldCheck,
  Wind,
  Zap,
} from 'lucide-react';
import { Environment } from '../engine/physics';
import { INVESTIGATIONS } from '../engine/schema';
import rawIncidents from '../data/incidents.json';
import rawSpinoffs from '../data/spinoffs.json';

interface ControlsViewProps {
  env: Environment;
}

interface ControlCard {
  category: 'Prevention & Screening' | 'Detection & Sensors' | 'Suppression & Active Control';
  title: string;
  controlMechanism: string;
  habitatGuidance: string;
  investigations: string[];
  icon: typeof Flame;
  status: 'Flight-informed' | 'Partial-g gap remains';
}

const CONTROLS: ControlCard[] = [
  {
    category: 'Prevention & Screening',
    title: 'Replace 1 g Upward-Burn Screening with Flow-Aware Microgravity Bounds',
    controlMechanism:
      'BASS-II and SAFFIRE-II proved that materials passing NASA 1 g upward-burn screens can burn appreciably faster in low-pressure, elevated-O₂ environments (e.g., 34.5% O₂ at 2.98 psi) and peak at low forced airflow (~5–15 cm/s).',
    habitatGuidance:
      'Screen cabin textiles, foams, and wire insulation using pressure-adjusted LOI plus low-flow 0 g bounds rather than relying solely on Earth 1 g pass/fail tests.',
    investigations: ['BASS', 'BASS-II', 'SAFFIRE-I', 'SAFFIRE-II'],
    icon: ShieldCheck,
    status: 'Partial-g gap remains',
  },
  {
    category: 'Prevention & Screening',
    title: 'Non-Destructive Material Screening via Porous-Burner Simulants',
    controlMechanism:
      'ACME-BRE mimics solid-fuel heat feedback using gaseous simulants on a porous burner, decoupling thermal conductivity, heat of gasification, and radiation without destroying flight hardware.',
    habitatGuidance:
      'Enables rapid parametric qualification of new lunar habitat polymers and composite wall liners prior to FM2 / LUCI lunar flight tests.',
    investigations: ['ACME-BRE'],
    icon: Flame,
    status: 'Partial-g gap remains',
  },
  {
    category: 'Detection & Sensors',
    title: 'Multi-Criteria Smoke + CO + Formaldehyde (Cool-Flame) Detectors',
    controlMechanism:
      'SAME & SAME-R showed microgravity smoke particles linger in the hot zone and agglomerate larger than 1 g smoke, under-triggering standard optical alarms. CFI & ACME-CFI-G showed cool flames persist invisibly while emitting CO and formaldehyde.',
    habitatGuidance:
      'Pair multi-angle optical scattering + ionization with electrochemical CO / CH₂O gas sensors so invisible low-temperature smoldering and post-extinction cool flames cannot go undetected.',
    investigations: ['SAME', 'SAME-R', 'SAFFIRE-III', 'CFI', 'ACME-CFI-G'],
    icon: BellRing,
    status: 'Flight-informed',
  },
  {
    category: 'Detection & Sensors',
    title: 'Lunar / Martian Regolith Dust Discrimination',
    controlMechanism:
      'DAFT & DAFT-2 demonstrated that optical spacecraft smoke detectors respond identically to airborne lunar/Martian dust simulants, creating high false-alarm rates in dusty airlocks and rovers.',
    habitatGuidance:
      'Deploy particle-size/gas ratio discrimination (optical + CO/CO₂ signature) and intake filtration near EVA airlocks so regolith dust does not desensitize crew to real alarms.',
    investigations: ['DAFT', 'DAFT-2'],
    icon: Wind,
    status: 'Partial-g gap remains',
  },
  {
    category: 'Suppression & Active Control',
    title: 'Heat-Capacity-Driven Clean Agents (CO₂ vs Helium) & Aimed Fine Mist',
    controlMechanism:
      'FLEX & FLEX-2 established that CO₂ extinguishes microgravity flames far better than helium at identical mole fractions due to higher molar heat capacity and radiative cooling—not mere oxygen displacement.',
    habitatGuidance:
      'Size cabin fire extinguishers by thermal heat-capacity sink and aim fine-water-mist nozzles directly at the fuel zone instead of relying on buoyant convective plumes.',
    investigations: ['FLEX', 'FLEX-2'],
    icon: ShieldCheck,
    status: 'Flight-informed',
  },
  {
    category: 'Suppression & Active Control',
    title: 'Ventilation Shutdown Sequencing & Ion-Wind Flame Control',
    controlMechanism:
      'BASS-II showed dim blue microgravity flames (<1 cm/s) flare violently when cabin fans restart or surge. ACME-E-FIELD proved high-voltage electric fields drag flame ions to reshape, suppress soot, or blow off diffusion flames.',
    habitatGuidance:
      'Couple fire-alarm triggers to automated HVAC isolation dampers to prevent flare-ups during crew response; evaluate electrostatic ion-wind actuators for enclosed avionics bays.',
    investigations: ['BASS-II', 'ACME-E-FIELD', 'SLICE'],
    icon: Zap,
    status: 'Flight-informed',
  },
];

export function ControlsView({ env }: ControlsViewProps) {
  const [activeTab, setActiveTab] = useState<'controls' | 'incidents' | 'spinoffs'>('controls');
  const byId = new Map(INVESTIGATIONS.map((i) => [i.id, i]));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <p className="eyebrow">MISSION SAFETY &amp; TECHNOLOGY ARCHITECTURE</p>
        <h2 className="serif-title page-title">
          Controls, Historical Flight Incidents &amp; Earth Spinoffs
        </h2>
        <p className="lead">
          From microgravity combustion experiments (PSI) and tragic mission lessons (Apollo 1,
          Apollo 13, Mir) to next-generation spacecraft hardware and civilian firefighting technology.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <button
          className={`btn-ghost ${activeTab === 'controls' ? 'active' : ''}`}
          onClick={() => setActiveTab('controls')}
        >
          <ShieldCheck size={14} /> Flight Controls &amp; Equipment (6)
        </button>
        <button
          className={`btn-ghost ${activeTab === 'incidents' ? 'active' : ''}`}
          onClick={() => setActiveTab('incidents')}
        >
          <ShieldAlert size={14} /> Historical Flight Incidents (3)
        </button>
        <button
          className={`btn-ghost ${activeTab === 'spinoffs' ? 'active' : ''}`}
          onClick={() => setActiveTab('spinoffs')}
        >
          <Globe size={14} /> NASA Firefighting Spinoffs (4)
        </button>
      </div>

      {activeTab === 'controls' && (
        <>
          {/* Active environment operational callouts */}
          <div className="grid-3">
            <div className="card" style={{ padding: 14 }}>
              <span className="eyebrow">VENTILATION REGIME</span>
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>
                {env.flow_cm_s < 2
                  ? 'Quiescent / Dim-Blue Zone (< 2 cm/s)'
                  : env.flow_cm_s <= 15
                  ? 'Peak Spread Sensitivity (2–15 cm/s)'
                  : 'High Forced Flow (> 15 cm/s)'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                {env.flow_cm_s < 2
                  ? 'Flames may appear dim blue or cool; restarting fans risks sudden flare-up (BASS-II).'
                  : 'Close to BASS-II peak spread velocity; HVAC isolation is critical upon alarm.'}
              </div>
            </div>

            <div className="card" style={{ padding: 14 }}>
              <span className="eyebrow">ATMOSPHERE SCREENING</span>
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>
                {env.o2_pct >= 28 ? 'Elevated-O₂ Exploration Envelope' : 'Standard Air / Low-O₂'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                {env.o2_pct >= 28
                  ? 'Standard 1 g material screens fail to guarantee self-extinguishment (SAFFIRE-I/II).'
                  : 'Maintain CO₂ thermal-sink sizing and multi-criteria smoke+CO detection.'}
              </div>
            </div>

            <div className="card" style={{ padding: 14 }}>
              <span className="eyebrow">DETECTION PRIORITY</span>
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>
                {env.gravity_g > 0.05 && env.gravity_g < 0.5
                  ? 'Dust + Agglomerated Smoke Rejection'
                  : 'Cool-Flame CO / CH₂O + Optical'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                {env.gravity_g > 0.05 && env.gravity_g < 0.5
                  ? 'Regolith dust triggers false alarms in optical sensors (DAFT/DAFT-2); require gas+smoke fusion.'
                  : 'SAME/CFI show larger smoke particles and invisible cool flames require multi-criteria heads.'}
              </div>
            </div>
          </div>

          {/* Controls Grid */}
          <div className="grid-2">
            {CONTROLS.map((c) => {
              const Icon = c.icon;
              return (
                <article key={c.title} className="card card-gold" style={{ padding: 18 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <span className="badge badge-gold">
                      <Icon size={12} /> {c.category}
                    </span>
                    <span
                      className={`badge ${
                        c.status === 'Flight-informed' ? 'badge-green' : 'badge-orange'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>

                  <h3 style={{ margin: '4px 0 8px', fontSize: 17 }}>{c.title}</h3>
                  <p style={{ fontSize: 13, margin: '0 0 8px', color: 'var(--muted)' }}>
                    <strong style={{ color: 'var(--fg)' }}>NASA Evidence:</strong>{' '}
                    {c.controlMechanism}
                  </p>
                  <p style={{ fontSize: 13, margin: '0 0 12px' }}>
                    <strong style={{ color: 'var(--gold)' }}>Hardware Design Takeaway:</strong>{' '}
                    {c.habitatGuidance}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {c.investigations.map((id) => {
                      const inv = byId.get(id);
                      return (
                        <span key={id} className="badge badge-blue">
                          {inv?.psi?.accession ? `${inv.psi.accession} · ` : ''}
                          {id}
                        </span>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {activeTab === 'incidents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ borderLeft: '3px solid #ef4444' }}>
            <span className="eyebrow" style={{ color: '#ef4444' }}>
              CRITICAL LESSONS FROM CREWED SPACEFLIGHT
            </span>
            <h3 style={{ margin: '6px 0 8px', fontSize: 18 }}>
              NASA &amp; International Space Station Fire Incidents
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              The modern principles of spacecraft fire safety were forged by these defining
              catastrophes and close-calls. Each incident caused an agency-level overhaul in
              materials screening, hatch mechanics, atmosphere composition, and emergency isolation.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {rawIncidents.map((inc) => (
              <div key={inc.id} className="card" style={{ padding: 18 }}>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={18} style={{ color: '#ef4444' }} />
                    <strong style={{ fontSize: 16 }}>{inc.name}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span className="badge badge-gold">{inc.mission}</span>
                    <span className="badge badge-blue">{inc.date}</span>
                    <a
                      href={inc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost"
                      style={{ padding: '3px 8px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <ExternalLink size={11} /> NASA SMA Case Study
                    </a>
                  </div>
                </div>

                <div className="grid-3" style={{ marginBottom: 12 }}>
                  <div style={{ background: 'var(--bg-elev)', padding: 10, borderRadius: 8 }}>
                    <span className="eyebrow" style={{ fontSize: 10 }}>ATMOSPHERE &amp; PRESSURE</span>
                    <div className="mono" style={{ fontSize: 12, color: 'var(--gold)', marginTop: 2 }}>
                      {inc.atmosphere.o2_pct}% O₂ · {inc.atmosphere.pressure_psia} psia
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      {inc.atmosphere.environment_desc}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-elev)', padding: 10, borderRadius: 8 }}>
                    <span className="eyebrow" style={{ fontSize: 10 }}>IGNITION SOURCE</span>
                    <div style={{ fontSize: 12, marginTop: 2 }}>{inc.ignition_source}</div>
                  </div>

                  <div style={{ background: 'var(--bg-elev)', padding: 10, borderRadius: 8 }}>
                    <span className="eyebrow" style={{ fontSize: 10 }}>COMBUSTIBLES INVOLVED</span>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      {inc.materials_involved.join(', ')}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, lineHeight: 1.6 }}>
                  <div>
                    <strong style={{ color: '#f87171' }}>Root Cause: </strong>
                    <span style={{ color: 'var(--muted)' }}>{inc.root_cause}</span>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--gold)' }}>Combustion Dynamics: </strong>
                    <span style={{ color: 'var(--muted)' }}>{inc.fire_dynamics}</span>
                  </div>
                  <div>
                    <strong style={{ color: '#38bdf8' }}>Outcome &amp; Survival: </strong>
                    <span style={{ color: 'var(--muted)' }}>{inc.outcome}</span>
                  </div>
                </div>

                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <span className="eyebrow">ENGINEERING REDESIGNS &amp; MODERN STANDARDS</span>
                  <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12.5, color: 'var(--fg)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {inc.engineering_redesigns.map((redesign, idx) => (
                      <li key={idx}>{redesign}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'spinoffs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ borderLeft: '3px solid #10b981' }}>
            <span className="eyebrow" style={{ color: '#10b981' }}>
              TERRESTRIAL TECHNOLOGY TRANSFERS
            </span>
            <h3 style={{ margin: '6px 0 8px', fontSize: 18 }}>
              NASA Space Technology Protecting Firefighters on Earth
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              Technologies engineered for astronaut space suits, spacecraft cabin atmosphere
              monitoring, and microgravity combustion have revolutionized civilian firefighting,
              industrial mine safety, and clean water-mist building protection.
            </p>
          </div>

          <div className="grid-2">
            {rawSpinoffs.map((spin) => (
              <div
                key={spin.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  padding: 18,
                  background: 'var(--bg-elev)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div>
                    <div className="badge badge-green" style={{ marginBottom: 6 }}>
                      Spinoff {spin.spinoff_id} · {spin.year}
                    </div>
                    <h3 style={{ margin: 0, fontSize: 16 }}>{spin.title}</h3>
                  </div>
                  <a
                    href={spin.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost"
                    style={{ padding: '4px 8px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <ExternalLink size={11} /> NASA Spinoff
                  </a>
                </div>

                <div style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600 }}>
                  Origin: {spin.originating_program}
                </div>

                <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--fg)' }}>Technology Transfer: </strong>
                  {spin.technology_transfer}
                </p>

                <div style={{ background: 'var(--card-bg)', padding: 10, borderRadius: 8, fontSize: 12 }}>
                  <strong style={{ color: '#38bdf8' }}>Key Technical Innovation:</strong>
                  <div style={{ color: 'var(--muted)', marginTop: 4 }}>{spin.key_innovation}</div>
                </div>

                <div style={{ marginTop: 'auto', fontSize: 12.5, color: '#10b981', lineHeight: 1.5 }}>
                  <strong>Global Civilian Impact: </strong>
                  <span style={{ color: 'var(--muted)' }}>{spin.earth_impact}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
