/**
 * Text formatting shared by the CLI and the UI (pure TypeScript).
 */

import type { ShortestCycleResult } from './shortestCycle';

/** "v1 → v2 → … → v1": the closing step back to the first vertex is spelled out. */
export function formatCycle(cycle: readonly number[]): string {
  if (cycle.length === 0) return '';
  return [...cycle, cycle[0]].join(' → ');
}

/** Lines printed by the CLI. */
export function formatReport(result: Pick<ShortestCycleResult, 'girth' | 'cycle'>): string[] {
  if (result.girth === null || result.cycle === null) {
    return ['No cycle: the graph is acyclic'];
  }
  return [`Girth: ${result.girth}`, `Cycle: ${formatCycle(result.cycle)}`];
}
