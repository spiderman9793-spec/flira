/**
 * 🔥 FLIRA Graph RAG Engine
 * Inspired by Graphify (Graphify-Labs/graphify) & LangChain (langchain-ai/langchain)
 *
 * Deterministic Knowledge Graph with:
 * - Typed entity nodes (Investigations, PSI Studies, Incidents, Spinoffs, Fuels, Phenomena, Safety Controls)
 * - Directional, explained relation edges (CAUSED_BY, MITIGATED_BY, OBSERVES, EXTENDS_MODEL, SPUN_OFF_FROM)
 * - Multi-hop subgraph (ego-network) extraction
 * - Dense, citation-anchored context serialization for RAG prompts
 */

import rawInvestigations from '../data/investigations.json';
import rawPsiRegistry from '../data/psi_registry.json';
import rawIncidents from '../data/incidents.json';
import rawSpinoffs from '../data/spinoffs.json';

export type NodeType =
  | 'investigation'
  | 'psi_study'
  | 'incident'
  | 'spinoff'
  | 'phenomenon'
  | 'fuel'
  | 'facility'
  | 'safety_control';

export type RelationType =
  | 'DOCUMENTED_BY'
  | 'CAUSED_BY'
  | 'MITIGATED_BY'
  | 'SPUN_OFF_FROM'
  | 'EXTENDS_MODEL'
  | 'USES_FACILITY'
  | 'OBSERVES'
  | 'TESTED_FUEL'
  | 'RELATED_TO';

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  description: string;
  properties?: Record<string, string | number | boolean>;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: RelationType;
  weight: number;
  explanation: string;
}

export interface Subgraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  paths: string[];
}

export class CombustionKnowledgeGraph {
  public nodes = new Map<string, GraphNode>();
  public edges: GraphEdge[] = [];
  public adj = new Map<string, GraphEdge[]>();
  public revAdj = new Map<string, GraphEdge[]>();

  constructor() {
    this.buildGraph();
  }

  public addNode(node: GraphNode) {
    if (!this.nodes.has(node.id)) {
      this.nodes.set(node.id, node);
      this.adj.set(node.id, []);
      this.revAdj.set(node.id, []);
    }
  }

  public addEdge(edge: GraphEdge) {
    this.edges.push(edge);
    this.adj.get(edge.source)?.push(edge);
    this.revAdj.get(edge.target)?.push(edge);
  }

