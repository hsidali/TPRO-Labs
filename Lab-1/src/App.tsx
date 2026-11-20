import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PRESETS, findPreset, parseSeed, randomGraph, type LayoutHint, type Preset } from './algo/generators';
import { GraphError, edgeCount, parseGraphText, type Graph } from './algo/graph';
import { MAX_TRACE_VERTICES, shortestCycle, type ShortestCycleResult } from './algo/shortestCycle';
import { ControlPanel, type GraphInfo } from './components/ControlPanel';
import { GraphCanvas } from './components/GraphCanvas';
import { LogoMark } from './components/Icons';
import { Legend } from './components/Legend';
import { PlaybackBar } from './components/PlaybackBar';
import { PseudoCode } from './components/PseudoCode';
import { ResultCard } from './components/ResultCard';
import { StatusPanel } from './components/StatusPanel';
import { ThemeToggle } from './components/ThemeToggle';
import { usePlayback } from './hooks/usePlayback';
import { useTheme } from './hooks/useTheme';
import { finalEvent } from './viz/visualState';

/** UI-only safety limits for custom graphs (the algorithm and CLI have none). */
const MAX_CUSTOM_VERTICES = 300;
const MAX_CUSTOM_EDGES = 5000;

interface Source {
  /** Unique per load, so the canvas restarts even when the same preset is picked again. */
  key: number;
  /** Preset id, or "random" / "custom". */
  presetId: string;
  info: GraphInfo;
  graph: Graph;
  layout?: LayoutHint;
}

let nextKey = 1;

function fromPreset(preset: Preset): Source {
  const m = edgeCount(preset.graph);
  return {
    key: nextKey++,
    presetId: preset.id,
    info: { name: preset.label, description: preset.description, n: preset.graph.length, m },
    graph: preset.graph,
    layout: preset.layout,
  };
}

function fromGraph(presetId: string, name: string, description: string, graph: Graph): Source {
  return { key: nextKey++, presetId, info: { name, description, n: graph.length, m: edgeCount(graph) }, graph };
}

/** Elements that use the arrow / Home / End keys themselves (text fields, sliders, dropdowns). */
const ownsNavigationKeys = (el: EventTarget | null) =>
  el instanceof HTMLElement && el.closest('input, textarea, select, [contenteditable="true"]') !== null;

/** Elements that are activated by Space / Enter, so those keys must not double as play/pause. */
const activatesOnSpace = (el: EventTarget | null) =>
  el instanceof HTMLElement && el.closest('button, summary, a[href]') !== null;

