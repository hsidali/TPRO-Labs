import { BaseEdge, getStraightPath, useInternalNode, type Edge, type EdgeProps, type InternalNode } from '@xyflow/react';
import type { EdgeKind } from '../viz/visualState';

export type FloatingEdgeData = { kind: EdgeKind };
export type FloatingEdgeType = Edge<FloatingEdgeData, 'floating'>;

interface Circle {
  x: number;
  y: number;
  r: number;
}

/** Centre and radius of a (round) node, from React Flow's measured internals. */
function circleOf(node: InternalNode): Circle | null {
  const { width, height } = node.measured;
  if (!width || !height) return null; // not measured yet
  const { x, y } = node.internals.positionAbsolute;
  return { x: x + width / 2, y: y + height / 2, r: Math.min(width, height) / 2 };
}

/**
 * Floating straight edge for an undirected graph (React Flow's "floating
 * edges" pattern): instead of attaching to fixed handle positions, the line
 * runs along the segment between the two centres and stops on each circle's
 * boundary, so it always points at the other vertex, however it is dragged.
 * No arrow markers: the graph is undirected.
 */
export function FloatingEdge({ id, source, target, data }: EdgeProps<FloatingEdgeType>) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  if (!sourceNode || !targetNode) return null;

  const a = circleOf(sourceNode);
  const b = circleOf(targetNode);
  if (!a || !b) return null;

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return null;
  const ux = dx / length;
  const uy = dy / length;

  const [path] = getStraightPath({
    sourceX: a.x + ux * a.r,
    sourceY: a.y + uy * a.r,
    targetX: b.x - ux * b.r,
    targetY: b.y - uy * b.r,
  });

  const kind = data?.kind ?? 'idle';
  return <BaseEdge id={id} path={path} className={`edge edge--${kind}`} interactionWidth={0} />;
}