  private buildGraph() {
    // 1. Add Investigations
    const investigations = (rawInvestigations as any).investigations || [];
    for (const inv of investigations) {
      this.addNode({
        id: inv.id,
        label: inv.name,
        type: 'investigation',
        description: inv.short,
        properties: {
          facility: inv.facility,
          hardware: inv.hardware,
          psi_accession: inv.psi_accession || '',
          finding: inv.finding || '',
        },
      });

      // Link to Facility
      const facId = `facility:${inv.facility.split(' ')[0].toLowerCase()}`;
      this.addNode({
        id: facId,
        label: inv.facility,
        type: 'facility',
        description: `Experimental platform: ${inv.facility}`,
      });
      this.addEdge({
        source: inv.id,
        target: facId,
        relation: 'USES_FACILITY',
        weight: 1.0,
        explanation: `${inv.id} was conducted using ${inv.facility}`,
      });

      // Link to Fuels
      for (const fuel of inv.fuels || []) {
        const fuelId = `fuel:${fuel.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        this.addNode({
          id: fuelId,
          label: fuel,
          type: 'fuel',
          description: `Combustible material: ${fuel}`,
        });
        this.addEdge({
          source: inv.id,
          target: fuelId,
          relation: 'TESTED_FUEL',
          weight: 1.2,
          explanation: `${inv.id} evaluated flammability of ${fuel}`,
        });
      }

      // Link to PSI Accession
      if (inv.psi_accession) {
        this.addNode({
          id: inv.psi_accession,
          label: `NASA ${inv.psi_accession}`,
          type: 'psi_study',
          description: `Official NASA PSI Study ${inv.psi_accession}`,
        });
        this.addEdge({
          source: inv.id,
          target: inv.psi_accession,
          relation: 'DOCUMENTED_BY',
          weight: 1.5,
          explanation: `${inv.id} flight data is catalogued under NASA ${inv.psi_accession}`,
        });
      }
    }

    // 2. Add Key Physics Phenomena
    const phenomena = [
      {
        id: 'phenom:cool_flames',
        label: 'Droplet Cool Flames',
        desc: 'Invisible, low-temperature (~500–800 K) droplet burning driven by low-T hydrocarbon chemistry without thermal buoyancy.',
      },
      {
        id: 'phenom:thermo_convective_oscillation',
        label: 'Thermo-Convective Perturbation & Oscillation',
        desc: 'Unintentional air drift (2–5 cm/s) or thermal forcing triggering oscillatory cool flame instabilities.',
      },
      {
        id: 'phenom:supercritical_o2_arc',
        label: 'Supercritical Oxygen Combustion',
        desc: 'Violent combustion of insulation materials (Teflon) in 100% pure supercritical cryogenic oxygen.',
      },
      {
        id: 'phenom:absence_of_buoyancy',
        label: 'Absence of Buoyant Convection (0g)',
        desc: 'Lack of natural gravity-driven convection causing spherical diffusion flames and uniform ceiling-to-floor smoke dispersion.',
      },
      {
        id: 'phenom:flame_extinguishment_heat_sink',
        label: 'Thermal Sink Flame Extinguishment',
        desc: 'Flame suppression via molar heat-capacity extraction and micro-droplet vaporization rather than simple oxygen starvation.',
      },
    ];

    for (const p of phenomena) {
      this.addNode({
        id: p.id,
        label: p.label,
        type: 'phenomenon',
        description: p.desc,
      });
    }

    // Connect PSI-117 and FLEX to Cool Flames
    this.addEdge({
      source: 'PSI-117',
      target: 'phenom:cool_flames',
      relation: 'OBSERVES',
      weight: 2.0,
      explanation: 'PSI-117 models n-alkane droplet cool flame stability windows using OpenFOAM CFD',
    });
    this.addEdge({
      source: 'PSI-117',
      target: 'phenom:thermo_convective_oscillation',
      relation: 'OBSERVES',
      weight: 2.0,
      explanation: 'PSI-117 maps run-to-run variability from 2-5 cm/s drift and thermal forcing',
    });
    this.addEdge({
      source: 'PSI-117',
      target: 'FLEX',
      relation: 'EXTENDS_MODEL',
      weight: 1.8,
      explanation: 'PSI-117 uses flight measurements from ISS FLEX experiments as validation anchor',
    });

    // 3. Add Historical Incidents
    for (const inc of rawIncidents as any[]) {
      this.addNode({
        id: `incident:${inc.id}`,
        label: inc.name,
        type: 'incident',
        description: `${inc.mission} (${inc.date}): ${inc.root_cause}`,
        properties: {
          date: inc.date,
          o2_pct: inc.atmosphere.o2_pct,
          pressure_psia: inc.atmosphere.pressure_psia,
        },
      });

      // Link Incident to Root Causes & Redesigns
      if (inc.id === 'apollo-13') {
        this.addEdge({
          source: `incident:${inc.id}`,
          target: 'phenom:supercritical_o2_arc',
          relation: 'CAUSED_BY',
          weight: 2.0,
          explanation: 'Apollo 13 explosion was triggered by Teflon insulation ignition in 1,000 psia supercritical O2',
        });
        const ctrlId = 'control:apollo13_redesign';
        this.addNode({
          id: ctrlId,
          label: 'Removal of Cryo Stir Fans & Armored Wiring',
          type: 'safety_control',
          description: 'Elimination of internal motors, stainless steel wire conduits, 3rd isolated O2 tank',
        });
        this.addEdge({
          source: `incident:${inc.id}`,
          target: ctrlId,
          relation: 'MITIGATED_BY',
          weight: 1.8,
          explanation: 'NASA eliminated stir fans and added isolated 3rd oxygen tanks after Apollo 13',
        });
      }

      if (inc.id === 'apollo-1') {
        const ctrlId = 'control:apollo1_redesign';
        this.addNode({
          id: ctrlId,
          label: 'Outward Quick-Release Hatch & NASA-STD-6001',
          type: 'safety_control',
          description: '5-second outward opening hatch, 60/40 mixed launch atmosphere, non-combustible Beta/PBI fabrics',
        });
        this.addEdge({
          source: `incident:${inc.id}`,
          target: ctrlId,
          relation: 'MITIGATED_BY',
          weight: 2.0,
          explanation: 'Apollo 1 led directly to outward hatches, 60/40 launch gas, and NASA-STD-6001',
        });
      }

      if (inc.id === 'mir-1997') {
        this.addEdge({
          source: `incident:${inc.id}`,
          target: 'phenom:absence_of_buoyancy',
          relation: 'CAUSED_BY',
          weight: 1.8,
          explanation: 'Mir fire smoke expanded uniformly without buoyant ceiling stratification in microgravity',
        });
      }
    }

    // 4. Add Spinoffs
    for (const spin of rawSpinoffs as any[]) {
      this.addNode({
        id: `spinoff:${spin.id}`,
        label: spin.title,
        type: 'spinoff',
        description: `NASA Spinoff ${spin.spinoff_id} (${spin.year}): ${spin.earth_impact}`,
        properties: {
          spinoff_id: spin.spinoff_id,
          year: spin.year,
        },
      });

      if (spin.id === 'firemans-air-tanks') {
        this.addEdge({
          source: `spinoff:${spin.id}`,
          target: 'BASS',
          relation: 'RELATED_TO',
          weight: 1.2,
          explanation: 'Adapted Apollo spacesuit composite pressure vessels, saving 40% cylinder weight',
        });
      }
      if (spin.id === 'fire-detector') {
        this.addEdge({
          source: `spinoff:${spin.id}`,
          target: 'SAME',
          relation: 'RELATED_TO',
          weight: 1.5,
          explanation: 'Shuttle smoke detector discriminating combustion aerosol soot from dust motes',
        });
      }
      if (spin.id === 'fire-attire') {
        this.addEdge({
          source: `spinoff:${spin.id}`,
          target: 'incident:apollo-1',
          relation: 'SPUN_OFF_FROM',
          weight: 2.0,
          explanation: 'PBI synthetic fibers commercialized post-Apollo 1 to protect civilian firefighters',
        });
      }
      if (spin.id === 'water-mist-suppression') {
        this.addEdge({
          source: `spinoff:${spin.id}`,
          target: 'FLEX',
          relation: 'SPUN_OFF_FROM',
          weight: 1.8,
          explanation: 'Droplet vaporization phase-change cooling derived from ISS FLEX experiments',
        });
      }
    }
  }

  /**
   * Find matching seed nodes from query text
   */
  public findSeedNodes(query: string): GraphNode[] {
    const q = query.toLowerCase();
    const tokens = q.split(/[^a-z0-9_-]+/).filter((t) => t.length > 2);
    const matches: { node: GraphNode; score: number }[] = [];

    for (const node of this.nodes.values()) {
      let score = 0;
      const label = node.label.toLowerCase();
      const desc = node.description.toLowerCase();
      const id = node.id.toLowerCase();

      if (q.includes(id) || id.includes(q)) score += 10;
      if (label.includes(q) || q.includes(label)) score += 8;

      for (const t of tokens) {
        if (id.includes(t)) score += 4;
        if (label.includes(t)) score += 3;
        if (desc.includes(t)) score += 1;
      }

      // Keyword boosts
      if (q.includes('cool flame') && (id.includes('117') || id.includes('cool_flames'))) score += 12;
      if (q.includes('apollo 13') && id.includes('apollo-13')) score += 15;
      if (q.includes('apollo 1') && id.includes('apollo-1')) score += 15;
      if (q.includes('mir') && id.includes('mir')) score += 15;
      if ((q.includes('tank') || q.includes('fireman')) && id.includes('air-tanks')) score += 15;
      if ((q.includes('detector') || q.includes('smoke')) && id.includes('fire-detector')) score += 15;
      if ((q.includes('attire') || q.includes('pbi') || q.includes('fires')) && id.includes('fire-attire')) score += 15;

      if (score > 3) {
        matches.push({ node, score });
      }
    }

    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, 5).map((m) => m.node);
  }

  /**
   * Extract ego-network subgraph around seed nodes (up to maxHops)
   */
  public extractSubgraph(seedNodes: GraphNode[], maxHops = 2, maxNodes = 12): Subgraph {
    const visitedNodes = new Map<string, GraphNode>();
    const visitedEdges: GraphEdge[] = [];
    const pathExplanations: string[] = [];

    let currentLevel = seedNodes.map((n) => n.id);
    for (const node of seedNodes) {
      visitedNodes.set(node.id, node);
    }

    for (let hop = 0; hop < maxHops; hop++) {
      const nextLevel: string[] = [];
      for (const currId of currentLevel) {
        const outEdges = this.adj.get(currId) || [];
        const inEdges = this.revAdj.get(currId) || [];
        const allEdges = [...outEdges, ...inEdges];

        for (const edge of allEdges) {
          const neighborId = edge.source === currId ? edge.target : edge.source;
          if (!visitedEdges.some((e) => e.source === edge.source && e.target === edge.target)) {
            visitedEdges.push(edge);
            pathExplanations.push(edge.explanation);
          }

          if (!visitedNodes.has(neighborId) && visitedNodes.size < maxNodes) {
            const neighborNode = this.nodes.get(neighborId);
            if (neighborNode) {
              visitedNodes.set(neighborId, neighborNode);
              nextLevel.push(neighborId);
            }
          }
        }
      }
      currentLevel = nextLevel;
      if (visitedNodes.size >= maxNodes) break;
    }

    return {
      nodes: Array.from(visitedNodes.values()),
      edges: visitedEdges,
      paths: Array.from(new Set(pathExplanations)),
    };
  }

  /**
   * Format subgraph into citation-anchored markdown context for RAG
   */
  public formatSubgraphContext(subgraph: Subgraph): string {
    if (!subgraph.nodes.length) return '';

    const lines: string[] = [];
    lines.push('### 🕸️ Knowledge Graph Subgraph Context (Graph RAG):');
    lines.push('**Key Entities:**');
    for (const node of subgraph.nodes) {
      lines.push(`* **[${node.type.toUpperCase()}: ${node.id}]** ${node.label} — ${node.description}`);
    }

    if (subgraph.paths.length) {
      lines.push('\n**Relational Traversal Paths & Causality:**');
      for (const p of subgraph.paths) {
        lines.push(`* ${p}`);
      }
    }

    return lines.join('\n');
  }
}

export const KNOWLEDGE_GRAPH = new CombustionKnowledgeGraph();

/**
 * End-to-end Graph RAG Query
 */
export function queryGraphRag(query: string): {
  subgraph: Subgraph;
  contextText: string;
  matchedEntityIds: string[];
} {
  const seeds = KNOWLEDGE_GRAPH.findSeedNodes(query);
  const subgraph = KNOWLEDGE_GRAPH.extractSubgraph(seeds, 2, 10);
  const contextText = KNOWLEDGE_GRAPH.formatSubgraphContext(subgraph);
  return {
    subgraph,
    contextText,
    matchedEntityIds: seeds.map((s) => s.id),
  };
}
