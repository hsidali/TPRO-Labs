import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { vertexClass } from '../viz/vertexClass';
import type { VertexVisual } from '../viz/visualState';

export type VertexNodeData = VertexVisual & { label: string };
export type VertexNode = Node<VertexNodeData, 'vertex'>;

/**
 * A round vertex with ONE centred handle. The handle is only there because React
 * Flow needs a handle to attach edges to; it is invisible and not connectable —
 * the graph is fixed, the user can only drag the vertices around. Edges are
 * drawn by FloatingEdge from circle to circle, so they ignore the handle position.
 */
export function VertexNodeComponent({ data }: NodeProps<VertexNode>) {
  return (
    <div className={vertexClass(data)} aria-label={`Vertex ${data.label}`}>
      <span className="vertex__label">{data.label}</span>
      {data.dist !== null && (
        <span className="vertex__dist" title="BFS distance from the source">
          {data.dist}
        </span>
      )}
      <Handle type="source" position={Position.Top} isConnectable={false} className="vertex__handle" />
    </div>
  );
}
