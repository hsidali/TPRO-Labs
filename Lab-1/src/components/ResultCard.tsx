import { formatCycle } from '../algo/format';
import type { ShortestCycleResult, TraceEvent } from '../algo/shortestCycle';

interface Props {
  n: number;
  m: number;
  /** null = the algorithm has not been run on this graph yet. */
  run: ShortestCycleResult | null;
  /** The current trace event; the card shows the best-so-far it carries. */
  event: TraceEvent | null;
}

type View =
  | { kind: 'empty' }
  | { kind: 'live'; girth: number | null; cycle: readonly number[] | null }
  | { kind: 'final'; girth: number | null; cycle: readonly number[] | null };

function viewOf(run: ShortestCycleResult | null, event: TraceEvent | null): View {
  if (!run) return { kind: 'empty' };
  // Without a trace (n > 40) the answer is available at once.
  if (run.traceTruncated || event === null) return { kind: 'final', girth: run.girth, cycle: run.cycle };
  return event.type === 'DONE'
    ? { kind: 'final', girth: event.best, cycle: event.bestCycle }
    : { kind: 'live', girth: event.best, cycle: event.bestCycle };
}

export function ResultCard({ n, m, run, event }: Props) {
  const view = viewOf(run, event);
  const work = n * (n + m);

  return (
    <section className="card result" aria-labelledby="result-h" data-testid="result-card">
      <h2 id="result-h" className="card__title">
        Result
        {view.kind === 'live' && <span className="badge badge--live">best so far</span>}
        {view.kind === 'final' && <span className="badge badge--final">final</span>}
      </h2>

      {view.kind === 'empty' && <p className="hint">Press Run to compute the girth of this graph.</p>}

      {view.kind !== 'empty' && (
        <>
          <div className="result__girth">
            <span className="result__label">Girth</span>
            {view.girth === null ? (
              <span className="result__value result__value--none" data-testid="girth">
                {view.kind === 'final' ? 'none' : '∞'}
              </span>
            ) : (
              <span className="result__value" data-testid="girth">
                {view.girth}
              </span>
            )}
          </div>

          {view.girth === null && view.kind === 'final' && (
            <p className="result__note">No cycle: the graph is acyclic (a forest).</p>
          )}
          {view.girth === null && view.kind === 'live' && <p className="result__note">No cycle found yet.</p>}

          {view.cycle && (
            <div className="result__cycle">
              <span className="result__label">Cycle</span>
              <p className="cycle-path" data-testid="cycle">
                {formatCycle(view.cycle)}
              </p>
            </div>
          )}
        </>
      )}

      <dl className="complexity">
        <div>
          <dt>Time</dt>
          <dd>
            O(V·(V+E)) <span className="muted">= {n}·({n}+{m}) = {work.toLocaleString('en-US')}</span>
          </dd>
        </div>
        <div>
          <dt>Space</dt>
          <dd>
            O(V+E) <span className="muted">= {n + m}</span>
          </dd>
        </div>
      </dl>
    </section>
  );
}
