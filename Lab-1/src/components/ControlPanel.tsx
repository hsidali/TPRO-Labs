import { useId, useState } from 'react';
import { PRESETS, randomGraph } from '../algo/generators';
import { formatGraphText } from '../algo/graph';
import { IconDice, IconPlay, IconReset } from './Icons';

export interface GraphInfo {
  /** Short name of what is loaded (preset label, "G(12, 0.30) · seed 42", "Custom graph"). */
  name: string;
  description: string;
  n: number;
  m: number;
}

interface Props {
  presetId: string;
  info: GraphInfo;
  /** Load a preset by id. */
  onPreset: (id: string) => void;
  /** Generate G(n, p) with the given seed text. */
  onGenerate: (n: number, p: number, seed: string) => void;
  /** Parse and load custom text; returns an error message, or null on success. */
  onLoadCustom: (text: string) => string | null;
  onRun: () => void;
  onResetLayout: () => void;
}

const DEFAULT_CUSTOM = '# n m, then m lines "u v"\n7 8\n0 1\n1 2\n2 3\n3 4\n4 5\n5 6\n6 0\n0 3\n';

/** Left panel: where the graph comes from, plus the Run button. */
export function ControlPanel({ presetId, info, onPreset, onGenerate, onLoadCustom, onRun, onResetLayout }: Props) {
  const ids = { preset: useId(), n: useId(), p: useId(), seed: useId(), custom: useId() };
  const [n, setN] = useState(12);
  const [p, setP] = useState(0.2);
  const [seed, setSeed] = useState('42');
  const [custom, setCustom] = useState(DEFAULT_CUSTOM);
  const [customError, setCustomError] = useState<string | null>(null);

  return (
    <div className="panel-stack">
      <section className="card" aria-labelledby={`${ids.preset}-h`}>
        <h2 id={`${ids.preset}-h`} className="card__title">
          Preset graph
        </h2>
        <select
          id={ids.preset}
          className="field"
          value={presetId}
          onChange={(e) => onPreset(e.target.value)}
          aria-label="Preset graph"
        >
          {PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
          {!PRESETS.some((preset) => preset.id === presetId) && (
            <option value={presetId} disabled>
              {info.name}
            </option>
          )}
        </select>
        <p className="hint">{info.description}</p>
        <dl className="stats">
          <div>
            <dt>V</dt>
            <dd>{info.n}</dd>
          </div>
          <div>
            <dt>E</dt>
            <dd>{info.m}</dd>
          </div>
        </dl>
      </section>

      <section className="card" aria-labelledby={`${ids.n}-h`}>
        <h2 id={`${ids.n}-h`} className="card__title">
          Random graph <span className="card__sub">Erdős–Rényi G(n, p)</span>
        </h2>
        <div className="row">
          <label htmlFor={ids.n}>Vertices n</label>
          <output htmlFor={ids.n}>{n}</output>
        </div>
        <input id={ids.n} type="range" min={3} max={40} step={1} value={n} onChange={(e) => setN(Number(e.target.value))} />
        <div className="row">
          <label htmlFor={ids.p}>Edge probability p</label>
          <output htmlFor={ids.p}>{p.toFixed(2)}</output>
        </div>
        <input
          id={ids.p}
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={p}
          onChange={(e) => setP(Number(e.target.value))}
        />
        <div className="row">
          <label htmlFor={ids.seed}>Seed</label>
        </div>
        <div className="seed">
          <input
            id={ids.seed}
            className="field"
            inputMode="numeric"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            spellCheck={false}
            aria-describedby={`${ids.seed}-hint`}
          />
          <button
            type="button"
            className="btn btn--icon"
            title="Pick a random seed"
            aria-label="Pick a random seed"
            onClick={() => setSeed(String(Math.floor(Math.random() * 1_000_000)))}
          >
            <IconDice />
          </button>
        </div>
        <p id={`${ids.seed}-hint`} className="hint">
          Same n, p and seed always give the same graph.
        </p>
        <button type="button" className="btn" onClick={() => onGenerate(n, p, seed)}>
          Generate
        </button>
      </section>

      <details className="card card--details">
        <summary className="card__title">
          Custom graph <span className="card__sub">same format as the CLI</span>
        </summary>
        <label htmlFor={ids.custom} className="visually-hidden">
          Graph text
        </label>
        <textarea
          id={ids.custom}
          className="field field--mono"
          rows={7}
          value={custom}
          spellCheck={false}
          onChange={(e) => {
            setCustom(e.target.value);
            setCustomError(null);
          }}
          aria-invalid={customError !== null}
          aria-describedby={customError ? `${ids.custom}-err` : undefined}
        />
        {customError && (
          <p id={`${ids.custom}-err`} className="error" role="alert">
            {customError}
          </p>
        )}
        <div className="btn-row">
          <button type="button" className="btn" onClick={() => setCustomError(onLoadCustom(custom))}>
            Load graph
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            title="Fill the box with a 60-vertex random graph: it exceeds the 40-vertex trace limit"
            onClick={() => {
              setCustom(formatGraphText(randomGraph(60, 0.05, 7)));
              setCustomError(null);
            }}
          >
            Fill with n = 60
          </button>
        </div>
      </details>

      <div className="run-block">
        <button type="button" className="btn btn--primary" onClick={onRun}>
          <IconPlay /> Run
        </button>
        <button type="button" className="btn btn--ghost" onClick={onResetLayout} title="Put the vertices back in their starting layout">
          <IconReset /> Reset layout
        </button>
      </div>
    </div>
  );
}
