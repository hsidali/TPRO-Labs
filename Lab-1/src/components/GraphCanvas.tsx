import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  ReactFlow,
  useReactFlow,
  type OnNodesChange,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { LayoutHint } from '../algo/generators';
import { edgeKey, edgeList, type Graph } from '../algo/graph';
import type { TraceEvent } from '../algo/shortestCycle';
import { NODE_SIZE, layoutCenters } from '../viz/layout';
import { EDGE_Z, deriveVisualState, type EdgeKind } from '../viz/visualState';
import { FloatingEdge, type FloatingEdgeType } from './FloatingEdge';
import { VertexNodeComponent, type VertexNode } from './VertexNode';

// Defined once, outside any component: React Flow requires stable references.
const nodeTypes = { vertex: VertexNodeComponent } satisfies NodeTypes;
const edgeTypes = { floating: FloatingEdge } satisfies EdgeTypes;
const EDGE_KINDS = Object.keys(EDGE_Z) as EdgeKind[];

const FIT_OPTIONS = { padding: 0.2, maxZoom: 1.2 };

interface FlowProps {
  graph: Graph;
  layout?: LayoutHint;
  /** The single trace event the picture is derived from (null = nothing running). */
  event: TraceEvent | null;
  /** When this value changes the canvas is re-fitted (its container was resized by the page layout). */
  fitToken?: string;
}

/** Re-fits the view whenever `token` changes; React Flow itself only fits once, on mount. */
function Refit({ token }: { token: string }) {
  const { fitView } = useReactFlow();
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const id = window.setTimeout(() => void fitView({ ...FIT_OPTIONS, duration: 250 }), 80);
    return () => window.clearTimeout(id);
  }, [token, fitView]);
  return null;
}

function initialNodes(graph: Graph, layout?: LayoutHint): VertexNode[] {
  const centers = layoutCenters(graph.length, layout);
  return centers.map((c, i) => ({
    id: String(i),
    type: 'vertex',
    // React Flow positions are top-left corners; ours are centres.
    position: { x: c.x - NODE_SIZE / 2, y: c.y - NODE_SIZE / 2 },
    width: NODE_SIZE,
    height: NODE_SIZE,
    draggable: true,
    selectable: false,
    connectable: false,
    data: { label: String(i), fill: 'idle', isSource: false, isCurrent: false, isTarget: false, inBest: false, dist: null },
  }));
}

function Flow({ graph, layout, event, fitToken = '' }: FlowProps) {
  const n = graph.length;

  // Positions are the only state React Flow owns (controlled nodes): dragging updates them,
  // everything else on screen is recomputed from `event`.
  const [placed, setPlaced] = useState<VertexNode[]>(() => initialNodes(graph, layout));
  // React Flow 13 hands over a NodeChangeset; `applyTo` returns the updated node list.
  const onNodesChange = useCallback<OnNodesChange<VertexNode>>(
    (changes) => setPlaced((current) => changes.applyTo(current)),
    [],
  );

  const visual = useMemo(() => deriveVisualState(n, event), [n, event]);

  const nodes = useMemo(
    () => placed.map((node, i) => ({ ...node, data: { label: String(i), ...visual.vertices[i] } })),
    [placed, visual],
  );

  // One immutable edge object per (edge, state), built once per graph. Between two steps an edge
  // whose state did not change keeps the very same object, so React Flow can skip re-rendering
  // it (matters for dense graphs: K40 has 780 edges).
  const edgeVariants = useMemo(
    () =>
      edgeList(graph).map(([u, v]) => {
        const key = edgeKey(u, v);
        const variants = {} as Record<EdgeKind, FloatingEdgeType>;
        for (const kind of EDGE_KINDS) {
          variants[kind] = { id: `e${key}`, type: 'floating', source: String(u), target: String(v), zIndex: EDGE_Z[kind], data: { kind } };
        }
        return { key, variants };
      }),
    [graph],
  );
  const edges = useMemo(
    () => edgeVariants.map(({ key, variants }) => variants[visual.edges.get(key) ?? 'idle']),
    [edgeVariants, visual],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      // One handle per node serves as both ends of an undirected edge.
      connectionMode={ConnectionMode.Loose}
      nodesDraggable
      nodesConnectable={false}
      elementsSelectable={false}
      edgesFocusable={false}
      deleteKeyCode={null}
      fitView
      fitViewOptions={FIT_OPTIONS}
      minZoom={0.02}
      maxZoom={2.5}
      aria-label="Graph canvas"
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1.6} />
      <Controls showInteractive={false} position="bottom-right" />
      <Refit token={fitToken} />
    </ReactFlow>
  );
}

interface GraphCanvasProps extends FlowProps {
  /** Changes whenever the canvas must start over (new graph, "reset layout"). */
  resetKey: string;
}

/** The React Flow canvas. A new `resetKey` remounts it: fresh positions and a fresh fit-to-view. */
export function GraphCanvas({ resetKey, ...flow }: GraphCanvasProps) {
  return (
    <div className="canvas" data-testid="canvas">
      <Flow key={resetKey} {...flow} />
    </div>
  );
}
