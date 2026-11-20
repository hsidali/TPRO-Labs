import type { VertexVisual } from './visualState';

/** CSS class list shared by the canvas vertex and the legend swatches. */
export function vertexClass(v: Omit<VertexVisual, 'dist'>): string {
  return [
    'vertex',
    `vertex--${v.fill}`,
    v.isSource && 'vertex--source',
    v.isCurrent && 'vertex--current',
    v.isTarget && 'vertex--target',
    v.inBest && 'vertex--best',
  ]
    .filter(Boolean)
    .join(' ');
}
