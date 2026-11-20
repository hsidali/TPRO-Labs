import type { TraceEvent } from '../algo/shortestCycle';
import { describeEvent } from '../viz/describe';

interface Props {
  event: TraceEvent | null;
  /** Shown instead of the generic hint when there is no event (e.g. nothing run yet). */
  idleText?: string;
}

/** One-line description of the current step, plus the BFS queue. */
export function StatusPanel({ event, idleText }: Props) {
  const text = event ? describeEvent(event) : (idleText ?? describeEvent(null));
  const showQueue = event !== null && event.type !== 'DONE';
  // On TREE_EDGE the vertex is discovered (dist/parent set) but enqueue(Q, v) has not run yet:
  // show it as a dashed "pending" chip so the panel agrees with the canvas.
  const pending = event?.type === 'TREE_EDGE' ? event.v : null;
  return (
    <div className="status">
      <p className="status__line" role="status" aria-live="polite" data-testid="status-line">
        {text}
      </p>
      {showQueue && (
        <div className="queue" aria-label="BFS queue">
          <span className="queue__label">Queue</span>
          {event.queue.length === 0 && pending === null && <span className="queue__empty">empty</span>}
          {event.queue.map((v, i) => (
            <span key={`${v}-${i}`} className={i === 0 ? 'chip chip--front' : 'chip'} title={i === 0 ? 'next to be dequeued' : undefined}>
              {v}
            </span>
          ))}
          {pending !== null && (
            <span className="chip chip--pending" title="about to be enqueued">
              {pending}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
