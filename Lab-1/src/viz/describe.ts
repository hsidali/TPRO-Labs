/**
 * Human-readable status line for a trace event, e.g.
 *   "BFS from s=3 · dequeued 5 · cycle of length 4 found · best = 4"
 */

import type { TraceEvent } from '../algo/shortestCycle';

const SEP = ' · ';

export function bestText(best: number | null): string {
  return best === null ? 'best = ∞' : `best = ${best}`;
}

/** Status line for the current step (empty-state text when `event` is null). */
export function describeEvent(event: TraceEvent | null): string {
  if (event === null) return 'Press Run to start the animation.';

  const { type, source: s, u, v, best } = event;
  const bfs = `BFS from s=${s}`;
  const parts: string[] = [];

  switch (type) {
    case 'START_SOURCE':
      parts.push(bfs, `queue [${s}]`);
      break;
    case 'DEQUEUE':
      parts.push(bfs, `dequeued ${u}`);
      break;
    case 'TREE_EDGE':
      parts.push(bfs, `dequeued ${u}`, `edge (${u}, ${v}): ${v} is new, dist[${v}] = ${event.dist[v!]}`);
      break;
    case 'ENQUEUE':
      parts.push(bfs, `dequeued ${u}`, `enqueued ${v}`);
      break;
    case 'SKIP_PARENT':
      parts.push(bfs, `dequeued ${u}`, `edge (${u}, ${v}) leads back to the parent: skipped`);
      break;
    case 'CYCLE_EDGE': {
      const len = event.cycleLength!;
      const verdict = best === null || len < best ? 'shorter than the best' : 'not shorter than the best';
      parts.push(bfs, `dequeued ${u}`, `edge (${u}, ${v}) closes a cycle: ${event.dist[u!]} + ${event.dist[v!]} + 1 = ${len}, ${verdict}`);
      break;
    }
    case 'BEST_UPDATED': {
      const len = event.cycleLength!;
      parts.push(bfs, `dequeued ${u}`);
      parts.push(
        best !== null && best < len
          ? `closed walk of length ${len} contains a cycle of length ${best}`
          : `cycle of length ${best} found`,
      );
      break;
    }
    case 'END_SOURCE':
      parts.push(`BFS from s=${s} finished`);
      break;
    case 'DONE':
      return best === null ? `Done${SEP}no cycle found: the graph is acyclic` : `Done${SEP}girth = ${best}`;
  }
  parts.push(bestText(best));
  return parts.join(SEP);
}
