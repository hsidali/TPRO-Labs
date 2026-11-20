/** Vertex placement for the canvas. */

import type { LayoutHint } from '../algo/generators';

/** Diameter of a vertex on the canvas, in px. */
export const NODE_SIZE = 46;

/** Pixels per layout-hint unit. */
const HINT_SCALE = 175;

export interface Point {
  x: number;
  y: number;
}

/** Circle through all vertices, vertex 0 at the top, going clockwise. */
export function circularLayout(n: number): Point[] {
  if (n === 0) return [];
  if (n === 1) return [{ x: 0, y: 0 }];
  // Keep at least ~26 px of free arc between neighbouring vertices.
  const radius = Math.max(120, (n * (NODE_SIZE + 26)) / (2 * Math.PI));
  return Array.from({ length: n }, (_, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
  });
}

/** Vertex centres: a preset's own layout when it fits the graph, a circle otherwise. */
export function layoutCenters(n: number, hint?: LayoutHint): Point[] {
  if (hint && hint.length === n) {
    return hint.map(([x, y]) => ({ x: x * HINT_SCALE, y: y * HINT_SCALE }));
  }
  return circularLayout(n);
}
