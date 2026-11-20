import { describe, expect, it } from 'vitest';
import { cycleGraph, petersenGraph, gridGraph } from '../algo/generators';
import { buildGraph, edgeKey } from '../algo/graph';
import { shortestCycle, type TraceEvent } from '../algo/shortestCycle';
import { describeEvent } from './describe';
import { blankState, deriveVisualState, finalEvent } from './visualState';

const triangleTrace = shortestCycle(cycleGraph(3), { trace: true }).trace;
const find = (trace: TraceEvent[], type: TraceEvent['type'], nth = 0) => trace.filter((e) => e.type === type)[nth];

describe('deriveVisualState', () => {
  it('shows everything idle before a run', () => {
    const s = deriveVisualState(4, null);
    expect(s).toEqual(blankState(4));
    expect(s.vertices.every((v) => v.fill === 'idle' && !v.isSource && !v.isCurrent && v.dist === null)).toBe(true);
    expect(s.edges.size).toBe(0);
  });

  it('START_SOURCE: only the source, waiting in the queue, at distance 0', () => {
    const s = deriveVisualState(3, triangleTrace[0]);
    expect(s.vertices[0]).toMatchObject({ isSource: true, isCurrent: false, fill: 'queued', dist: 0 });
    expect(s.vertices[1]).toMatchObject({ isSource: false, fill: 'idle', dist: null });
    expect(s.edges.size).toBe(0);
  });

  it('DEQUEUE marks u as current and no edge as examined', () => {
    const e = find(triangleTrace, 'DEQUEUE');
    const s = deriveVisualState(3, e);
    expect(s.vertices[e.u!].isCurrent).toBe(true);
    expect([...s.edges.values()]).not.toContain('examined');
  });

  it('TREE_EDGE examines the edge, shows v as already queued, and ENQUEUE keeps it', () => {
    const e = find(triangleTrace, 'TREE_EDGE');
    const s = deriveVisualState(3, e);
    expect(s.edges.get(edgeKey(e.u!, e.v!))).toBe('examined');
    expect(s.vertices[e.v!]).toMatchObject({ fill: 'queued', isTarget: true, dist: 1 });
    const s2 = deriveVisualState(3, find(triangleTrace, 'ENQUEUE'));
    expect(s2.vertices[e.v!].fill).toBe('queued');
  });

  it('CYCLE_EDGE flashes the closing edge; BEST_UPDATED then makes the cycle persistent', () => {
    const c = find(triangleTrace, 'CYCLE_EDGE');
    const sc = deriveVisualState(3, c);
    expect(sc.edges.get(edgeKey(c.u!, c.v!))).toBe('flash');

    const b = find(triangleTrace, 'BEST_UPDATED');
    const sb = deriveVisualState(3, b);
    expect(sb.edges.get(edgeKey(b.u!, b.v!))).toBe('flash'); // still the flashing edge…
    expect(sb.vertices.every((v) => v.inBest)).toBe(true); // …but the whole cycle is marked
    expect([...sb.edges.values()].filter((k) => k === 'best' || k === 'flash')).toHaveLength(3);
  });

  it('SKIP_PARENT examines the edge back to the parent', () => {
    const e = find(triangleTrace, 'SKIP_PARENT');
    const s = deriveVisualState(3, e);
    expect(s.edges.get(edgeKey(e.u!, e.v!))).toBe('examined');
  });

  it('DONE: no source, nothing queued, best cycle highlighted, no tree edges', () => {
    const done = triangleTrace.at(-1)!;
    const s = deriveVisualState(3, done);
    expect(s.vertices.some((v) => v.isSource || v.isCurrent || v.isTarget)).toBe(false);
    expect(s.vertices.every((v) => v.fill === 'idle' && v.inBest)).toBe(true);
    expect([...s.edges.values()].every((k) => k === 'best')).toBe(true);
  });

  it('is a pure function of the event: same result from a deep copy, no hidden state', () => {
    const e = find(shortestCycle(petersenGraph(), { trace: true }).trace, 'BEST_UPDATED');
    const copy = structuredClone(e);
    expect(deriveVisualState(10, copy)).toEqual(deriveVisualState(10, e));
    // evaluating other events in between changes nothing
    deriveVisualState(10, triangleTrace[0]);
    expect(deriveVisualState(10, copy)).toEqual(deriveVisualState(10, e));
  });

  it('holds its invariants on every step of a Petersen and a grid trace', () => {
    for (const g of [petersenGraph(), gridGraph(3, 3)]) {
      const n = g.length;
      for (const e of shortestCycle(g, { trace: true }).trace) {
        const s = deriveVisualState(n, e);
        const kinds = [...s.edges.values()];
        expect(s.vertices.filter((v) => v.isCurrent).length).toBeLessThanOrEqual(1);
        expect(s.vertices.filter((v) => v.isSource).length).toBe(e.type === 'DONE' ? 0 : 1);
        expect(kinds.filter((k) => k === 'flash').length).toBe(e.type === 'CYCLE_EDGE' || e.type === 'BEST_UPDATED' ? 1 : 0);
        expect(kinds.filter((k) => k === 'examined').length).toBe(['TREE_EDGE', 'ENQUEUE', 'SKIP_PARENT'].includes(e.type) ? 1 : 0);
        for (const q of e.queue) expect(s.vertices[q].fill).toBe('queued');
        s.vertices.forEach((v, i) => expect(v.dist).toBe(e.dist[i]));
        if (e.bestCycle) expect(s.vertices.filter((v) => v.inBest).length).toBe(e.bestCycle.length);
      }
    }
  });
});