export default function App() {
  const theme = useTheme();
  const [source, setSource] = useState<Source>(() => fromPreset(PRESETS[0]));
  const [run, setRun] = useState<ShortestCycleResult | null>(null);
  const [layoutVersion, setLayoutVersion] = useState(0);

  const traceLength = run?.trace.length ?? 0;
  const playback = usePlayback(traceLength);

  const load = useCallback(
    (next: Source) => {
      setSource(next);
      setRun(null);
      playback.reset();
    },
    [playback],
  );

  const handlePreset = useCallback(
    (id: string) => {
      const preset = findPreset(id);
      if (preset) load(fromPreset(preset));
    },
    [load],
  );

  const handleGenerate = useCallback(
    (n: number, p: number, seedText: string) => {
      const seed = parseSeed(seedText);
      load(
        fromGraph(
          'random',
          `G(${n}, ${p.toFixed(2)}) · seed ${seed}`,
          `Random graph G(${n}, ${p.toFixed(2)}) with seed ${seed}. The same values always give the same graph.`,
          randomGraph(n, p, seed),
        ),
      );
    },
    [load],
  );

  const handleCustom = useCallback(
    (text: string): string | null => {
      try {
        const graph = parseGraphText(text);
        if (graph.length > MAX_CUSTOM_VERTICES) {
          return `The UI is limited to ${MAX_CUSTOM_VERTICES} vertices (this graph has ${graph.length}). Use the CLI for bigger inputs.`;
        }
        if (edgeCount(graph) > MAX_CUSTOM_EDGES) {
          return `The UI is limited to ${MAX_CUSTOM_EDGES} edges (this graph has ${edgeCount(graph)}). Use the CLI for bigger inputs.`;
        }
        const note =
          graph.length > MAX_TRACE_VERTICES
            ? ` More than ${MAX_TRACE_VERTICES} vertices: the result is computed, but no animation is recorded.`
            : '';
        load(fromGraph('custom', 'Custom graph', `Graph loaded from text.${note}`, graph));
        return null;
      } catch (err) {
        if (err instanceof GraphError) return err.message;
        throw err;
      }
    },
    [load],
  );

  const handleRun = useCallback(() => {
    const result = shortestCycle(source.graph, { trace: true });
    setRun(result);
    if (result.trace.length > 0) {
      playback.start();
      // Hand focus to play/pause so Space pauses instead of pressing Run again.
      requestAnimationFrame(() => document.getElementById('play-toggle')?.focus());
    } else {
      playback.reset();
    }
  }, [source.graph, playback]);

  const handleResetLayout = useCallback(() => setLayoutVersion((v) => v + 1), []);

  // The one event everything on screen is derived from.
  const traceEvent = run && !run.traceTruncated ? (run.trace[playback.index] ?? null) : null;
  const canvasEvent = useMemo(() => {
    if (!run) return null;
    return run.traceTruncated ? finalEvent(source.graph.length, run.girth, run.cycle) : traceEvent;
  }, [run, traceEvent, source.graph.length]);

  // Keyboard: space = play/pause, ← / → = step, Home / End = first / last.
  const pb = useRef(playback);
  useEffect(() => {
    pb.current = playback;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || ownsNavigationKeys(e.target)) return;
      const p = pb.current;
      switch (e.key) {
        case ' ':
          if (activatesOnSpace(e.target)) return; // let the focused button handle its own Space
          p.toggle();
          break;
        case 'ArrowLeft':
          p.prev();
          break;
        case 'ArrowRight':
          p.next();
          break;
        case 'Home':
          p.first();
          break;
        case 'End':
          p.last();
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const truncated = run?.traceTruncated === true;
  const idleText = truncated
    ? `No trace recorded (n = ${source.graph.length} > ${MAX_TRACE_VERTICES}): the result is shown without animation.`
    : undefined;

  return (
    <div className="app">
      <header className="app__head">
        <div className="brand">
          <LogoMark />
          <div>
            <h1>Shortest Cycle Finder</h1>
            <p>Girth of an undirected graph · BFS from every vertex · O(V·(V+E))</p>
          </div>
        </div>
        <ThemeToggle value={theme.choice} onChange={theme.setChoice} />
      </header>

      <aside className="app__left" aria-label="Graph and run controls">
        <ControlPanel
          presetId={source.presetId}
          info={source.info}
          onPreset={handlePreset}
          onGenerate={handleGenerate}
          onLoadCustom={handleCustom}
          onRun={handleRun}
          onResetLayout={handleResetLayout}
        />
      </aside>

      <main className="app__canvas">
        <Legend />
        {truncated && (
          <div className="canvas-banner" role="status">
            <strong>No animation:</strong> this graph has {source.graph.length} vertices (more than {MAX_TRACE_VERTICES}), so no trace was
            recorded. The shortest cycle found is highlighted.
          </div>
        )}
        <div className="canvas-wrap">
          <GraphCanvas
            resetKey={`${source.key}/${layoutVersion}`}
            fitToken={truncated ? 'banner' : 'plain'}
            graph={source.graph}
            layout={source.layout}
            event={canvasEvent}
          />
        </div>
      </main>

      <aside className="app__right" aria-label="Algorithm and result">
        <section className="card" aria-labelledby="algo-h">
          <h2 id="algo-h" className="card__title">
            Algorithm
          </h2>
          <PseudoCode line={traceEvent?.pseudoLine ?? null} />
        </section>
        <section className="card" aria-labelledby="status-h">
          <h2 id="status-h" className="card__title">
            Status
          </h2>
          <StatusPanel event={traceEvent} idleText={idleText} />
        </section>
        <ResultCard n={source.info.n} m={source.info.m} run={run} event={traceEvent} />
      </aside>

      <footer className="app__bar">
        <PlaybackBar playback={playback} length={traceLength} />
      </footer>
    </div>
  );
}
