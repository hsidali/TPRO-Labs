/**
 * Graph sources: named presets and seeded Erdős–Rényi random graphs.
 * Pure TypeScript (no React / DOM / Node imports).
 */

import { buildGraph, type Graph } from './graph';

/** A layout hint: one [x, y] per vertex, in abstract units (roughly -1.5 … 1.5). */
export type LayoutHint = ReadonlyArray<readonly [number, number]>;

export interface Preset {
  id: string;
  label: string;
  description: string;
  graph: Graph;
  /** Expected girth (null = acyclic). Used by the tests and shown in the UI. */
  expectedGirth: number | null;
  /** Optional hand-made layout; absent → circular layout. */
  layout?: LayoutHint;
}

// ───────────────────────────────── building blocks ──────────────────────────

/** Cycle C_k on vertices 0..k-1 (k ≥ 3). */
export function cycleGraph(k: number): Graph {
  const edges: [number, number][] = [];
  for (let i = 0; i < k; i++) edges.push([i, (i + 1) % k]);
  return buildGraph(k, edges);
}

/** Complete graph K_n. */
export function completeGraph(n: number): Graph {
  const edges: [number, number][] = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) edges.push([i, j]);
  return buildGraph(n, edges);
}

/** Grid with `rows` × `cols` vertices, numbered row by row. */
export function gridGraph(rows: number, cols: number): Graph {
  const edges: [number, number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = r * cols + c;
      if (c + 1 < cols) edges.push([id, id + 1]);
      if (r + 1 < rows) edges.push([id, id + cols]);
    }
  }
  return buildGraph(rows * cols, edges);
}

/** The Petersen graph: outer 5-cycle 0..4, inner pentagram 5..9, spokes i–(i+5). */
export function petersenGraph(): Graph {
  const edges: [number, number][] = [];
  for (let i = 0; i < 5; i++) {
    edges.push([i, (i + 1) % 5]); // outer cycle
    edges.push([i, i + 5]); // spoke
    edges.push([5 + i, 5 + ((i + 2) % 5)]); // inner pentagram
  }
  return buildGraph(10, edges);
}

/** Vertex-disjoint union: the vertices of `b` are shifted by |V(a)|. */
export function disjointUnion(a: Graph, b: Graph): Graph {
  const shift = a.length;
  return [...a.map((nbrs) => [...nbrs]), ...b.map((nbrs) => nbrs.map((v) => v + shift))];
}

function polygon(count: number, cx: number, cy: number, radius: number, startAngle = -Math.PI / 2) {
  return Array.from({ length: count }, (_, i): [number, number] => {
    const a = startAngle + (2 * Math.PI * i) / count;
    return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)];
  });
}

// ─────────────────────────────────── presets ────────────────────────────────

const treeGraph = buildGraph(8, [
  [0, 1],
  [0, 2],
  [1, 3],
  [1, 4],
  [2, 5],
  [2, 6],
  [6, 7],
]);

// C4 (0-1-2-3) with a pendant vertex 4 on 0, a path 5-6-7 and an isolated vertex 8.
const disconnectedOneCycle = buildGraph(9, [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [0, 4],
  [5, 6],
  [6, 7],
]);

export const PRESETS: readonly Preset[] = [
  {
    id: 'c3',
    label: 'Triangle C3',
    description: 'A single 3-cycle.',
    graph: cycleGraph(3),
    expectedGirth: 3,
  },
  {
    id: 'c4',
    label: 'Square C4',
    description: 'A single 4-cycle.',
    graph: cycleGraph(4),
    expectedGirth: 4,
  },
  {
    id: 'c5',
    label: 'Pentagon C5',
    description: 'A single 5-cycle.',
    graph: cycleGraph(5),
    expectedGirth: 5,
  },
  {
    id: 'tree',
    label: 'Tree (no cycle)',
    description: 'An acyclic graph: the algorithm must report that no cycle exists.',
    graph: treeGraph,
    expectedGirth: null,
    layout: [
      [0, -1.2],
      [-0.9, -0.4],
      [0.9, -0.4],
      [-1.4, 0.5],
      [-0.4, 0.5],
      [0.4, 0.5],
      [1.4, 0.5],
      [1.4, 1.3],
    ],
  },
  {
    id: 'k4',
    label: 'Complete graph K4',
    description: 'Every pair adjacent: girth 3.',
    graph: completeGraph(4),
    expectedGirth: 3,
  },
  {
    id: 'petersen',
    label: 'Petersen graph',
    description: '10 vertices, 15 edges, girth 5.',
    graph: petersenGraph(),
    expectedGirth: 5,
    layout: [...polygon(5, 0, 0, 1.3), ...polygon(5, 0, 0, 0.62)],
  },
  {
    id: 'c3-c6',
    label: 'C3 + C6 (disjoint)',
    description: 'A triangle and a hexagon in separate components: girth 3.',
    graph: disjointUnion(cycleGraph(3), cycleGraph(6)),
    expectedGirth: 3,
    layout: [...polygon(3, -1.45, 0, 0.62), ...polygon(6, 0.75, 0, 0.9, 0)],
  },
  {
    id: 'grid3',
    label: '3×3 grid',
    description: 'Nine vertices on a grid: girth 4.',
    graph: gridGraph(3, 3),
    expectedGirth: 4,
    layout: Array.from({ length: 9 }, (_, i): [number, number] => [((i % 3) - 1) * 0.9, (Math.floor(i / 3) - 1) * 0.9]),
  },
  {
    id: 'disconnected',
    label: 'Disconnected, one cycle',
    description: 'A 4-cycle with a pendant vertex, a path and an isolated vertex: girth 4.',
    graph: disconnectedOneCycle,
    expectedGirth: 4,
    layout: [
      [-1.1, -0.45],
      [-0.3, -0.45],
      [-0.3, 0.35],
      [-1.1, 0.35],
      [-1.8, -1.1],
      [0.5, -0.9],
      [1.15, -0.2],
      [1.8, -0.9],
      [0.6, 0.9],
    ],
  },
];

export function findPreset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}

// ─────────────────────────────── random graphs ──────────────────────────────

/** mulberry32: a tiny, fast, seedable PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Turn free text into a 32-bit seed (integers map to themselves, other text is FNV-1a hashed). */
export function parseSeed(text: string): number {
  const trimmed = text.trim();
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed) >>> 0;
  let h = 0x811c9dc5;
  for (let i = 0; i < trimmed.length; i++) {
    h ^= trimmed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Erdős–Rényi G(n, p): each of the n(n-1)/2 possible edges is present
 * independently with probability p. Reproducible for a given (n, p, seed).
 */
export function randomGraph(n: number, p: number, seed: number): Graph {
  const prob = Math.min(1, Math.max(0, p));
  const rand = mulberry32(seed);
  const edges: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (rand() < prob) edges.push([i, j]);
    }
  }
  return buildGraph(n, edges);
}
