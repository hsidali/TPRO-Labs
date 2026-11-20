import { describe, expect, it } from 'vitest';
import { formatCycle, formatReport } from './format';
import {
  PRESETS,
  completeGraph,
  cycleGraph,
  findPreset,
  gridGraph,
  mulberry32,
  parseSeed,
  petersenGraph,
  randomGraph,
} from './generators';
import {
  GraphError,
  buildGraph,
  edgeCount,
  edgeKey,
  edgeList,
  formatGraphText,
  parseGraphText,
  validateGraph,
  type Graph,
} from './graph';
import { MAX_TRACE_VERTICES, PSEUDO_CODE, shortestCycle, type TraceEvent } from './shortestCycle';

/** True iff `cycle` is a simple cycle of `adj`: ≥ 3 distinct vertices, consecutive ones adjacent, closing edge included. */
function isSimpleCycle(adj: Graph, cycle: readonly number[]): boolean {
  const k = cycle.length;
  if (k < 3) return false;
  if (new Set(cycle).size !== k) return false;
  for (let i = 0; i < k; i++) {
    const a = cycle[i];
    const b = cycle[(i + 1) % k];
    if (!adj[a]?.includes(b)) return false;
  }
  return true;
}

/**
 * Independent oracle: enumerate every simple cycle by DFS (start vertex = the
 * smallest vertex of the cycle) and keep the shortest. Exponential, so only
 * used for n ≤ 8.
 */
function bruteForceGirth(adj: Graph): number | null {
  const n = adj.length;
  let best: number | null = null;
  const onPath = new Array<boolean>(n).fill(false);
  const dfs = (start: number, u: number, length: number) => {
    for (const v of adj[u]) {
      if (v === start && length >= 3) {
        if (best === null || length < best) best = length;
      } else if (v > start && !onPath[v]) {
        onPath[v] = true;
        dfs(start, v, length + 1);
        onPath[v] = false;
      }
    }
  };
  for (let s = 0; s < n; s++) {
    onPath[s] = true;
    dfs(s, s, 1);
    onPath[s] = false;
  }
  return best;
}

describe('presets', () => {
  for (const preset of PRESETS) {
    it(`${preset.label}: girth = ${preset.expectedGirth ?? 'none'}`, () => {
      expect(() => validateGraph(preset.graph)).not.toThrow();
      const result = shortestCycle(preset.graph);
      expect(result.girth).toBe(preset.expectedGirth);
      if (preset.expectedGirth === null) {
        expect(result.cycle).toBeNull();
      } else {
        expect(result.cycle).not.toBeNull();
        expect(isSimpleCycle(preset.graph, result.cycle!)).toBe(true);
        expect(result.cycle!.length).toBe(result.girth);
      }
    });
  }

  it('covers the nine presets required by the brief', () => {
    expect(PRESETS.map((p) => p.id)).toEqual(['c3', 'c4', 'c5', 'tree', 'k4', 'petersen', 'c3-c6', 'grid3', 'disconnected']);
    expect(findPreset('petersen')?.expectedGirth).toBe(5);
  });

  it('known expected values (independent of the preset table)', () => {
    expect(shortestCycle(cycleGraph(3)).girth).toBe(3);
    expect(shortestCycle(cycleGraph(4)).girth).toBe(4);
    expect(shortestCycle(cycleGraph(5)).girth).toBe(5);
    expect(shortestCycle(completeGraph(4)).girth).toBe(3);
    expect(shortestCycle(petersenGraph()).girth).toBe(5);
    expect(shortestCycle(gridGraph(3, 3)).girth).toBe(4);
    expect(shortestCycle(buildGraph(4, [[0, 1], [1, 2], [2, 3]])).girth).toBeNull();
  });
});

