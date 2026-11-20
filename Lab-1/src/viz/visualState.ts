/**
 * Pure mapping  trace[index]  →  what the canvas should show.
 *
 * Nothing here reads React state, the DOM or earlier events: every colour and
 * label on screen is a function of ONE TraceEvent (plus the static graph).
 */

import { edgeKey } from '../algo/graph';
import type { TraceEvent } from '../algo/shortestCycle';

/** Base fill of a vertex (mutually exclusive). */
export type VertexFill = 'idle' | 'visited' | 'queued';

// A `type` (not an interface) so it can be used as React Flow node data (Record<string, unknown>).
export type VertexVisual = {
  /** idle = not reached yet, queued = discovered and waiting, visited = already dequeued. */
  fill: VertexFill;
  /** The BFS source s. */
  isSource: boolean;
  /** The vertex u that was just dequeued and whose neighbours are being scanned. */
  isCurrent: boolean;
  /** The neighbour v currently being examined. */
  isTarget: boolean;
  /** Lies on the best cycle found so far. */
  inBest: boolean;
  /** BFS distance from the source, null = ∞. */
  dist: number | null;
};

/** Edge states by increasing priority: idle < tree < best < examined < flash. */
export type EdgeKind = 'idle' | 'tree' | 'best' | 'examined' | 'flash';

export const EDGE_Z: Record<EdgeKind, number> = { idle: 0, tree: 1, best: 2, examined: 3, flash: 4 };

export interface VisualState {
  vertices: VertexVisual[];
  /** Only edges that are not 'idle' are listed (keys are `edgeKey(u, v)`). */
  edges: Map<string, EdgeKind>;
}

/** Events during which `u` is the active (dequeued) vertex. */
const HAS_ACTIVE_U = new Set<TraceEvent['type']>(['DEQUEUE', 'TREE_EDGE', 'ENQUEUE', 'SKIP_PARENT', 'CYCLE_EDGE', 'BEST_UPDATED']);
/** Events during which the edge (u, v) is "being examined". */
const EXAMINES_EDGE = new Set<TraceEvent['type']>(['TREE_EDGE', 'ENQUEUE', 'SKIP_PARENT']);
/** Events during which (u, v) is the cycle-closing edge. */
const CLOSES_CYCLE = new Set<TraceEvent['type']>(['CYCLE_EDGE', 'BEST_UPDATED']);

/** Everything idle (no run yet). */
export function blankState(n: number): VisualState {
  return {
    vertices: Array.from({ length: n }, () => ({
      fill: 'idle' as const,
      isSource: false,
      isCurrent: false,
      isTarget: false,
      inBest: false,
      dist: null,
    })),
    edges: new Map(),
  };
}

/**
 * Derive the visual state of an `n`-vertex graph from a single trace event.
 * Pass `null` for "nothing has run yet".
 */
export function deriveVisualState(n: number, event: TraceEvent | null): VisualState {
  const state = blankState(n);
  if (event === null) return state;

  const queued = new Set<number>(event.queue);
  // The queue snapshot of TREE_EDGE predates the enqueue; v is about to join it.
  if (event.type === 'TREE_EDGE' && event.v !== null) queued.add(event.v);

  for (let i = 0; i < n; i++) {
    const vis = state.vertices[i];
    vis.dist = event.dist[i] ?? null;
    vis.fill = queued.has(i) ? 'queued' : vis.dist !== null ? 'visited' : 'idle';
  }

  if (event.type !== 'DONE' && event.source !== null) state.vertices[event.source].isSource = true;
  if (event.u !== null && HAS_ACTIVE_U.has(event.type)) state.vertices[event.u].isCurrent = true;
  if (event.v !== null) state.vertices[event.v].isTarget = true;

  // BFS tree edges (parent pointers).
  event.parent.forEach((p, w) => {
    if (p !== null) state.edges.set(edgeKey(p, w), 'tree');
  });

  // Best cycle so far: persistent highlight (beats "tree" but not the transient states).
  const best = event.bestCycle;
  if (best) {
    best.forEach((a, i) => {
      state.vertices[a].inBest = true;
      state.edges.set(edgeKey(a, best[(i + 1) % best.length]), 'best');
    });
  }

  if (event.u !== null && event.v !== null) {
    if (EXAMINES_EDGE.has(event.type)) state.edges.set(edgeKey(event.u, event.v), 'examined');
    if (CLOSES_CYCLE.has(event.type)) state.edges.set(edgeKey(event.u, event.v), 'flash');
  }
  return state;
}

/**
 * A synthetic final event used when no trace exists (n > 40): the canvas shows
 * the answer — the shortest cycle highlighted — without any animation.
 */
export function finalEvent(n: number, girth: number | null, cycle: readonly number[] | null): TraceEvent {
  return {
    type: 'DONE',
    pseudoLine: 12,
    source: null,
    u: null,
    v: null,
    queue: [],
    dist: new Array<number | null>(n).fill(null),
    parent: new Array<number | null>(n).fill(null),
    best: girth,
    bestCycle: cycle,
    cycleLength: null,
  };
}