describe('finalEvent', () => {
  it('lets the canvas show a result without any trace', () => {
    const ev = finalEvent(5, 3, [0, 1, 2]);
    const s = deriveVisualState(5, ev);
    expect(s.vertices.map((v) => v.inBest)).toEqual([true, true, true, false, false]);
    expect(s.edges.get(edgeKey(2, 0))).toBe('best');
  });

  it('is empty when the graph is acyclic', () => {
    const s = deriveVisualState(3, finalEvent(3, null, null));
    expect(s.edges.size).toBe(0);
  });
});

describe('describeEvent', () => {
  it('guides the user before a run', () => {
    expect(describeEvent(null)).toMatch(/Press Run/);
  });

  it('reads like the brief: source, dequeued vertex, cycle found, best', () => {
    expect(describeEvent(find(triangleTrace, 'START_SOURCE'))).toBe('BFS from s=0 · queue [0] · best = ∞');
    expect(describeEvent(find(triangleTrace, 'DEQUEUE'))).toBe('BFS from s=0 · dequeued 0 · best = ∞');
    expect(describeEvent(find(triangleTrace, 'BEST_UPDATED'))).toBe('BFS from s=0 · dequeued 1 · cycle of length 3 found · best = 3');
  });

  it('explains a closed walk that is longer than the real cycle (lca ≠ s)', () => {
    // 0 – 1 – triangle(1,2,3): from source 0 the walk through (2,3) has length 5, the cycle only 3.
    const g = buildGraph(4, [[0, 1], [1, 2], [1, 3], [2, 3]]);
    const e = shortestCycle(g, { trace: true }).trace.find((ev) => ev.type === 'BEST_UPDATED' && ev.source === 0)!;
    expect(e.cycleLength).toBe(5);
    expect(e.best).toBe(3);
    expect(describeEvent(e)).toMatch(/closed walk of length 5 contains a cycle of length 3 · best = 3/);
  });

  it('describes the end of the run, with and without a cycle', () => {
    expect(describeEvent(triangleTrace.at(-1)!)).toBe('Done · girth = 3');
    const forest = shortestCycle(buildGraph(3, [[0, 1], [1, 2]]), { trace: true }).trace.at(-1)!;
    expect(describeEvent(forest)).toMatch(/no cycle found: the graph is acyclic/);
  });

  it('every event of a trace gets a non-empty one-line description mentioning best', () => {
    for (const e of shortestCycle(petersenGraph(), { trace: true }).trace) {
      const text = describeEvent(e);
      expect(text.length).toBeGreaterThan(5);
      expect(text).not.toMatch(/\n|undefined|null|NaN/);
      expect(text).toMatch(/best = |girth = |no cycle/);
    }
  });
});