describe('edge cases', () => {
  it('empty graph, single vertex and isolated vertices have no cycle', () => {
    expect(shortestCycle([]).girth).toBeNull();
    expect(shortestCycle([[]]).girth).toBeNull();
    expect(shortestCycle(buildGraph(5, [])).cycle).toBeNull();
  });

  it('a single edge is not a cycle (the parent edge is skipped)', () => {
    expect(shortestCycle(buildGraph(2, [[0, 1]])).girth).toBeNull();
  });

  it('finds the exact cycle even when the BFS tree path is not through the source (lca ≠ s)', () => {
    // 0 – 1 – (triangle 1,2,3) – 4: from source 0 the closed walk through (2,3) has length 5, the cycle has 3.
    const g = buildGraph(5, [[0, 1], [1, 2], [1, 3], [2, 3], [3, 4]]);
    const r = shortestCycle(g, { trace: true });
    expect(r.girth).toBe(3);
    expect(r.cycle).toEqual([1, 2, 3]);
    // best always equals the length of the stored cycle, in every step of the trace
    for (const ev of r.trace) {
      if (ev.bestCycle) expect(ev.best).toBe(ev.bestCycle.length);
      else expect(ev.best).toBeNull();
    }
  });

  it('returns a canonical cycle (starts at its smallest vertex)', () => {
    const r = shortestCycle(cycleGraph(6));
    expect(r.cycle).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe('random graphs: brute-force cross-check', () => {
  it('matches exhaustive cycle enumeration on 200 random graphs with n ≤ 8', () => {
    const rand = mulberry32(2024);
    let withCycle = 0;
    for (let i = 0; i < 200; i++) {
      const n = 1 + Math.floor(rand() * 8); // 1..8
      const p = rand();
      const g = randomGraph(n, p, 1000 + i);
      const expected = bruteForceGirth(g);
      const r = shortestCycle(g);
      expect(r.girth, `graph #${i}: n=${n}, p=${p.toFixed(2)}\n${formatGraphText(g)}`).toBe(expected);
      if (expected === null) {
        expect(r.cycle).toBeNull();
      } else {
        withCycle++;
        expect(isSimpleCycle(g, r.cycle!)).toBe(true);
        expect(r.cycle!.length).toBe(expected);
      }
    }
    // sanity: the sample is not degenerate
    expect(withCycle).toBeGreaterThan(60);
    expect(withCycle).toBeLessThan(200);
  });

  it('matches brute force on 150 structured graphs that cover every girth from 3 to 8', () => {
    // Uniform G(n, p) with n ≤ 8 is almost always a forest or has a triangle (see the test above), so
    // it barely exercises girths 4-8. Here: a random k-cycle (k = 3..8) with pendant vertices hanging
    // off random vertices, up to two random chords, and a random relabelling of the vertices.
    const rand = mulberry32(8);
    const byGirth = new Map<number, number>();
    for (let i = 0; i < 150; i++) {
      const k = 3 + (i % 6);
      const n = k + Math.floor(rand() * (9 - k)); // k..8
      const edges: [number, number][] = [];
      for (let v = 0; v < k; v++) edges.push([v, (v + 1) % k]);
      for (let v = k; v < n; v++) edges.push([v, Math.floor(rand() * v)]);
      const have = new Set(edges.map(([a, b]) => edgeKey(a, b)));
      for (let c = Math.floor(rand() * 3); c > 0; c--) {
        const a = Math.floor(rand() * n);
        const b = Math.floor(rand() * n);
        if (a !== b && !have.has(edgeKey(a, b))) {
          have.add(edgeKey(a, b));
          edges.push([a, b]);
        }
      }
      const perm = Array.from({ length: n }, (_, v) => v).sort(() => rand() - 0.5);
      const g = buildGraph(n, edges.map(([a, b]) => [perm[a], perm[b]] as [number, number]));

      const expected = bruteForceGirth(g);
      const r = shortestCycle(g);
      expect(r.girth, `graph #${i} (k=${k}):\n${formatGraphText(g)}`).toBe(expected);
      expect(expected).not.toBeNull(); // every graph contains the k-cycle
      expect(isSimpleCycle(g, r.cycle!)).toBe(true);
      expect(r.cycle!.length).toBe(expected);
      byGirth.set(expected!, (byGirth.get(expected!) ?? 0) + 1);
    }
    for (let girth = 3; girth <= 8; girth++) {
      expect(byGirth.get(girth) ?? 0, `girth ${girth} coverage: ${JSON.stringify([...byGirth])}`).toBeGreaterThanOrEqual(5);
    }
  });

  it('also agrees on larger graphs (validity + equal result with and without trace)', () => {
    for (let i = 0; i < 30; i++) {
      const g = randomGraph(25, 0.04 + 0.01 * i, 77 + i);
      const plain = shortestCycle(g);
      const traced = shortestCycle(g, { trace: true });
      expect(traced.girth).toBe(plain.girth);
      expect(traced.cycle).toEqual(plain.cycle);
      if (plain.cycle) expect(isSimpleCycle(g, plain.cycle)).toBe(true);
    }
  });
});

describe('trace', () => {
  const g = gridGraph(3, 3);
  const r = shortestCycle(g, { trace: true });
  const trace = r.trace;

  it('is empty unless requested', () => {
    const plain = shortestCycle(g);
    expect(plain.trace).toEqual([]);
    expect(plain.traceTruncated).toBe(false);
  });

  it('starts with START_SOURCE and ends with DONE', () => {
    expect(trace[0].type).toBe('START_SOURCE');
    expect(trace.at(-1)!.type).toBe('DONE');
    expect(trace.at(-1)!.best).toBe(4);
    expect(trace.at(-1)!.bestCycle).toEqual(r.cycle);
  });

  it('has one START_SOURCE and one END_SOURCE per vertex, in order', () => {
    const starts = trace.filter((e) => e.type === 'START_SOURCE').map((e) => e.source);
    const ends = trace.filter((e) => e.type === 'END_SOURCE').map((e) => e.source);
    expect(starts).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(ends).toEqual(starts);
  });

  it('uses only valid pseudo-code lines, with the line matching the event type', () => {
    const expectedLine: Record<TraceEvent['type'], number> = {
      START_SOURCE: 3,
      DEQUEUE: 5,
      TREE_EDGE: 8,
      ENQUEUE: 8,
      SKIP_PARENT: 9,
      CYCLE_EDGE: 10,
      BEST_UPDATED: 11,
      END_SOURCE: 4,
      DONE: 12,
    };
    expect(PSEUDO_CODE).toHaveLength(12);
    for (const e of trace) {
      expect(e.pseudoLine).toBe(expectedLine[e.type]);
      expect(e.pseudoLine).toBeGreaterThanOrEqual(1);
      expect(e.pseudoLine).toBeLessThanOrEqual(PSEUDO_CODE.length);
    }
  });

  it('emits every event type on a graph that exercises all branches', () => {
    const kinds = new Set(shortestCycle(petersenGraph(), { trace: true }).trace.map((e) => e.type));
    expect([...kinds].sort()).toEqual(
      ['BEST_UPDATED', 'CYCLE_EDGE', 'DEQUEUE', 'DONE', 'END_SOURCE', 'ENQUEUE', 'SKIP_PARENT', 'START_SOURCE', 'TREE_EDGE'].sort(),
    );
  });

  it('carries consistent snapshots (sizes, source dist = 0, edge events name adjacent vertices)', () => {
    for (const e of trace) {
      expect(e.dist).toHaveLength(g.length);
      expect(e.parent).toHaveLength(g.length);
      if (e.type !== 'DONE' && e.source !== null) expect(e.dist[e.source]).toBe(0);
      if (e.u !== null && e.v !== null) expect(g[e.u]).toContain(e.v);
      if (e.type === 'TREE_EDGE' || e.type === 'ENQUEUE') {
        expect(e.parent[e.v!]).toBe(e.u);
        expect(e.dist[e.v!]).toBe(e.dist[e.u!]! + 1);
      }
      if (e.type === 'ENQUEUE') expect(e.queue.at(-1)).toBe(e.v);
      if (e.type === 'DEQUEUE') expect(e.queue).not.toContain(e.u);
      if (e.type === 'CYCLE_EDGE') expect(e.cycleLength).toBe(e.dist[e.u!]! + e.dist[e.v!]! + 1);
    }
  });

  it('never increases `best`, and only BEST_UPDATED events change it', () => {
    let prev: number | null = null;
    for (const e of trace) {
      if (prev !== null) {
        expect(e.best).not.toBeNull(); // once a cycle is known it is never forgotten
        expect(e.best!).toBeLessThanOrEqual(prev);
      }
      if (e.type !== 'BEST_UPDATED' && e.type !== 'DONE' && prev !== null) expect(e.best).toBe(prev);
      prev = e.best;
    }
    const updates = trace.filter((e) => e.type === 'BEST_UPDATED');
    expect(updates.length).toBeGreaterThan(0);
    for (const e of updates) expect(e.best!).toBeLessThanOrEqual(e.cycleLength!);
  });

  it(`is not recorded when n > ${MAX_TRACE_VERTICES} (traceTruncated)`, () => {
    const big = cycleGraph(MAX_TRACE_VERTICES + 1);
    const res = shortestCycle(big, { trace: true });
    expect(res.traceTruncated).toBe(true);
    expect(res.trace).toEqual([]);
    expect(res.girth).toBe(MAX_TRACE_VERTICES + 1); // the result is still computed
    const exactly = shortestCycle(cycleGraph(MAX_TRACE_VERTICES), { trace: true });
    expect(exactly.traceTruncated).toBe(false);
    expect(exactly.trace.length).toBeGreaterThan(0);
  });
});

describe('graph validation and parsing', () => {
  it('rejects self-loops with a clear message', () => {
    expect(() => buildGraph(3, [[1, 1]])).toThrow(/Self-loop at vertex 1/);
  });

  it('rejects duplicate edges (in either orientation)', () => {
    expect(() => buildGraph(3, [[0, 1], [1, 0]])).toThrow(/Duplicate edge \(0, 1\)/);
    expect(() => buildGraph(3, [[0, 1], [0, 1]])).toThrow(GraphError);
  });

  it('rejects out-of-range vertices', () => {
    expect(() => buildGraph(3, [[0, 3]])).toThrow(/outside 0\.\.2/);
    expect(() => buildGraph(3, [[-1, 2]])).toThrow(/outside 0\.\.2/);
  });

  it('validateGraph catches asymmetric lists, self-loops and duplicates', () => {
    expect(() => validateGraph([[1], []])).toThrow(/undirected/);
    expect(() => validateGraph([[0]])).toThrow(/Self-loop/);
    expect(() => validateGraph([[1, 1], [0, 0]])).toThrow(/Duplicate/);
    expect(() => validateGraph(cycleGraph(5))).not.toThrow();
  });

  it('parses the CLI text format and round-trips', () => {
    const g = parseGraphText('# comment\n4 3\n0 1\n\n1 2  # inline\n2 3\n');
    expect(edgeList(g)).toEqual([[0, 1], [1, 2], [2, 3]]);
    expect(edgeCount(g)).toBe(3);
    const petersen = petersenGraph();
    expect(edgeList(parseGraphText(formatGraphText(petersen)))).toEqual(edgeList(petersen));
    expect(edgeKey(5, 2)).toBe('2-5');
  });

  it('reports the offending line for malformed input', () => {
    expect(() => parseGraphText('')).toThrow(/Empty input/);
    expect(() => parseGraphText('3')).toThrow(/Line 1/);
    expect(() => parseGraphText('3 2\n0 1\n')).toThrow(/announces 2 edge/);
    expect(() => parseGraphText('3 1\n0 x\n')).toThrow(/Line 2: expected integers/);
    expect(() => parseGraphText('3 2\n0 1\n1 1\n')).toThrow(/Line 3: Self-loop at vertex 1/);
    expect(() => parseGraphText('3 2\n0 1\n1 0\n')).toThrow(/Line 3: Duplicate edge \(0, 1\)/);
    expect(() => parseGraphText('3 1\n0 7\n')).toThrow(/Line 2: .*outside 0\.\.2/);
  });
});

describe('generators and formatting', () => {
  it('random graphs are reproducible for a given seed and differ across seeds', () => {
    const a = randomGraph(12, 0.3, 42);
    const b = randomGraph(12, 0.3, 42);
    const c = randomGraph(12, 0.3, 43);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('p = 0 gives no edges and p = 1 gives the complete graph', () => {
    expect(edgeCount(randomGraph(10, 0, 1))).toBe(0);
    expect(edgeCount(randomGraph(10, 1, 1))).toBe(45);
    expect(shortestCycle(randomGraph(10, 1, 1)).girth).toBe(3);
  });

  it('mulberry32 is deterministic and in [0, 1)', () => {
    const r1 = mulberry32(5);
    const r2 = mulberry32(5);
    for (let i = 0; i < 100; i++) {
      const x = r1();
      expect(x).toBe(r2());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('parseSeed maps integers to themselves and hashes other text', () => {
    expect(parseSeed(' 42 ')).toBe(42);
    expect(parseSeed('hello')).toBe(parseSeed('hello'));
    expect(parseSeed('hello')).not.toBe(parseSeed('world'));
  });

  it('formats cycles and reports the way the CLI prints them', () => {
    expect(formatCycle([0, 1, 2, 3])).toBe('0 → 1 → 2 → 3 → 0');
    expect(formatReport({ girth: 4, cycle: [0, 1, 2, 3] })).toEqual(['Girth: 4', 'Cycle: 0 → 1 → 2 → 3 → 0']);
    expect(formatReport({ girth: null, cycle: null })).toEqual(['No cycle: the graph is acyclic']);
  });
});
