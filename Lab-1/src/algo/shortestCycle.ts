/**
 * Shortest cycle (girth) of an undirected simple graph — BFS from every vertex.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Pseudo-code (the UI shows exactly this text; `pseudoLine` below refers to it)
 *
 *   1  best ← ∞ ; bestCycle ← none
 *   2  for each vertex s in V:
 *   3      dist[·] ← ∞ ; parent[·] ← nil ; dist[s] ← 0 ; Q ← [s]
 *   4      while Q not empty:
 *   5          u ← dequeue(Q)
 *   6          for each v in adj[u]:
 *   7              if dist[v] = ∞:
 *   8                  dist[v] ← dist[u]+1 ; parent[v] ← u ; enqueue(Q, v)
 *   9              else if v ≠ parent[u]:
 *  10                  len ← dist[u]+dist[v]+1
 *  11                  if len < best: best ← len ; bestCycle ← rebuild(u, v)
 *  12  return best, bestCycle
 *
 * Why it works
 *   • A BFS from s builds a tree. An edge (u, v) that is NOT a tree edge
 *     (v already visited and v ≠ parent[u]) closes a cycle: the tree path
 *     u → lca, the tree path v → lca, and the edge (u, v). Walking the tree
 *     paths up to the lowest common ancestor `lca` gives a SIMPLE cycle.
 *   • dist[u] + dist[v] + 1 is the length of the closed walk
 *     s ⇝ u – v ⇝ s. It contains that simple cycle, so it is never shorter
 *     than the true cycle; it is exact when lca = s.
 *   • Soundness: every candidate bounds a real cycle from above, hence
 *     best ≥ girth at all times.
 *   • Completeness: let C be a shortest cycle and s any vertex of C. In the
 *     BFS from s, some edge of C is a non-tree edge whose closed walk has
 *     length exactly |C| (BFS distances along C are the cycle distances, since
 *     a shorter route would give a cycle shorter than C). So the minimum over
 *     all sources equals the girth.
 *   • `rebuild` can return a cycle shorter than `len` when lca ≠ s. The
 *     implementation then stores the rebuilt cycle's true length in `best`
 *     so that best === bestCycle.length always holds; the final answer is
 *     unchanged (see the completeness argument).
 *
 * Complexity
 *   Time   O(V · (V + E)): one BFS per source costs O(V + E) (each vertex is
 *          enqueued once, each adjacency entry scanned once); there are V
 *          sources. `rebuild` costs O(V) but runs only when `best` strictly
 *          decreases, which happens at most O(V) times in total.
 *   Space  O(V + E): the adjacency list plus the arrays dist, parent and the
 *          queue (O(V)), reused across sources. The optional trace adds
 *          O(events · V) and is therefore disabled for n > MAX_TRACE_VERTICES.
 *
 * Pure TypeScript — no React, DOM or Node imports.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Graph } from './graph';

/** The trace is not recorded for graphs with more vertices than this. */
export const MAX_TRACE_VERTICES = 40;

export type TraceEventType =
  | 'START_SOURCE'
  | 'ENQUEUE'
  | 'DEQUEUE'
  | 'TREE_EDGE'
  | 'SKIP_PARENT'
  | 'CYCLE_EDGE'
  | 'BEST_UPDATED'
  | 'END_SOURCE'
  | 'DONE';

/**
 * One step of the algorithm. All arrays are immutable snapshots (several
 * consecutive events may share the same array instance when nothing changed).
 * `null` stands for ∞ in `dist` and for "nil" in `parent`.
 */
export interface TraceEvent {
  type: TraceEventType;
  /** Line (1-based) of the pseudo-code this step executes. */
  pseudoLine: number;
  /** BFS source currently being processed (null before the first / after the last). */
  source: number | null;
  /** The dequeued vertex u (null when not applicable). */
  u: number | null;
  /** The neighbour v being examined (null when not applicable). */
  v: number | null;
  queue: readonly number[];
  dist: readonly (number | null)[];
  parent: readonly (number | null)[];
  /** Best (shortest) cycle length so far; null = ∞. */
  best: number | null;
  /** Best cycle so far as a vertex list [v1, …, vk] (closing edge vk–v1 implied). */
  bestCycle: readonly number[] | null;
  /** CYCLE_EDGE / BEST_UPDATED: len = dist[u] + dist[v] + 1 (line 10). */
  cycleLength: number | null;
}

export interface ShortestCycleOptions {
  /** Record the step-by-step trace (ignored, with traceTruncated, when n > 40). */
  trace?: boolean;
}

export interface ShortestCycleResult {
  /** Length of a shortest cycle, or null when the graph is acyclic (a forest). */
  girth: number | null;
  /** A shortest cycle as [v1, …, vk] (closing edge vk–v1 implied), or null. */
  cycle: number[] | null;
  /** Recorded steps; empty when no trace was requested or it was truncated. */
  trace: TraceEvent[];
  /** True when a trace was requested but n > MAX_TRACE_VERTICES. */
  traceTruncated: boolean;
}

/** Pseudo-code shown by the UI. Index i holds line i + 1. */
export const PSEUDO_CODE: readonly string[] = [
  'best ← ∞ ; bestCycle ← none',
  'for each vertex s in V:',
  '    dist[·] ← ∞ ; parent[·] ← nil ; dist[s] ← 0 ; Q ← [s]',
  '    while Q not empty:',
  '        u ← dequeue(Q)',
  '        for each v in adj[u]:',
  '            if dist[v] = ∞:',
  '                dist[v] ← dist[u]+1 ; parent[v] ← u ; enqueue(Q, v)',
  '            else if v ≠ parent[u]:',
  '                len ← dist[u]+dist[v]+1',
  '                if len < best: best ← len ; bestCycle ← rebuild(u, v)',
  'return best, bestCycle',
];

