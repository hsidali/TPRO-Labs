import { vertexClass } from '../viz/vertexClass';
import type { VertexVisual } from '../viz/visualState';

type Look = Omit<VertexVisual, 'dist'>;
const base: Look = { fill: 'idle', isSource: false, isCurrent: false, isTarget: false, inBest: false };

// `hint` is shown as a tooltip; the label alone must already make sense.
const VERTICES: { label: string; hint: string; look: Look }[] = [
  { label: 'Source s', hint: 'Start vertex of the current BFS', look: { ...base, fill: 'visited', isSource: true } },
  { label: 'Dequeued u', hint: 'Vertex whose neighbours are being scanned', look: { ...base, fill: 'visited', isCurrent: true } },
  { label: 'In queue', hint: 'Discovered, waiting to be processed', look: { ...base, fill: 'queued' } },
  { label: 'Visited', hint: 'Already processed in this BFS', look: { ...base, fill: 'visited' } },
  { label: 'Unvisited', hint: 'Not reached yet in this BFS', look: base },
  { label: 'Neighbour v', hint: 'Dashed ring: the neighbour being examined', look: { ...base, isTarget: true } },
  { label: 'On best cycle', hint: 'Green ring: vertex of the best cycle so far', look: { ...base, inBest: true } },
];

const EDGES: { kind: string; label: string; hint: string }[] = [
  { kind: 'tree', label: 'BFS tree edge', hint: 'v was first reached from u through this edge' },
  { kind: 'examined', label: 'Edge examined', hint: 'Dotted and moving: the edge being scanned' },
  { kind: 'flash', label: 'Cycle-closing edge', hint: 'Flashes when a non-tree edge closes a cycle' },
  { kind: 'best', label: 'Best cycle so far', hint: 'Thick and persistent' },
];

/** Colour key. Swatches reuse the canvas CSS classes, so they can never drift from the real thing. */
export function Legend() {
  return (
    <section className="legend" aria-label="Legend">
      <div className="legend__group">
        <h2>Vertices</h2>
        <ul>
          {VERTICES.map((v) => (
            <li key={v.label} className="legend__item" title={v.hint}>
              <span className="legend__swatch" aria-hidden="true">
                <span className={`${vertexClass(v.look)} vertex--legend`} />
              </span>
              {v.label}
            </li>
          ))}
        </ul>
      </div>
      <div className="legend__group">
        <h2>Edges</h2>
        <ul>
          {EDGES.map((e) => (
            <li key={e.kind} className="legend__item" title={e.hint}>
              <span className="legend__swatch" aria-hidden="true">
                <svg width="38" height="14" viewBox="0 0 38 14">
                  <line x1="4" y1="7" x2="34" y2="7" className={`edge edge--${e.kind} edge--static`} />
                </svg>
              </span>
              {e.label}
            </li>
          ))}
        </ul>
      </div>
      <p className="legend__note muted">Badge on a vertex = its BFS distance from the source.</p>
    </section>
  );
}