/**
 * Rebuild the simple cycle closed by the non-tree edge (u, v): climb the BFS
 * tree from u and from v to their lowest common ancestor.
 * Returns [u, …, lca, …, v]; the closing edge v–u is implied.
 */
function rebuildCycle(u: number, v: number, dist: Int32Array, parent: Int32Array): number[] {
  const left = [u];
  const right = [v];
  let a = u;
  let b = v;
  while (a !== b) {
    if (dist[a] >= dist[b]) {
      a = parent[a];
      left.push(a);
    } else {
      b = parent[b];
      right.push(b);
    }
  }
  // Both lists now end with the lowest common ancestor; keep it once.
  right.pop();
  return left.concat(right.reverse());
}

/**
 * Canonical form of a cycle: starts at its smallest vertex and continues
 * towards the smaller of that vertex's two cycle-neighbours.
 */
export function canonicalCycle(cycle: readonly number[]): number[] {
  const k = cycle.length;
  if (k < 2) return [...cycle];
  let m = 0;
  for (let i = 1; i < k; i++) if (cycle[i] < cycle[m]) m = i;
  const rotated = [...cycle.slice(m), ...cycle.slice(0, m)];
  if (rotated[1] > rotated[k - 1]) {
    return [rotated[0], ...rotated.slice(1).reverse()];
  }
  return rotated;
}

/**
 * Compute the girth of `adj` (a valid simple undirected graph — see
 * `validateGraph`). With `options.trace` the run is also recorded as a list
 * of TraceEvents so the UI can replay it.
 */
export function shortestCycle(adj: Graph, options: ShortestCycleOptions = {}): ShortestCycleResult {
  const n = adj.length;
  const traceRequested = options.trace === true;
  const recording = traceRequested && n <= MAX_TRACE_VERTICES;
  const trace: TraceEvent[] = [];

  // Working state, reused across sources. -1 encodes ∞ / nil.
  const dist = new Int32Array(n);
  const parent = new Int32Array(n);
  const queue = new Int32Array(n);

  let best = Number.POSITIVE_INFINITY; // line 1
  let bestCycle: number[] | null = null;

  // Immutable snapshots, refreshed only when the underlying state changes.
  let distSnap: (number | null)[] = [];
  let parentSnap: (number | null)[] = [];
  let queueSnap: number[] = [];
  const snapDist = () => {
    distSnap = Array.from(dist, (d) => (d < 0 ? null : d));
  };
  const snapParent = () => {
    parentSnap = Array.from(parent, (p) => (p < 0 ? null : p));
  };

  let head = 0;
  let tail = 0;
  const snapQueue = () => {
    queueSnap = Array.from(queue.subarray(head, tail));
  };

  const emit = (
    type: TraceEventType,
    pseudoLine: number,
    source: number | null,
    u: number | null,
    v: number | null,
    cycleLength: number | null = null,
  ) => {
    trace.push({
      type,
      pseudoLine,
      source,
      u,
      v,
      queue: queueSnap,
      dist: distSnap,
      parent: parentSnap,
      best: Number.isFinite(best) ? best : null,
      bestCycle,
      cycleLength,
    });
  };

  for (let s = 0; s < n; s++) {
    // line 3
    dist.fill(-1);
    parent.fill(-1);
    dist[s] = 0;
    head = 0;
    tail = 0;
    queue[tail++] = s;
    if (recording) {
      snapDist();
      snapParent();
      snapQueue();
      emit('START_SOURCE', 3, s, null, null);
    }

    // line 4
    while (head < tail) {
      const u = queue[head++]; // line 5
      if (recording) {
        snapQueue();
        emit('DEQUEUE', 5, s, u, null);
      }

      // line 6
      for (const v of adj[u]) {
        if (dist[v] === -1) {
          // lines 7-8: tree edge
          dist[v] = dist[u] + 1;
          parent[v] = u;
          queue[tail++] = v;
          if (recording) {
            snapDist();
            snapParent();
            emit('TREE_EDGE', 8, s, u, v); // queue snapshot is still the pre-enqueue one
            snapQueue();
            emit('ENQUEUE', 8, s, u, v);
          }
        } else if (v !== parent[u]) {
          // lines 9-11: non-tree edge closes a cycle
          const len = dist[u] + dist[v] + 1;
          if (recording) emit('CYCLE_EDGE', 10, s, u, v, len);
          if (len < best) {
            const cycle = rebuildCycle(u, v, dist, parent);
            // `cycle.length <= len`; it is smaller when lca ≠ s. Store the true
            // length so that best === bestCycle.length (see header comment).
            best = cycle.length;
            bestCycle = canonicalCycle(cycle);
            if (recording) emit('BEST_UPDATED', 11, s, u, v, len);
          }
        } else if (recording) {
          emit('SKIP_PARENT', 9, s, u, v);
        }
      }
    }

    if (recording) {
      snapQueue(); // empty
      emit('END_SOURCE', 4, s, null, null);
    }
  }

  // line 12
  if (recording) {
    distSnap = new Array<number | null>(n).fill(null);
    parentSnap = new Array<number | null>(n).fill(null);
    queueSnap = [];
    emit('DONE', 12, null, null, null);
  }

  return {
    girth: bestCycle ? best : null,
    cycle: bestCycle,
    trace,
    traceTruncated: traceRequested && !recording,
  };
}
